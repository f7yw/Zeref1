import './config.js';
import './api.js';
import { createRequire } from 'module';
import path, { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { platform } from 'process';
import * as ws from 'ws';
import { readdirSync, rmSync, existsSync, watchFile } from 'fs';
import yargs from 'yargs';
import { spawn } from 'child_process';
import lodash from 'lodash';
import chalk from 'chalk';
import { tmpdir } from 'os';
import { format } from 'util';
import pino from 'pino';
import { Boom } from '@hapi/boom';
import { makeWASocket, protoType, serialize } from './lib/simple.js';
import { Low, JSONFile } from 'lowdb';
import store from './lib/store.js';
import { mongoDB } from './lib/mongoDB.js';
import { SupabaseDB } from './lib/supabaseDB.js';

const { proto } = (await import('@whiskeysockets/baileys')).default;
const {
  DisconnectReason,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  getAggregateVotesInPollMessage
} = await import('@whiskeysockets/baileys');

const { chain } = lodash;
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000;

// جلب أحدث نسخة من Baileys
const { version, isLatest } = await fetchLatestBaileysVersion();
console.log(chalk.cyan(`[BAILEYS] Using version v${version.join('.')} (Latest: ${isLatest})`));

protoType();
serialize();

// ====== PATH HELPERS ======
global.__filename = function filename(pathURL = import.meta.url, rmPrefix = platform !== 'win32') {
  return rmPrefix
    ? /file:\/\/\//.test(pathURL)
      ? fileURLToPath(pathURL)
      : pathURL
    : pathToFileURL(pathURL).toString();
};

global.__dirname = function dirname(pathURL) {
  return path.dirname(global.__filename(pathURL, true));
};

global.__require = function require(dir = import.meta.url) {
  return createRequire(dir);
};

const __dirname = global.__dirname(import.meta.url);

// ====== GLOBALS ======
global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse());
global.prefix = new RegExp(
  '^[' +
    (opts['prefix'] || '*/i!#$%+£¢€¥^°=¶∆×÷π√✓©®:;?&.\\-.@aA').replace(
      /[|\\{}()[\]^$+*?.\-\^]/g,
      '\\$&'
    ) +
    ']'
);

// ====== DATABASE ======
const MONGODB_URI = process.env.MONGODB_URI;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (SUPABASE_URL && SUPABASE_KEY) {
  global.db = new SupabaseDB(SUPABASE_URL, SUPABASE_KEY);
  console.log('[DB] Using Supabase for persistent storage.');
} else if (MONGODB_URI) {
  global.db = new mongoDB(MONGODB_URI);
  console.log('[DB] Using MongoDB Atlas for persistent storage.');
} else {
  global.db = new Low(new JSONFile(`database.json`));
  console.log('[DB] Using local JSON file for storage (development mode).');
}
global.DATABASE = global.db;

global.loadDatabase = async function () {
  await global.db.read().catch(console.error);
  global.db.data = {
    users: {},
    chats: {},
    stats: {},
    msgs: {},
    settings: {},
    ...(global.db.data || {})
  };
  if (global.db.chain !== undefined || !MONGODB_URI) {
    global.db.chain = chain(global.db.data);
  }

  // تنظيف تلقائي: حذف سجلات LID الوهمية (ليست أرقام هواتف حقيقية)
  let cleaned = 0;
  for (const key of Object.keys(global.db.data.users || {})) {
    if (key.endsWith('@lid')) { delete global.db.data.users[key]; cleaned++; }
  }
  for (const key of Object.keys(global.db.data.chats || {})) {
    if (key.endsWith('@lid')) { delete global.db.data.chats[key]; cleaned++; }
  }
  if (cleaned > 0) {
    console.log(chalk.yellow(`[DB] Removed ${cleaned} LID entries from database.`));
    await global.db.write().catch(console.error);
  }
};
await loadDatabase();

// ====== استعادة إعدادات البوت بعد إعادة التشغيل ======
try {
  const savedOpts = global.db?.data?.settings?.opts
  if (savedOpts && typeof savedOpts === 'object') {
    if (typeof savedOpts.self === 'boolean')     global.opts.self     = savedOpts.self
    if (typeof savedOpts.autoread === 'boolean') global.opts.autoread = savedOpts.autoread
    if (typeof savedOpts.restrict === 'boolean') global.opts.restrict = savedOpts.restrict
    console.log(chalk.cyan('[OPTS] استُعيدت إعدادات البوت من القاعدة.'))
  }
} catch (_) {}

