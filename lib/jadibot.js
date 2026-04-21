/**
 * Jadibot — نظام البوتات الفرعية (Sub-Bots)
 *
 * يسمح للمطور بإنشاء بوتات WhatsApp ثانوية تتصل بنفس الكود (نفس البلجنز)،
 * ويتحكم في *المزايا* المتاحة لكل بوت فرعي عبر *وسوم* (tags) مثل:
 *   ['game', 'islamic', 'media', 'economy', 'ai']
 *
 * الميزات:
 *  • إنشاء بوت فرعي برقم هاتف (يولّد كود إقران).
 *  • تخزين حالة كل بوت في مجلد منفصل: ./jadibots/<phone>/
 *  • ربط/فك ربط ديناميكي عبر أوامر داخل WhatsApp.
 *  • استعادة كل البوتات الفرعية تلقائياً عند بدء التشغيل.
 *  • قائمة المزايا المسموحة لكل بوت محفوظة في DB:
 *      db.data.jadibot[phone] = { features: [...], owner: jid, createdAt }
 *  • تنفيذ نفس handler.js لكل بوت فرعي مع فلترة المزايا.
 */
import { existsSync, mkdirSync, readdirSync, rmSync, readFileSync, writeFileSync, statSync } from 'fs'
import { join } from 'path'
import pino from 'pino'

const JADIBOT_DIR = './jadibots'
const DEFAULT_FEATURES = ['islamic', 'main', 'profile']

global.conns = global.conns || []

function ensureDir() {
  if (!existsSync(JADIBOT_DIR)) mkdirSync(JADIBOT_DIR, { recursive: true })
}

function dbEntry() {
  global.db.data.jadibot ??= {}
  return global.db.data.jadibot
}

function sessionsEntry() {
  global.db.data.jadibotSessions ??= {}
  return global.db.data.jadibotSessions
}

/**
 * يحفظ كل ملفات جلسة بوت فرعي إلى السحاب (Supabase) كـ base64.
 */
function persistSessionToCloud(phone) {
  try {
    const folder = join(JADIBOT_DIR, phone)
    if (!existsSync(folder)) return
    const files = {}
    for (const f of readdirSync(folder)) {
      const fp = join(folder, f)
      try {
        if (!statSync(fp).isFile()) continue
        files[f] = readFileSync(fp).toString('base64')
      } catch (_) {}
    }
    const s = sessionsEntry()
    s[phone] = { files, savedAt: Date.now() }
    global.db?.markDirty?.()
  } catch (e) {
    console.error(`[JADIBOT-CLOUD] persist ${phone} failed:`, e?.message)
  }
}

/**
 * يستعيد ملفات جلسة بوت فرعي من السحاب إلى القرص.
 */
function restoreSessionFromCloud(phone) {
  try {
    const entry = sessionsEntry()[phone]
    if (!entry?.files) return false
    const folder = join(JADIBOT_DIR, phone)
    if (!existsSync(folder)) mkdirSync(folder, { recursive: true })
    for (const [name, b64] of Object.entries(entry.files)) {
      try { writeFileSync(join(folder, name), Buffer.from(b64, 'base64')) } catch (_) {}
    }
    return true
  } catch (e) {
    console.error(`[JADIBOT-CLOUD] restore ${phone} failed:`, e?.message)
    return false
  }
}

/**
 * يعيد قائمة المزايا المسموحة لرقم بوت فرعي.
 * إن لم يكن مُسجَّلاً → DEFAULT_FEATURES.
 */
export function getSubBotFeatures(phone) {
  const num = String(phone).replace(/\D/g, '')
  const entry = dbEntry()[num]
  if (!entry || !Array.isArray(entry.features)) return [...DEFAULT_FEATURES]
  return entry.features
}

/**
 * يحدد مزايا بوت فرعي. الوسوم كقائمة سلاسل (tags في handler.tags بالـplugin).
 */
