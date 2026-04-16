import './config.js';
import './api.js';
import { createRequire } from 'module';
import path, { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { platform } from 'process';
import * as ws from 'ws';
import { readdirSync } from 'fs';
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
  makeCacheableSignalKeyStore
} = await import('@whiskeysockets/baileys');

const { chain } = lodash;
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000;

// نسخة ثابتة بدل fetchLatestBaileysVersion
const version = [2, 2413, 1];

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

  browser: ['Zeref', 'Safari', '1.0.0'],
  version
};

// ====== CONNECT ======
global.conn = makeWASocket(connectionOptions);
conn.isInit = false;

let stopped = false;

conn.logger.info(`Ƈᴀʀɢᴀɴᴅᴏ．．．\n`);

// ====== CONNECTION HANDLER ======
async function connectionUpdate(update) {
  const { connection, lastDisconnect, qr } = update;
  stopped = connection;

  if (qr) {
    console.log('📲 امسح هذا الكود بالواتساب:', qr);
  }

  let reason = new Boom(lastDisconnect?.error)?.output?.statusCode;

  if (connection === 'open') {
    console.log(chalk.green('تم الاتصال بنجاح ✅'));
  }

  if (connection === 'close') {
    switch (reason) {
      case DisconnectReason.badSession:
        console.log('احذف مجلد الجلسة وامسح QR من جديد');
        break;

      case DisconnectReason.connectionClosed:
      case DisconnectReason.connectionLost:
      case DisconnectReason.timedOut:
        console.log('إعادة الاتصال...');
        process.exit();
        break;

      case DisconnectReason.loggedOut:
        console.log('تم تسجيل الخروج - احذف الجلسة');
        break;

      default:
        console.log(`سبب غير معروف: ${reason}`);
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