// ====== إتاحة دوال المستويات بشكل عام ======
try {
  const econ = await import('./lib/economy.js')
  global.tierBadge   = econ.tierBadge
  global.getTier     = econ.getTier
  global.isOwner     = econ.isOwner
  global.isRegistered = econ.isRegistered
  global.isVip       = econ.isVip
} catch (e) { console.error('[TIER]', e?.message) }

// ====== إعادة بناء قائمة المميزين من قاعدة البيانات ======
try {
  global.prems = global.prems || []
  const now    = Date.now()
  const seen   = new Set(global.prems.map(n => String(n).replace(/\D/g, '')))
  let restored = 0
  for (const [jid, u] of Object.entries(global.db?.data?.users || {})) {
    if (!u) continue
    const isPremActive = (u.premium === true) || (u.premiumTime && u.premiumTime > now)
    if (!isPremActive) continue
    const num = jid.split('@')[0].replace(/\D/g, '')
    if (num && !seen.has(num)) { global.prems.push(num); seen.add(num); restored++ }
  }
  if (restored) console.log(chalk.cyan(`[VIP] استُعيد ${restored} مميز من قاعدة البيانات.`))
} catch (e) { console.error('[VIP-RESTORE]', e?.message) }

global.saveDatabase = async function () {
  const writeFn = global.__dbWrite || (global.db?.write?.bind?.(global.db))
  if (global.db?.data && writeFn) await writeFn().catch(console.error)
  if (global.chatgpt?.data) {
    try { await global.chatgpt.write().catch(console.error) } catch (_) {}
  }
  if (global.db) global.db.__dirty = false
};

// ====== CHATGPT DATABASE ======
global.chatgpt = new Low(new JSONFile(`chatgpt.json`));

global.loadChatgptDB = async function () {
  await global.chatgpt.read().catch(console.error);
  global.chatgpt.data = {
    users: {},
    ...(global.chatgpt.data || {})
  };
};
await global.loadChatgptDB();

// ====== PLUGINS ======
global.plugins = {}

async function loadPlugins() {
  const pluginsDir = join(__dirname, 'plugins')
  const pluginFiles = readdirSync(pluginsDir).filter(f => f.endsWith('.js'))
  let loaded = 0, failed = 0
  for (const file of pluginFiles) {
    try {
      const filePath = pathToFileURL(join(pluginsDir, file)).href
      const mod = await import(`${filePath}?t=${Date.now()}`)
      global.plugins[file] = mod.default || mod.handler || mod
      loaded++
    } catch (e) {
      console.error(chalk.red(`[PLUGIN ERROR] ${file}: ${e.message}`))
      global.plugins[file] = null
      failed++
    }
  }
  console.log(chalk.green(`[PLUGINS] Loaded ${loaded} plugins${failed ? `, ${failed} failed` : ''}`))
}
await loadPlugins()

// Watch plugins for changes
for (const file of readdirSync(join(__dirname, 'plugins')).filter(f => f.endsWith('.js'))) {
  const filePath = join(__dirname, 'plugins', file)
  watchFile(filePath, async () => {
    try {
      const mod = await import(`${pathToFileURL(filePath).href}?t=${Date.now()}`)
      global.plugins[file] = mod.default || mod.handler || mod
      console.log(chalk.cyan(`[PLUGINS] Reloaded: ${file}`))
    } catch (e) {
      console.error(chalk.red(`[PLUGIN RELOAD ERROR] ${file}: ${e.message}`))
    }
  })
}

// ====== SESSION INTEGRITY CHECK (يفحص سلامة الجلسة عند بدء التشغيل) ======
global.authFile = `Zeref`;