export function setSubBotFeatures(phone, features = []) {
  const num = String(phone).replace(/\D/g, '')
  const e = dbEntry()
  e[num] ??= { createdAt: Date.now(), features: [...DEFAULT_FEATURES] }
  e[num].features = Array.from(new Set(features.map(f => String(f).toLowerCase().trim()).filter(Boolean)))
  global.db?.markDirty?.()
  return e[num].features
}

/**
 * يفحص إن كانت سوكيت الاستقبال هي بوت فرعي وإن كان الـ plugin مسموحاً.
 * تستدعى من handler.js قبل أي تشغيل لـ plugin.
 */
export function isPluginAllowedForConn(conn, plugin) {
  // البوت الرئيسي → كل شيء مسموح
  if (!conn || conn === global.conn) return true
  const phone = conn.__subBotPhone
  if (!phone) return true   // اتصال مجهول → نسمح بالافتراض
  const allowed = getSubBotFeatures(phone)
  if (!allowed.length) return true
  // ابحث عن أي تقاطع بين plugin.tags و allowed
  const tags = (plugin?.tags || []).map(t => String(t).toLowerCase())
  if (!tags.length) return true
  return tags.some(t => allowed.includes(t))
}

/**
 * إنشاء بوت فرعي جديد + يعيد كود الإقران.
 * إن كان مسجّلاً مسبقاً ولديه creds.json → يعيد توصيله بدون كود.
 */
export async function createSubBot(phone, ownerJid = null) {
  ensureDir()
  const num = String(phone).replace(/\D/g, '')
  if (!num) throw new Error('رقم غير صالح')

  const folder = join(JADIBOT_DIR, num)
  if (!existsSync(folder)) mkdirSync(folder, { recursive: true })

  // سجل في DB
  const e = dbEntry()
  e[num] ??= { createdAt: Date.now(), features: [...DEFAULT_FEATURES], owner: ownerJid }
  if (ownerJid && !e[num].owner) e[num].owner = ownerJid
  global.db?.markDirty?.()

  // imports ديناميكية لتجنّب حلقات استيراد
  const baileys = await import('@whiskeysockets/baileys')
  const { useMultiFileAuthState, makeCacheableSignalKeyStore, fetchLatestBaileysVersion } = baileys
  const makeWASocket = baileys.default ?? baileys.makeWASocket

  const { state, saveCreds } = await useMultiFileAuthState(folder)
  const { version } = await fetchLatestBaileysVersion()

  const subConn = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
    },
    logger: pino({ level: 'silent' }),
    browser: ['SHADOW Sub-Bot', 'Chrome', '15.0'],
    version,
    printQRInTerminal: false,
    syncFullHistory: false,
    markOnlineOnConnect: false
  })

  subConn.__subBotPhone = num
  subConn.__subBotOwner = ownerJid || null

  // اربط الأحداث — كل تحديث للاعتمادات يحفظ على القرص + السحاب
  subConn.ev.on('creds.update', async () => {
    try { await saveCreds() } catch (_) {}
    persistSessionToCloud(num)
  })
  subConn.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'open') {
      console.log(`[JADIBOT] ✅ Sub-bot ${num} connected.`)
      persistSessionToCloud(num)
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      // 401 = logged out → نظّف
      if (code === 401) {
        console.log(`[JADIBOT] ❌ Sub-bot ${num} logged out — removing.`)
        delete sessionsEntry()[num]
        global.db?.markDirty?.()
        await destroySubBot(num).catch(() => {})
      } else {
        console.log(`[JADIBOT] ⚠️ Sub-bot ${num} closed (code=${code}). Will not auto-reconnect this run.`)
        // إزالة من القائمة الحية (سيُستعاد عند restart)
        global.conns = global.conns.filter(c => c !== subConn)
      }
    }
  })

  // أعد توجيه الرسائل إلى نفس handler الرئيسي مع فلترة المزايا
  subConn.ev.on('messages.upsert', async (chatUpdate) => {
    try {
      const mod = await import('../handler.js')
      // attach a flag so handler.js can call isPluginAllowedForConn
      subConn.__isSubBot = true
      await mod.handler.call(subConn, chatUpdate)
    } catch (e) {
      console.error(`[JADIBOT:${num}] handler error:`, e?.message)
    }
  })

  // سجّل في القائمة العامة
  global.conns = global.conns.filter(c => c.__subBotPhone !== num)
  global.conns.push(subConn)

  // إن لم يكن مسجّلاً → اطلب كود إقران
  if (!subConn.authState.creds.registered) {
    try {
      // Baileys يحتاج تأخير قصير قبل requestPairingCode
      await new Promise(r => setTimeout(r, 1500))
      let code = await subConn.requestPairingCode(num)
      code = code?.match(/.{1,4}/g)?.join('-') || code
      return { ok: true, code, status: 'awaiting-pair', phone: num }
    } catch (err) {
      return { ok: false, error: err?.message || String(err), phone: num }
    }
  }

  return { ok: true, status: 'reconnected', phone: num }
}

