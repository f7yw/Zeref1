import './config.js';
import './api.js';
import { createRequire } from 'module';
import path, { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { platform } from 'process';
import * as ws from 'ws';
import { readdirSync, rmSync, existsSync } from 'fs';
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
global.db = new Low(new JSONFile(`database.json`));
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
  global.db.chain = chain(global.db.data);
};
await loadDatabase();

global.saveDatabase = async function () {
  if (global.db?.data) await global.db.write().catch(console.error);
  if (global.chatgpt?.data) await global.chatgpt.write().catch(console.error);
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

// ====== AUTH ======
global.authFile = `Zeref`;
const { state, saveCreds } = await useMultiFileAuthState(global.authFile);

// ====== CONNECTION OPTIONS ======
// ====== CONNECTION OPTIONS (محسن للاستقرار) ======
const connectionOptions = {
  connectTimeoutMs: 120000, // زيادة المهلة لـ 120 ثانية لتجنب خطأ 408
  keepAliveIntervalMs: 30000, // إرسال نبضات قلب كل 30 ثانية
  
  logger: pino({ level: 'silent' }),

  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
  },

  browser: ["Mac OS", "Safari", "15.0"], // تغيير هوية المتصفح لتحسين القبول
  version,
  syncFullHistory: false,
  markOnlineOnConnect: true,
  generateHighQualityLinkPreview: true,
  retryRequestDelayMs: 5000, // تأخير إعادة المحاولة عند الفشل
  maxRetries: 5, // عدد محاولات إعادة الاتصال
  getMessage: async (key) => {
    if (store) {
        const msg = await store.loadMessage(key.remoteJid, key.id)
        return msg?.message || undefined
    }
    return { conversation: 'Zeref-Bot is here!' }
  }
};


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
        if (typeof connectToWhatsApp === 'function') {
          await connectToWhatsApp()
          return
        }

        if (typeof global.connectToWhatsApp === 'function') {
          await global.connectToWhatsApp()
          return
        }

        if (typeof global.startBot === 'function') {
          await global.startBot()
          return
        }

        console.log(chalk.red('  ➤ No reconnect function found.'))
      } catch (e) {
        console.error(chalk.red('[RECONNECT ERROR]'), e)
      }
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
│
│ ─── الإضافات (${pluginFiles.length}) ───
${pluginList}
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
        console.error('[STARTUP LOG ERROR]', e.message)
      }
    }, 5000)

    return
  }

  if (connection !== 'close') return

  await global.saveDatabase().catch(console.error)
  console.log(chalk.red.bold('\n⚠️  Connection closed. Diagnosing reason...'))

  if (errorData) {
    console.log(chalk.red(`  ➤ Raw error  : ${errorData?.message || String(errorData)}`))
    console.log(chalk.red(`  ➤ Status code: ${reason || 'unknown'}`))
  }

  switch (reason) {
    case DisconnectReason.badSession:
      await clearSessionAndRestart(
        '  ➤ Reason: BAD SESSION — the saved session is corrupted or rejected.\n' +
          '  ➤ Action: Clearing session files and restarting...'
      )
      return

    case DisconnectReason.loggedOut:
      await clearSessionAndRestart(
        '  ➤ Reason: LOGGED OUT — the device was removed from WhatsApp Linked Devices.\n' +
          '  ➤ Action: Clearing session and restarting...'
      )
      return

    case DisconnectReason.multideviceMismatch:
      await clearSessionAndRestart(
        '  ➤ Reason: MULTIDEVICE MISMATCH — session conflict detected.\n' +
          '  ➤ Action: Clearing session and restarting...'
      )
      return

    case DisconnectReason.connectionClosed:
    case DisconnectReason.connectionLost:
    case DisconnectReason.timedOut:
      console.log(chalk.yellow('  ➤ Temporary disconnect. Reconnecting...'))
      restartBot(5000)
      return

    case DisconnectReason.restartRequired:
      console.log(chalk.yellow('  ➤ Reason: RESTART REQUIRED by server. Recreating socket...'))
      restartBot(1000)
      return

    default:
      console.log(chalk.red(`  ➤ Reason: UNKNOWN (code ${reason}). Reconnecting in 5 seconds...`))
      restartBot(5000)
      return
  }
}