async function checkAndRepairSession(authDir) {
  const { existsSync: _ex, rmSync: _rm, readdirSync: _rd, statSync: _st } = await import('fs')
  if (!_ex(authDir)) return

  try {
    const files = _rd(authDir)

    if (files.length === 0) {
      console.log(chalk.yellow('[SESSION] مجلد الجلسة فارغ — سيتم حذفه لإعادة الربط.'))
      _rm(authDir, { recursive: true, force: true })
      return
    }

    const credsFile = `${authDir}/creds.json`
    if (!_ex(credsFile)) {
      console.log(chalk.yellow('[SESSION] ملف creds.json مفقود — جلسة ناقصة، سيتم حذفها.'))
      _rm(authDir, { recursive: true, force: true })
      return
    }

    const credsRaw = (await import('fs')).readFileSync(credsFile, 'utf8')
    JSON.parse(credsRaw)

    const stat = _st(credsFile)
    if (stat.size < 10) {
      console.log(chalk.yellow('[SESSION] ملف creds.json تالف (حجم صغير جداً) — سيتم حذفه.'))
      _rm(authDir, { recursive: true, force: true })
      return
    }

    console.log(chalk.green('[SESSION] ✅ الجلسة سليمة، جارٍ الاتصال...'))
  } catch (err) {
    console.log(chalk.red('[SESSION] ⚠️ الجلسة تالفة — سيتم حذفها تلقائياً وإعادة الربط.'))
    console.log(chalk.gray(`  ➤ السبب: ${err.message}`))
    try {
      rmSync(authDir, { recursive: true, force: true })
      console.log(chalk.yellow('[SESSION] تم حذف الجلسة التالفة بنجاح.'))
    } catch (e2) {
      console.log(chalk.red('[SESSION] فشل حذف الجلسة:'), e2.message)
    }
  }
}

await checkAndRepairSession(global.authFile)

const { state, saveCreds } = await useMultiFileAuthState(global.authFile);

// ====== CONNECTION OPTIONS ======
// ====== CONNECTION OPTIONS (محسن للاستقرار) ======
const connectionOptions = {
  connectTimeoutMs: 120000,
  keepAliveIntervalMs: 30000,
  logger: pino({ level: 'silent' }),
  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
  },
  browser: ["Mac OS", "Safari", "15.0"],
  version,
  syncFullHistory: false,
  shouldSyncHistoryMessage: () => false,
  markOnlineOnConnect: true,
  generateHighQualityLinkPreview: true,
  retryRequestDelayMs: 5000,
  maxRetries: 5,
  getMessage: async (key) => {
    if (store) {
      const msg = await store.loadMessage(key.remoteJid, key.id)
      return msg?.message || undefined
    }
    return { conversation: 'Zeref-Bot is here!' }
  }
}


// ====== PHONE NUMBER FROM ENV ======
const phoneNumber = (process.env.PHONE_NUMBER || '').replace(/[^0-9]/g, '');

if (!phoneNumber) {
  console.log(chalk.red.bold('\n╔══════════════════════════════════════════════════╗'));
  console.log(chalk.red.bold('║         ❌  PHONE NUMBER NOT CONFIGURED          ║'));
  console.log(chalk.red.bold('╚══════════════════════════════════════════════════╝'));
  console.log(chalk.yellow('  ➤ Please set the PHONE_NUMBER environment variable.'));
  console.log(chalk.yellow('  ➤ Example: PHONE_NUMBER=967782114485'));
  console.log(chalk.yellow('  ➤ Include the country code, no + or spaces.\n'));
  process.exit(1);
}

console.log(chalk.cyan(`\n[CONFIG] Phone number loaded: ${phoneNumber}`));

// ====== CONNECT ======
global.conn = makeWASocket(connectionOptions);
conn.isInit = false;

