# Zeref - SHADOW WhatsApp Bot

## Overview
A comprehensive, multi-functional WhatsApp bot built with Node.js. Features AI responses (ChatGPT), entertainment (anime, games, media), global auto-translation, utility tools, an economy/RPG system, group admin controls, security controls, and owner controls. Commands are fully in Arabic.

## Owner / Config
- **Owner number:** 967778088098 (single owner, set in `config.js`)
- **GitHub:** https://github.com/farisatif
- **Bot name:** 彡ℤ𝕖𝕣𝕖𝕗 / SHADOW Bot
- **Prefix:** `.` (and others defined in `global.prefix` regex)

## Tech Stack
- **Runtime:** Node.js (ES Modules)
- **WhatsApp:** `@whiskeysockets/baileys` for WhatsApp Web API
- **Database:** Lowdb JSON storage via `database.json`, auto-saved every 30 seconds and on shutdown
- **Server:** Express on port 3000
- **Key Libraries:** axios, fluent-ffmpeg, jimp, openai, cfonts, chalk, pino, @vitalets/google-translate-api

## Architecture
- **`index.js`** - Entry point; manages cluster, checks internet, starts Express server on port 3000
- **`main.js`** - Core engine; initializes WhatsApp connection, loads/saves database, binds message/group events, imports plugins
- **`handler.js`** - Central message processor; routes commands to plugins, manages XP/money, blocks commands when chat bot status is off
- **`config.js`** - Global configuration: owner numbers, bot name, images, GitHub link, settings
- **`plugins/`** - Modular plugin files for each feature
- **`lib/`** - Shared utilities
- **`Zeref/`** - WhatsApp session credentials

## Configuration
- Owner and GitHub set in `config.js` using `global.owner`, `global.nomorown`, `global.md`
- Phone number for pairing comes from `PHONE_NUMBER` environment variable
- Bot uses pairing code authentication

## Menus
WhatsApp native buttons, list messages, and poll-style menus can be unreliable for unofficial clients, so the bot uses plain numbered menu sections only:
- `plugins/menu.js` sends stats, numbered menu sections, and a full-command option
- `plugins/menu-response.js` accepts numeric replies `1` through `10`

## Running
- Workflow: `node index.js` on port 3000
- Bot auto-reconnects on disconnect using `process.exit()` triggers

## Key Bugs Fixed / Recent Changes
- Removed group-response blocking from the handler.
- Fixed direct bank commands (`.ايداع 500`, `.سحب 500`, `.تحويل @شخص 500`).
- Removed duplicate bank commands from legacy `plugins/1.js`; `plugins/البنك.js` is the single active bank.
- Replaced interactive button/poll menu with plain numbered divisions.
- Added explicit quiz answer format: `.جواب <رمز السؤال> <الإجابة>`.
- Added `.الجواب` to reveal the current active question/challenge answer with the question text.
- Added chess (`.شطرنج`) and quick games (`.نرد`, `.عملة`, `.اختار`, `.حجر`).
- Disabled old per-message translation commands (`.ترجم`) and added global auto-translation: `.مترجم تشغيل ar`, `.مترجم ايقاف`, `.لغة ar`.
- Added group admin commands: group name/description, add/kick, promote/demote, open/close, hidden/visible mentions.
- Added profile command (`.بروفايل`).
- Added bot status controls (`.حالة_البوت`, `.تشغيل`, `.ايقاف`, `.عام`, `.خاص`, `.قراءة تشغيل/ايقاف`).
- Added anti-link security controls (`.الحماية تشغيل/ايقاف`).
- Added database auto-save so user data persists across bot stops.

## Economy System
### Currencies
- **money** — wallet coins, starts at 100
- **bank** — bank savings, starts at 0
- **diamond** — rare premium currency
- **exp** — XP for leveling

### Commands
| Command | Function |
|---------|----------|
| `.بنك` / `.البنك` | Full bank stats |
| `.ايداع <مبلغ>` | Deposit coins |
| `.سحب <مبلغ>` | Withdraw coins |
| `.تحويل @شخص <مبلغ>` | Transfer coins with fee |
| `.عمل` | Work for coins |
| `.يومي` | Daily reward |
| `.طاقة` | Energy status |
| `.سوال` | Quiz |
| `.جواب <رمز> <إجابة>` | Answer active quiz/challenge |
| `.الجواب` | Show current answer |
| `.تحدي [1-4]` | Math challenge |
| `.رهان <مبلغ>` | Slot machine |

## Menu Sections
1. 📖 القرآن الكريم — أذكار، آيات، قرآن
2. 🤖 الذكاء الاصطناعي — AI/ChatGPT
3. 🎮 الألعاب — سؤال، جواب، تحدي، شطرنج، نرد، عملة، اختار، حجر، رهان، اكس او
4. 😄 ترفيه — ذكاء، جمال، حظ، ألعاب سريعة، اقتباسات، حكم
5. 🛠️ الأدوات — مترجم عام، تذكير، منبه، QR، اختفاء
6. 💰 الاقتصاد — بنك، ايداع، سحب، تحويل، عمل، يومي، طاقة
7. 📊 المعلومات — بروفايل، حالة البوت، توقيت، بلاغ، المالك
8. 👥 إدارة القروب — اسم/وصف القروب، طرد، إضافة، رفع/خفض مشرف، قفل/فتح، منشن مخفي/ظاهر، حماية
9. 👑 أوامر المالك — صلاحيات كاملة
10. 📜 كل الأوامر — يجمع جميع الأقسام في رسالة واحدة