// ====== HANDLER ======
let handler = await import('./handler.js');

conn.handler = handler.handler.bind(conn);
conn.connectionUpdate = connectionUpdate.bind(conn);
conn.credsUpdate = saveCreds.bind(conn);
conn.participantsUpdate = handler.participantsUpdate.bind(conn);
conn.groupsUpdate = handler.groupsUpdate.bind(conn);

// ====== EVENTS ======
conn.ev.on('messages.upsert', conn.handler);
conn.ev.on('connection.update', conn.connectionUpdate);
conn.ev.on('creds.update', conn.credsUpdate);
conn.ev.on('group-participants.update', conn.participantsUpdate);
conn.ev.on('groups.update', conn.groupsUpdate);

// ====== POLL VOTE HANDLER (menu navigation) ======
global.menuPolls = global.menuPolls || new Map();

conn.ev.on('messages.update', async (updates) => {
  for (const update of updates) {
    if (!update.update?.pollUpdates) continue;

    const pollId = update.key?.id;
    const meta = global.menuPolls.get(pollId);
    if (!meta) continue;

    // Expired polls
    if (Date.now() > meta.expires) {
      global.menuPolls.delete(pollId);
      continue;
    }

    try {
      const pollMsg = await store.loadMessage(update.key.remoteJid, pollId);
      if (!pollMsg) continue;

      const votes = getAggregateVotesInPollMessage({
        message: pollMsg.message,
        pollUpdates: update.update.pollUpdates
      });

      const selected = votes.find(v => v.voters.length > 0);
      if (!selected) continue;

      const sectionName = selected.name;
      const { menuPollSections } = await import('./plugins/menu.js');
      const sectionFn = menuPollSections[sectionName];
      if (!sectionFn) continue;

      const text = sectionFn(meta.prefix);
      await conn.sendMessage(meta.chat, {
        text,
        contextInfo: {
          externalAdReply: {
            showAdAttribution: true,
            mediaType: 'IMAGE',
            title: sectionName,
            body: global.wm,
            thumbnail: global.imagen4,
            sourceUrl: global.md
          }
        }
      });
    } catch (e) {
      console.error('[POLL VOTE ERROR]', e.message);
    }
  }
});

// ====== PLUGINS ======
const pluginFolder = global.__dirname(join(__dirname, './plugins/index'));
const excludedPlugins = new Set([
  
  'جمال.js',
  
]);
const pluginFilter = (filename) => /\.js$/.test(filename) && !excludedPlugins.has(filename);
global.plugins = {};

async function filesInit() {
  const files = readdirSync(pluginFolder).filter(pluginFilter);
  await Promise.all(files.map(async (filename) => {
    try {
      const file = global.__filename(join(pluginFolder, filename));
      const module = await import(file);
      global.plugins[filename] = module.default || module;
    } catch (e) {
      console.error('[PLUGIN ERROR]', filename, e.message);
    }
  }));
  console.log(chalk.green(`[PLUGINS] Loaded ${Object.keys(global.plugins).length} plugins`));
}

await filesInit();

setInterval(async () => {
  await global.saveDatabase().catch(console.error);
}, 30000);

process.on('SIGTERM', async () => {
  await global.saveDatabase().catch(console.error);
  process.exit(0);
});

process.on('SIGINT', async () => {
  await global.saveDatabase().catch(console.error);
  process.exit(0);
});

// ====== AUTO CLEAN TMP ======
setInterval(() => {
  if (stopped === 'close') return;
  if (global.menuPolls) {
    const now = Date.now();
    for (const [id, meta] of global.menuPolls) {
      if (now > meta.expires) global.menuPolls.delete(id);
    }
  }
}, 300000);

// ====== QUICK TEST ======
async function _quickTest() {
  const test = await Promise.all([
    spawn('ffmpeg'),
    spawn('ffprobe')
  ].map((p) => {
    return new Promise((resolve) => {
      p.on('close', (code) => resolve(code !== 127));
      p.on('error', () => resolve(false));
    });
  }));

  global.support = {
    ffmpeg: test[0],
    ffprobe: test[1]
  };
}

_quickTest().catch(console.error);