// Pairing Code Logic
if (!conn.authState.creds.registered) {
  console.log(chalk.cyan(`\n[PAIRING] Session not registered. Requesting pairing code for: +${phoneNumber}`));
  console.log(chalk.gray('  ➤ Open WhatsApp → Linked Devices → Link a Device → Link with phone number'));
  setTimeout(async () => {
    try {
      console.log(chalk.cyan('[PAIRING] Contacting WhatsApp servers...'));
      let code = await conn.requestPairingCode(phoneNumber.trim());
      code = code?.match(/.{1,4}/g)?.join('-') || code;
      console.log(chalk.green.bold('\n╔══════════════════════════════════════════════════╗'));
      console.log(chalk.green.bold(`║         📱  YOUR PAIRING CODE: ${code.padEnd(16)}║`));
      console.log(chalk.green.bold('╚══════════════════════════════════════════════════╝\n'));

      // اكتب الكود إلى ملف + متغير عام لتعرضه واجهة /pairing-code
      try {
        const fsMod = await import('fs')
        if (!fsMod.existsSync('./tmp')) fsMod.mkdirSync('./tmp', { recursive: true })
        fsMod.writeFileSync('./tmp/pairing-code.txt', `${code}\nGenerated: ${new Date().toISOString()}\nPhone: +${phoneNumber}`)
      } catch (_) {}
      global.__pairingCode = { code, at: Date.now(), phone: phoneNumber }
    } catch (e) {
      console.log(chalk.red.bold('\n[PAIRING ERROR] Failed to generate pairing code!'));
      console.log(chalk.red(`  ➤ Error type   : ${e?.output?.payload?.error || e?.name || 'Unknown'}`));
      console.log(chalk.red(`  ➤ Error message: ${e?.output?.payload?.message || e?.message || String(e)}`));
      console.log(chalk.red(`  ➤ Status code  : ${e?.output?.statusCode || 'N/A'}`));
      console.log(chalk.yellow('  ➤ Possible causes:'));
      console.log(chalk.yellow('      • Invalid phone number format (must include country code, digits only)'));
      console.log(chalk.yellow('      • WhatsApp server refused the connection'));
      console.log(chalk.yellow('      • A stale session exists — the bot will retry on restart'));
      console.log(chalk.yellow('  ➤ Full error:\n'), e);
    }
  }, 3000);
} else {
  console.log(chalk.cyan('[AUTH] Existing session found. Attempting to reconnect...'));
}

let stopped = false;

conn.logger.info(`Ƈᴀʀɢᴀɴᴅᴏ．．．\n`);

