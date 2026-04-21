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

  // ── إن كان هناك سوكت سابقة لنفس الرقم، أغلقها بهدوء أولاً (دون تشغيل منطق الحذف)
  const existing = global.conns.find(c => c.__subBotPhone === num)
  if (existing) {
    existing.__supersededBy = true
    try { existing.ev?.removeAllListeners?.('connection.update') } catch (_) {}
    try { existing.ev?.removeAllListeners?.('creds.update') } catch (_) {}
    try { existing.ev?.removeAllListeners?.('messages.upsert') } catch (_) {}
    try { existing.ws?.close?.() } catch (_) {}
    try { existing.end?.(undefined) } catch (_) {}
    global.conns = global.conns.filter(c => c !== existing)
    // امهل WhatsApp قليلاً لتسجيل إغلاق السوكت القديمة
    await new Promise(r => setTimeout(r, 800))
  }

  // ── تجهيز المجلد + استرجاع جلسة محفوظة في السحاب إن وُجدت
  const folder = join(JADIBOT_DIR, num)
  if (!existsSync(folder)) mkdirSync(folder, { recursive: true })
  if (!existsSync(join(folder, 'creds.json')) && sessionsEntry()[num]) {
    restoreSessionFromCloud(num)
  }

  // ── إن كانت creds موجودة لكن غير مُسجَّلة (pairing لم يكتمل سابقاً)،
  //   امسحها لتوليد مفاتيح Noise نظيفة لكود الإقران الجديد. هذا يمنع
  //   رسالة "Couldn't link device" التي يرفعها WhatsApp بسبب عدم تطابق المفاتيح.
  try {
    const credsFile = join(folder, 'creds.json')
    if (existsSync(credsFile)) {
      const raw = readFileSync(credsFile, 'utf8')
      const parsed = JSON.parse(raw)
      const isRegistered = !!(parsed?.me?.id || parsed?.registered === true || parsed?.account)
      if (!isRegistered) {
        // امسح كل الملفات داخل المجلد لبدء نظيف
        for (const f of readdirSync(folder)) {
          try { rmSync(join(folder, f), { force: true }) } catch (_) {}
        }
        // كذلك امسح الجلسة من السحاب لأنها غير صالحة
        delete sessionsEntry()[num]
        global.db?.markDirty?.()
        console.log(`[JADIBOT] 🧹 Cleared unregistered creds for +${num} before new pairing.`)
      }
    }
  } catch (e) {
    console.error(`[JADIBOT] creds check for +${num} failed:`, e?.message)
  }

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
    // مهم: لا تستخدم اسم متصفح مخصص — WhatsApp يرفض الإقران مع المتصفحات غير المعروفة.
    // نستخدم نفس إعدادات البوت الرئيسي (Mac/Safari) التي يقبلها واتساب.
    browser: ['Mac OS', 'Safari', '15.0'],
    version,
    connectTimeoutMs: 120000,
    keepAliveIntervalMs: 30000,
    printQRInTerminal: false,
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    retryRequestDelayMs: 5000,
    getMessage: async () => ({ conversation: 'SHADOW Sub-Bot' })
  })

  subConn.__subBotPhone = num
  subConn.__subBotOwner = ownerJid || null
  subConn.__hasConnectedOnce = false

  // اربط الأحداث — كل تحديث للاعتمادات يحفظ على القرص + السحاب
  subConn.ev.on('creds.update', async () => {
    try { await saveCreds() } catch (_) {}
    persistSessionToCloud(num)
  })
  subConn.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'open') {
      subConn.__hasConnectedOnce = true
      console.log(`[JADIBOT] ✅ Sub-bot ${num} connected.`)
      persistSessionToCloud(num)
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode

      // إذا تم استبدال هذا الاتصال بآخر جديد لنفس الرقم → تجاهل بهدوء
      if (subConn.__supersededBy) {
        console.log(`[JADIBOT] ↩️ Sub-bot ${num} (old socket) closed — superseded by new instance.`)
        return
      }

      // 401 قبل أي اتصال ناجح = ربما المستخدم لم يدخل الكود في الوقت المحدد
      // لا نمسح الجلسة، فقط نزيل من القائمة الحية ليعيد المحاولة
      if (code === 401 && !subConn.__hasConnectedOnce) {
        console.log(`[JADIBOT] ⏰ Sub-bot ${num} pairing window expired (401 before connect). Session preserved.`)
        global.conns = global.conns.filter(c => c !== subConn)
        return
      }

      // 401 بعد اتصال ناجح = تسجيل خروج فعلي من واتساب → تنظيف كامل
      if (code === 401 && subConn.__hasConnectedOnce) {
        console.log(`[JADIBOT] ❌ Sub-bot ${num} logged out — removing.`)
        delete sessionsEntry()[num]
        global.db?.markDirty?.()
        await destroySubBot(num).catch(() => {})
        return
      }

      // أي إغلاق آخر → احتفظ بالجلسة وأزل فقط من القائمة الحية
      console.log(`[JADIBOT] ⚠️ Sub-bot ${num} closed (code=${code}). Session kept; will reconnect on restart.`)
      global.conns = global.conns.filter(c => c !== subConn)
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
      // Baileys يحتاج وقتاً كافياً ليُكمل Noise handshake قبل طلب كود الإقران
      await new Promise(r => setTimeout(r, 4000))
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

  // 2) ثم: شغّل البوتات التي لها creds.json *مُسجَّلة فعلياً* فقط
  for (const dir of readdirSync(JADIBOT_DIR)) {
    const folder = join(JADIBOT_DIR, dir)
    const credsFile = join(folder, 'creds.json')
    if (!existsSync(credsFile)) continue
    try {
      const parsed = JSON.parse(readFileSync(credsFile, 'utf8'))
      const isRegistered = !!(parsed?.me?.id || parsed?.registered === true || parsed?.account)
      if (!isRegistered) {
        console.log(`[JADIBOT] ⏭️ Skipping ${dir} — creds not yet registered (pairing didn't complete).`)
        continue
      }
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
