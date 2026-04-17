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
  fetchLatestBaileysVersion
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
const connectionOptions = {
  connectTimeoutMs: 60000,
  keepAliveIntervalMs: 10000,

  logger: pino({ level: 'silent' }),

  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
  },

  browser: ["Ubuntu", "Chrome", "20.0.04"],
  version,
  syncFullHistory: false,
  markOnlineOnConnect: true,
  generateHighQualityLinkPreview: true,
  getMessage: async (key) => {
    if (store) {
        const msg = await store.loadMessage(key.remoteJid, key.id)
        return msg?.message || undefined
    }
    return {
        conversation: 'Zeref-Bot is here!'
    }
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
      let code = await conn.requestPairingCode(phoneNumber);
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
  const { connection, lastDisconnect, qr } = update;
  stopped = connection;

  if (qr && !conn.authState.creds.registered) {
    console.log(chalk.yellow('📲 QR code received — use the pairing code above instead.'));
  }

  const errorData = lastDisconnect?.error;
  let reason = new Boom(errorData)?.output?.statusCode;

  console.log(chalk.gray(`[CONNECTION] Status update → connection="${connection || 'none'}", reason code=${reason || 'none'}`));

  if (connection === 'open') {
    console.log(chalk.green.bold('\n✅ Connected to WhatsApp successfully!'));
    console.log(chalk.green(`  ➤ Bot is active and listening for messages.`));
  }

  if (connection === 'close') {
    console.log(chalk.red.bold('\n⚠️  Connection closed. Diagnosing reason...'));

    if (errorData) {
      console.log(chalk.red(`  ➤ Raw error  : ${errorData?.message || String(errorData)}`));
      console.log(chalk.red(`  ➤ Status code: ${reason || 'unknown'}`));
    }

    switch (reason) {
      case DisconnectReason.badSession:
        console.log(chalk.red('  ➤ Reason: BAD SESSION — the saved session is corrupted or rejected.'));
        console.log(chalk.yellow('  ➤ Action: Clearing session files and restarting...'));
        try {
          if (existsSync(`./${global.authFile}`)) {
            rmSync(`./${global.authFile}`, { recursive: true, force: true });
            console.log(chalk.yellow('  ➤ Session folder deleted. Restart the bot to re-pair.'));
          }
        } catch (err) {
          console.log(chalk.red('  ➤ Could not delete session folder:'), err.message);
        }
        process.exit(1);

      case DisconnectReason.connectionClosed:
        console.log(chalk.yellow('  ➤ Reason: CONNECTION CLOSED by server. Restarting...'));
        process.exit();
        break;

      case DisconnectReason.connectionLost:
        console.log(chalk.yellow('  ➤ Reason: CONNECTION LOST (network issue). Restarting...'));
        process.exit();
        break;

      case DisconnectReason.timedOut:
        console.log(chalk.yellow('  ➤ Reason: TIMED OUT waiting for server response. Restarting...'));
        process.exit();
        break;

      case DisconnectReason.loggedOut:
        console.log(chalk.red('  ➤ Reason: LOGGED OUT — the device was removed from WhatsApp Linked Devices.'));
        console.log(chalk.yellow('  ➤ Action: Clearing session and exiting. Restart the bot to re-pair.'));
        try {
          if (existsSync(`./${global.authFile}`)) {
            rmSync(`./${global.authFile}`, { recursive: true, force: true });
            console.log(chalk.yellow('  ➤ Session folder deleted successfully.'));
          }
        } catch (err) {
          console.log(chalk.red('  ➤ Could not delete session folder:'), err.message);
        }
        process.exit(1);

      case DisconnectReason.restartRequired:
        console.log(chalk.yellow('  ➤ Reason: RESTART REQUIRED by server. Restarting...'));
        process.exit();
        break;

      case DisconnectReason.multideviceMismatch:
        console.log(chalk.red('  ➤ Reason: MULTIDEVICE MISMATCH — session conflict detected.'));
        console.log(chalk.yellow('  ➤ Action: Clearing session and restarting...'));
        try {
          if (existsSync(`./${global.authFile}`)) {
            rmSync(`./${global.authFile}`, { recursive: true, force: true });
          }
        } catch (_) {}
        process.exit(1);

      default:
        console.log(chalk.red(`  ➤ Reason: UNKNOWN (code ${reason}). Restarting in 5 seconds...`));
        setTimeout(() => process.exit(), 5000);
    }
  }
}

// ====== HANDLER ======
let handler = await import('./handler.js');

conn.handler = handler.handler.bind(conn);
conn.connectionUpdate = connectionUpdate.bind(conn);
conn.credsUpdate = saveCreds.bind(conn);

// ====== EVENTS ======
conn.ev.on('messages.upsert', conn.handler);
conn.ev.on('connection.update', conn.connectionUpdate);
conn.ev.on('creds.update', conn.credsUpdate);

// ====== PLUGINS ======
const pluginFolder = global.__dirname(join(__dirname, './plugins/index'));
const pluginFilter = (filename) => /\.js$/.test(filename);
global.plugins = {};

async function filesInit() {
  for (const filename of readdirSync(pluginFolder).filter(pluginFilter)) {
    try {
      const file = global.__filename(join(pluginFolder, filename));
      const module = await import(file);
      global.plugins[filename] = module.default || module;
    } catch (e) {
      console.error(e);
    }
  }
}

await filesInit();

// ====== AUTO CLEAN TMP ======
setInterval(() => {
  if (stopped === 'close') return;
  console.log('Auto clean running...');
}, 1800000);

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