// ====== CONNECTION HANDLER ======
async function connectionUpdate(update) {
  const { connection, lastDisconnect, qr } = update
  stopped = connection

  if (qr && !conn.authState.creds.registered) {
    console.log(chalk.yellow('📲 QR code received — use the pairing code above instead.'))
  }

  const errorData = lastDisconnect?.error
  const reason = new Boom(errorData)?.output?.statusCode

  console.log(
    chalk.gray(
      `[CONNECTION] Status update → connection="${connection || 'none'}", reason code=${reason || 'none'}`
    )
  )

  const restartBot = (delay = 5000) => {
    if (global.__reconnectTimer) return

    console.log(chalk.yellow(`  ➤ Restarting in ${Math.round(delay / 1000)}s...`))

    global.__reconnectTimer = setTimeout(async () => {
      global.__reconnectTimer = null
      try {
        await global.saveDatabase?.().catch(() => {})
      } catch {}
      console.log(chalk.cyan('  ➤ Exiting process for cluster restart...'))
      process.exit(0)
    }, delay)
  }

  const clearSessionAndRestart = async (msg, delay = 3000) => {
    console.log(chalk.red(msg))

    try {
      await global.saveDatabase?.().catch(() => {})
    } catch {}

    try {
      const authPath = `./${global.authFile}`
      if (existsSync(authPath)) {
        rmSync(authPath, { recursive: true, force: true })
        console.log(chalk.yellow('  ➤ Session deleted successfully.'))
      }
    } catch (err) {
      console.log(chalk.red('  ➤ Could not delete session folder:'), err.message)
    }

    restartBot(delay)
  }

  if (connection === 'open') {
    console.log(chalk.green.bold('\n✅ Connected to WhatsApp successfully!'))
    console.log(chalk.green(`  ➤ Bot is active and listening for messages.`))

    // ── تسجيل البوت كـ "تاجر NPC" + كل المالكين تلقائياً ─────────────────
    try {
      const { initUser } = await import('./lib/userInit.js')
      const users = global.db?.data?.users
      if (users) {
        const botJidRaw = (conn.user?.id || '').replace(/:\d+@/, '@')
        // اكتب البوت تحت صيغتي @lid و @s.whatsapp.net معاً
        const botKeys = new Set([botJidRaw])
        if (botJidRaw.endsWith('@lid')) {
          const num = botJidRaw.split('@')[0].replace(/\D/g, '')
          if (num) botKeys.add(`${num}@s.whatsapp.net`)
        } else if (botJidRaw.endsWith('@s.whatsapp.net')) {
          for (const [lid, phone] of Object.entries(global.lidPhoneMap || {})) {
            if (phone === botJidRaw) botKeys.add(lid)
          }
        }
        for (const key of botKeys) {
          if (!key) continue
          users[key] ??= {}
          const bu = users[key]
          initUser(bu, conn.user?.name || 'زيريف التاجر', key)
          bu.registered        = true
          if (!bu.regTime || bu.regTime <= 0) bu.regTime = Date.now()
          bu.name              = bu.name || 'زيريف ⚜️ التاجر'
          bu.age               = bu.age || 999
          bu.gender            = bu.gender || 'بوت'
          bu.bio               = bu.bio || '🤖 التاجر الرسمي للبوت — موارد لا نهائية'
          bu.premium           = true
          bu.premiumTime       = Date.now() + (50 * 365 * 24 * 60 * 60 * 1000)
          bu.infiniteResources = true
          bu.money             = Math.max(bu.money || 0, 1_000_000_000)
          bu.bank              = Math.max(bu.bank  || 0, 1_000_000_000)
          bu.diamond           = Math.max(bu.diamond || 0, 1_000_000)
          bu.energy            = 100
          bu.level             = Math.max(bu.level || 0, 999)
          bu.exp               = Math.max(bu.exp   || 0, 999_999)
          bu.role              = '🤖 التاجر الرسمي'
        }
        console.log(chalk.cyan(`[BOT-REG] تم تسجيل البوت تحت ${botKeys.size} صيغة JID`))

        // ── تسجيل كل المالكين كمستخدمين دائمين بحالة "مطور مسجّل" ──
        let ownerCount = 0
        for (const entry of (global.owner || [])) {
          const ownerNum = String(Array.isArray(entry) ? entry[0] : entry).replace(/\D/g, '')
          const ownerName = (Array.isArray(entry) && entry[1]) ? entry[1] : 'المطور'
          if (!ownerNum) continue
          const ownerKeys = new Set([`${ownerNum}@s.whatsapp.net`])
          // أضف صيغة @lid إن كانت مُكتشفة
          for (const [lid, phone] of Object.entries(global.lidPhoneMap || {})) {
            if (phone === `${ownerNum}@s.whatsapp.net`) ownerKeys.add(lid)
          }
          for (const key of ownerKeys) {
            users[key] ??= {}
            const ou = users[key]
            initUser(ou, ownerName, key)
            ou.registered        = true
            if (!ou.regTime || ou.regTime <= 0) ou.regTime = Date.now()
            ou.name              = ou.name || ownerName
            ou.bio               = ou.bio || '👑 المطور الرسمي للبوت'
            ou.premium           = true
            ou.premiumTime       = Date.now() + (50 * 365 * 24 * 60 * 60 * 1000)
            ou.infiniteResources = true
            ou.role              = '👑 مطور'
          }
          ownerCount++
        }
        if (ownerCount) console.log(chalk.cyan(`[OWNER-REG] تم تسجيل ${ownerCount} مالك تلقائياً`))

        await global.db.write().catch(() => {})
      }
    } catch (e) { console.error('[BOT-REG]', e?.message) }


    // ── بناء جدول LID→Phone من جهات الاتصال ──────────────────────────────
    setTimeout(() => {
      try {
        global.lidPhoneMap ??= {}
        // Load persisted map from DB
        const savedMap = global.db?.data?.lidPhoneMap || {}
        Object.assign(global.lidPhoneMap, savedMap)

        // Scan conn.contacts (Baileys stores {id, lid, name} per contact)
        const contacts = conn.contacts || {}
        let mapped = 0
        for (const [jid, contact] of Object.entries(contacts)) {
          const lid = contact?.lid || contact?.userJid
          const phone = contact?.id || (jid?.endsWith('@s.whatsapp.net') ? jid : null)
          if (lid && phone && lid !== phone) {
            global.lidPhoneMap[lid] = phone
            mapped++
          }
          // Also reverse: if key is lid, map it to phone
          if (jid?.endsWith('@lid') && contact?.id) {
            global.lidPhoneMap[jid] = contact.id
            mapped++
          }
        }
        // Also scan chats for participant LID mappings
        const chats = conn.chats || {}
        for (const [, chatData] of Object.entries(chats)) {
          for (const p of (chatData?.metadata?.participants || [])) {
            if (p?.lid && p?.id && p.lid !== p.id) {
              global.lidPhoneMap[p.lid] = p.id
              if (!p.lid.includes('@')) global.lidPhoneMap[p.lid + '@lid'] = p.id
              mapped++
            }
          }
        }
        // Persist map to DB
        if (mapped > 0) {
          global.db.data.lidPhoneMap = global.lidPhoneMap
          global.db.write().catch(() => {})
          console.log(chalk.cyan(`[LID] Built ${mapped} LID→Phone mappings from contacts.`))
        } else {
          console.log(chalk.gray('[LID] No LID mappings found in contacts yet.'))
        }
      } catch (e) {
        console.error('[LID] Error building map:', e.message)
      }
    }, 3000)

    // ── إرسال تأكيد الإقران للمطور إن طُلب مسح/إعادة إقران ──
    setTimeout(async () => {
      try {
        const pending = global.db?.data?.settings?.pendingPairing
        if (pending?.requestedBy) {
          const targetJid = pending.requestedBy
          await conn.sendMessage(targetJid, {
            text: `✅ *تم إعادة الربط بنجاح*\n\nالبوت متصل الآن بـ +${phoneNumber}\nوقت الطلب: ${new Date(pending.requestedAt).toLocaleString('ar')}\nوقت الاتصال: ${new Date().toLocaleString('ar')}`
          }).catch(() => {})
          delete global.db.data.settings.pendingPairing
          await global.db.write?.().catch(() => {})
        }
      } catch (e) { console.error('[PAIR-CONFIRM]', e?.message) }
    }, 4000)

    // ── استعادة البوتات الفرعية المخزّنة ──
    setTimeout(async () => {
      try {
        const { restoreAllSubBots } = await import('./lib/jadibot.js')
        await restoreAllSubBots()
      } catch (e) { console.error('[JADIBOT-RESTORE]', e?.message) }
    }, 6000)

    // ── جدولة المحاضرات/الاختبارات المخزّنة ──
    setTimeout(async () => {
      try {
        const mod = await import('./plugins/schedule.js')
        if (typeof mod.loadAndScheduleAll === 'function') mod.loadAndScheduleAll(conn)
      } catch (e) { console.error('[SCHEDULE-LOAD]', e?.message) }
    }, 7000)

    // ── ZerefGuard: فحص سلامة الكود ──
    setTimeout(async () => {
      try {
        const Guard = (await import('./lib/zerefguard.js')).default
        await Guard.bootCheck(conn)
      } catch (e) { console.error('[ZEREFGUARD]', e?.message) }
    }, 8000)

    // ── استعادة حالة الألعاب من DB ──
    try {
      const gs = global.db?.data?.gameState || {}
      conn.chess          = gs.chess          || {}
      conn.game           = gs.tictactoe      || {}
      conn.c4             = gs.connect4       || {}
      conn.games3         = gs.games3         || {}
      console.log(chalk.cyan(`[GAME] استعادة الألعاب: chess=${Object.keys(conn.chess).length} xo=${Object.keys(conn.game).length} c4=${Object.keys(conn.c4).length}`))
    } catch (e) { console.error('[GAME-RESTORE]', e?.message) }

    setTimeout(async () => {
      try {
        const { readdirSync: _rdr } = await import('fs')
        const pluginFiles = _rdr('./plugins').filter(f => f.endsWith('.js'))
        const totalUsers = Object.keys(global.db?.data?.users || {}).length
        const totalChats = Object.keys(global.db?.data?.chats || {}).length
        const premUsers = Object.values(global.db?.data?.users || {}).filter(
          u => u?.premium === true || (u?.premiumTime || 0) > Date.now()
        ).length
        const memMB = Math.round(process.memoryUsage().rss / 1024 / 1024)
        const uptime = Math.round(process.uptime())
        const pluginList = pluginFiles.map((f, i) => `${i + 1}. ${f}`).join('\n')

        const startupMsg = `╭──────『 🚀 تشغيل البوت 』──────
│
│ ✅ *البوت يعمل بنجاح!*
│ 🕐 وقت البدء: ${new Date().toLocaleString('ar')}
│ ⏱️ وقت التشغيل: ${uptime}ث
│
│ ─── قاعدة البيانات ───
│ 👥 مستخدمون: ${totalUsers}
│ 💬 محادثات: ${totalChats}
│ 👑 مميزون: ${premUsers}
│
│ ─── الأداء ───
│ 🧠 الذاكرة: ${memMB} MB
│ 📦 Node: ${process.version}
╰──────────────────────`

        const ownerNumbers = (global.owner || []).filter(([, , isDev]) => isDev).map(([n]) => n)

        for (const num of ownerNumbers) {
          const jid = `${String(num).replace(/\D/g, '')}@s.whatsapp.net`
          try {
            const data = (await conn.onWhatsApp(jid).catch(() => []))[0]
            if (data?.exists) {
              await conn.sendMessage(jid, { text: startupMsg })
            }
          } catch (_) {}
        }
      } catch (e) {
        console.error(chalk.red('[STARTUP NOTIFY ERROR]'), e)
      }
    }, 5000)
  }

  if (connection === 'close') {
    if (reason === DisconnectReason.loggedOut || reason === DisconnectReason.forbidden) {
      await clearSessionAndRestart('❌ Session logged out. Clearing data...')
    } else if (reason === DisconnectReason.badSession) {
      await clearSessionAndRestart('⚠️ Bad session detected. Clearing and restarting...')
    } else if (reason === DisconnectReason.restartRequired) {
      console.log(chalk.cyan('🔄 Restart required. Reconnecting...'))
      restartBot(2000)
    } else if (reason === DisconnectReason.timedOut || reason === DisconnectReason.connectionLost) {
      console.log(chalk.red('⏰ Connection timed out / lost. Retrying...'))
      restartBot(3000)
    } else if (reason === DisconnectReason.connectionClosed) {
      console.log(chalk.red('🔌 Connection closed. Reconnecting...'))
      restartBot(3000)
    } else if (reason === DisconnectReason.connectionReplaced) {
      console.log(chalk.yellow('🔄 Connection replaced by another device. Stopping.'))
    } else if (reason === DisconnectReason.unavailableService) {
      console.log(chalk.yellow('🌐 WhatsApp server unavailable (503). Retrying in 10s...'))
      restartBot(10000)
    } else if (reason === DisconnectReason.multideviceMismatch) {
      await clearSessionAndRestart('⚠️ Multi-device mismatch. Clearing session...')
    } else {
      console.log(chalk.red(`❓ Connection closed, reason: ${reason}. Retrying...`))
      restartBot(5000)
    }
  }
}

