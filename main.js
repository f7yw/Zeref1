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
    if (reason === DisconnectReason.loggedOut) {
      await clearSessionAndRestart('❌ Session logged out. Clearing data...')
    } else if (reason === DisconnectReason.restartRequired) {
      console.log(chalk.cyan('🔄 Restart required. Reconnecting...'))
      restartBot(2000)
    } else if (reason === DisconnectReason.timedOut) {
      console.log(chalk.red('⏰ Connection timed out. Retrying...'))
      restartBot(3000)
    } else if (reason === DisconnectReason.connectionLost) {
      console.log(chalk.red('📡 Connection lost. Reconnecting...'))
      restartBot(3000)
    } else if (reason === DisconnectReason.connectionClosed) {
      console.log(chalk.red('🔌 Connection closed. Reconnecting...'))
      restartBot(3000)
    } else if (reason === DisconnectReason.connectionReplaced) {
      console.log(chalk.yellow('🔄 Connection replaced. Please check if another instance is running.'))
    } else {
      console.log(chalk.red(`❓ Connection closed with unknown reason: ${reason}`))
      restartBot(5000)
    }
  }
}

conn.ev.on('connection.update', connectionUpdate)
conn.ev.on('creds.update', saveCreds)

// ====== MESSAGE HANDLER ======
conn.ev.on('messages.upsert', async (chatUpdate) => {
  try {
    const m = chatUpdate.messages[0]
    if (!m) return
    if (m.message?.viewOnceMessageV2) m.message = m.message.viewOnceMessageV2.message
    if (m.message?.documentWithCaptionMessage) m.message = m.message.documentWithCaptionMessage.message
    if (m.message?.viewOnceMessageV2Extension) m.message = m.message.viewOnceMessageV2Extension.message
    if (!m.message) return
    
    const { handler } = await import('./handler.js')
    await handler.call(conn, chatUpdate)
  } catch (e) {
    console.error(chalk.red('[MESSAGE HANDLER ERROR]'), e)
  }
})

// ====== AUTO SAVE ======
setInterval(async () => {
  if (global.db?.data) await global.saveDatabase()
}, 30 * 1000)

// ====== CLEANUP ON EXIT ======
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n[EXIT] Shutting down...'))
  await global.saveDatabase()
  process.exit(0)
})

export default conn;