/**
 * إغلاق وحذف بوت فرعي.
 */
export async function destroySubBot(phone) {
  const num = String(phone).replace(/\D/g, '')
  const sub = global.conns.find(c => c.__subBotPhone === num)
  try { sub?.ws?.close?.() } catch (_) {}
  try { sub?.end?.() } catch (_) {}
  global.conns = global.conns.filter(c => c.__subBotPhone !== num)

  const folder = join(JADIBOT_DIR, num)
  try { if (existsSync(folder)) rmSync(folder, { recursive: true, force: true }) } catch (_) {}

  const e = dbEntry()
  delete e[num]
  delete sessionsEntry()[num]
  global.db?.markDirty?.()
  return true
}

/**
 * استعادة كل البوتات الفرعية المخزّنة على القرص عند بدء التشغيل.
 */
export async function restoreAllSubBots() {
  ensureDir()
  let restored = 0

  // 1) أولاً: استعد أي جلسات محفوظة في السحاب (Supabase) إلى القرص
  const cloud = sessionsEntry()
  for (const phone of Object.keys(cloud)) {
    const folder = join(JADIBOT_DIR, phone)
    const credsPath = join(folder, 'creds.json')
    if (!existsSync(credsPath)) {
      const ok = restoreSessionFromCloud(phone)
      if (ok) console.log(`[JADIBOT-CLOUD] ⬇️ Restored session files from cloud for +${phone}`)
    }
  }

  // 2) ثم: شغّل كل البوتات التي لها creds.json على القرص
  for (const dir of readdirSync(JADIBOT_DIR)) {
    const folder = join(JADIBOT_DIR, dir)
    if (!existsSync(join(folder, 'creds.json'))) continue
    try {
      const r = await createSubBot(dir, dbEntry()[dir]?.owner || null)
      if (r?.ok) restored++
    } catch (e) {
      console.error(`[JADIBOT] restore ${dir} failed:`, e?.message)
    }
  }
  if (restored) console.log(`[JADIBOT] ✅ Restored ${restored} sub-bot(s).`)
  return restored
}

/**
 * قائمة البوتات الفرعية النشطة + المزايا.
 */
export function listSubBots() {
  ensureDir()
  const onDisk = readdirSync(JADIBOT_DIR)
  const out = []
  for (const num of onDisk) {
    const live = global.conns.find(c => c.__subBotPhone === num)
    out.push({
      phone: num,
      online: !!(live && live.user),
      features: getSubBotFeatures(num),
      owner: dbEntry()[num]?.owner || null,
      createdAt: dbEntry()[num]?.createdAt || null
    })
  }
  return out
}

export default {
  createSubBot, destroySubBot, restoreAllSubBots, listSubBots,
  getSubBotFeatures, setSubBotFeatures, isPluginAllowedForConn
}