conn.ev.on('connection.update', connectionUpdate)
conn.ev.on('creds.update', saveCreds)

// ====== GROUP EVENTS → OWNER NOTIFICATIONS ======
;(async () => {
  try {
    const { notifyGroupEvent } = await import('./lib/notify.js')

    const botJids = () => {
      const ids = new Set()
      try {
        const u = conn.user || {}
        if (u.id) ids.add(conn.decodeJid?.(u.id) || u.id)
        if (u.lid) ids.add(conn.decodeJid?.(u.lid) || u.lid)
      } catch (_) {}
      try {
        for (const o of (global.botJids || [])) ids.add(o)
      } catch (_) {}
      return ids
    }

    // انضمام/مغادرة/طرد
    conn.ev.on('group-participants.update', async (ev) => {
      try {
        const me = botJids()
        const involves = (ev.participants || []).some(p => me.has(conn.decodeJid?.(p) || p))
        if (!involves) return
        const action = ev.action
        const map = { add: 'joined', remove: 'left', promote: 'promoted', demote: 'demoted' }
        const event = map[action]
        if (!event) return
        await notifyGroupEvent(conn, ev.id, event, { byJid: ev.author })
      } catch (e) { console.error('[GRP-EV]', e?.message) }
    })

    // اكتشاف انضمام للمجموعة عبر تحديثات groups (حالة: تمت الإضافة بدون event صريح)
    conn.ev.on('groups.upsert', async (groups) => {
      try {
        for (const g of (groups || [])) {
          await notifyGroupEvent(conn, g.id, 'joined', { note: 'مجموعة جديدة أُضيف إليها البوت' })
        }
      } catch (e) { console.error('[GRP-UPSERT]', e?.message) }
    })
  } catch (e) {
    console.error('[GRP-LISTENERS]', e?.message)
  }
})()

// ====== DIRTY FLAG + ACTIVITY TRACKING FOR SMART DB SAVES ======
global.db.__dirty = false
global.__lastActivity = Date.now()

// الدالة الأصلية للكتابة (لا تُعدَّل)
global.__dbWrite = global.db.write.bind(global.db)

// markDirty: يُعلَّم عند أي تغيير حقيقي في البيانات
global.markDirty = function () {
  global.db.__dirty = true
  global.__lastActivity = Date.now()
}

// ====== MESSAGE HANDLER ======
let _handlerModule = null
conn.ev.on('messages.upsert', async (chatUpdate) => {
  try {
    global.db.__lastActivity = Date.now()
    const msgs = chatUpdate.messages
    if (!msgs || !msgs.length) return

    // Unwrap view-once / document-with-caption for all messages in batch
    for (const m of msgs) {
      if (!m) continue
      if (m.message?.viewOnceMessageV2) m.message = m.message.viewOnceMessageV2.message
      if (m.message?.documentWithCaptionMessage) m.message = m.message.documentWithCaptionMessage.message
      if (m.message?.viewOnceMessageV2Extension) m.message = m.message.viewOnceMessageV2Extension.message
    }

    if (!_handlerModule) _handlerModule = await import('./handler.js')
    await _handlerModule.handler.call(conn, chatUpdate)
  } catch (e) {
    console.error(chalk.red('[MESSAGE HANDLER ERROR]'), e)
  }
})

// ====== AUTO SAVE (SMART — only when dirty and bot has recent activity) ======
const IDLE_THRESHOLD_MS = 5 * 60 * 1000   // 5 دقائق خمول → لا حفظ
const SAVE_INTERVAL_MS  = 2 * 60 * 1000   // يفحص كل دقيقتين

let _chatgptOrigWrite = null
try { _chatgptOrigWrite = global.chatgpt.write.bind(global.chatgpt) } catch (_) {}

setInterval(async () => {
  try {
    const idleFor = Date.now() - (global.__lastActivity || 0)
    const isIdle  = idleFor > IDLE_THRESHOLD_MS

    // لا كتابة إذا البوت خامل وليس هناك تغييرات
    if (isIdle && !global.db.__dirty) return

    // ── snapshot حالة الألعاب الحالية إلى DB لاستعادتها عند إعادة التشغيل ──
    try {
      if (global.conn) {
        global.db.data.gameState = {
          chess:     global.conn.chess  || {},
          tictactoe: global.conn.game   || {},
          connect4:  global.conn.c4     || {},
          games3:    global.conn.games3 || {},
        }
      }
    } catch (_) {}

    // استخدم الدالة الأصلية مباشرة لتجنّب تحديث __lastActivity بشكل وهمي
    if (global.db?.data) await global.__dbWrite().catch(console.error)
    if (global.chatgpt?.data && _chatgptOrigWrite) await _chatgptOrigWrite().catch(console.error)

    global.db.__dirty = false
  } catch (e) {
    console.error('[AUTO-SAVE ERROR]', e)
  }
}, SAVE_INTERVAL_MS)

// ====== CLEANUP ON EXIT ======
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n[EXIT] Shutting down...'))
  await global.saveDatabase()
  process.exit(0)
})

// ====== UNCAUGHT EXCEPTION GUARD (prevent crash on unexpected errors) ======
process.on('uncaughtException', (err) => {
  console.error(chalk.red('[UNCAUGHT EXCEPTION]'), err?.message || err)
  // Don't exit — let the bot keep running unless it's a fatal error
})

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('[UNHANDLED REJECTION]'), reason?.message || reason)
})

export default conn;
