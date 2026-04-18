# Zeref - SHADOW WhatsApp Bot

## Overview
Arabic WhatsApp bot built with Node.js and Baileys. The bot is focused on useful group/community features: study support, games, economy, group administration, media downloads, productivity tools, analytics, safety/privacy, developer helpers, wellness prompts, global auto-translation, profile/status tools, and preserved automatic chat responses.

## Owner / Config
- **Owner number:** 967778088098
- **GitHub:** https://github.com/farisatif
- **Bot name:** 彡ℤ𝕖𝕣𝕖𝕗 / SHADOW Bot
- **Prefix:** `.` and other prefixes from `global.prefix`

## Tech Stack
- **Runtime:** Node.js ES Modules
- **WhatsApp:** `@whiskeysockets/baileys`
- **Database:** Lowdb JSON in `database.json`, auto-saved every 30 seconds, after handled messages, and on shutdown/disconnect
- **Server:** Express on port 3000

## Architecture
- `index.js` starts the app and Express server.
- `main.js` initializes WhatsApp, loads database, binds message/group events, and loads plugins.
- `handler.js` routes commands, applies permissions, XP/money, and bot status gating.
- `plugins/menu.js` contains the numbered menu sections.
- `plugins/general-sections.js` contains productivity, analytics, safety, developer, media helper, and wellness commands.
- `plugins/study.js` contains student learning commands.
- `plugins/study-games.js` contains lightweight educational games.
- `plugins/شات.js` preserves automatic chat responses.

## Economy System
- `lib/economy.js` — central: `isVip()`, `logTransaction()`, `syncVipResources()`, `initEconomy()`, `fmt()` (∞ for VIP), `fmtEnergy()`, `syncEnergy()`, `deductEnergy()`, `getRole()`
- `lib/userInit.js` — `initUser(user, name, jid)` with VIP sync on init
- Every earn/spend calls `logTransaction(user, 'earn'|'spend', amount, reason)` — 30 per user stored in DB
- VIP users: `user.infiniteResources = true`, money = 2B, bank = 2B, diamond = 999, energy always 100 — all in DB
- Premium stored in DB: `user.premium = true`, `user.premiumTime = Date.now() + 10years` — survives restarts
- `plugins/owner-addprem.js` sets DB fields + global.prems

## Plugins (key)
- `plugins/يومي.js` — daily reward, requires registration, logs transaction
- `plugins/عمل.js` — work reward, requires registration, logs transaction
- `plugins/البنك.js` — bank view/deposit/withdraw/transfer, logs all, ∞ display for VIP
- `plugins/معاملاتي.js` — NEW: `.معاملاتي` shows last 20 transactions with earn/spend summary
- `plugins/تسجيل.js` — registration with welcome bonus
- `plugins/شطرنج.js` — chess with chess.com Neo-style pieces (bold, geometric, thicker outlines)
- `plugins/شات.js` — 154 auto-response patterns, 500+ response strings, full Arabic coverage

## Handler Features
- Level-up notification: **SILENT** — level stored in DB, shown in `.بروفايل` only; bonuses still granted (200×level coins, +30 energy, +1 diamond every 5 levels)
- Registration gate: `handler.register = true` on يومي + عمل blocks unregistered users with proper Arabic prompt
- Temp ban check: users with `user.tempBannedUntil > Date.now()` are blocked from all commands with time remaining message
- Response delay: 400–1000ms random realistic delay before responding to commands
- Startup log: sent to all developer-flagged owners (5s after connect) with plugin list, DB stats, and memory usage

## Security & Safety Features
- `plugins/offensive-words.js` — auto-block offensive Arabic/English words with 3-warning system and 30-minute temp ban
- `plugins/db-clear.js` — `.مسح_المستخدمين`, `.مسح_المحادثات`, `.مسح_الكل` commands that preserve blocked/premium users
- `plugins/صورة-القروب.js` — get and set group profile picture
- `plugins/مغادرة.js` — users can delete their own registration data

## Questions System
- `src/game/acertijo.json` — original trivia questions (anime, general knowledge)
- `src/game/it_questions.json` — 350+ IT/Computer Science questions (Arabic) covering: programming, networking, security, cloud, DevOps, AI/ML, databases, algorithms, OS, web dev
- `plugins/سوال.js` — loads BOTH question banks and picks randomly

## Join Request System
- `plugins/group-request.js` — request/accept/reject workflow for joining groups
- `plugins/owner-join.js` — instant join for developer/owner/premium; approval flow for regular users

## Current Focus
The bot is a professional Arabic WhatsApp assistant with economy, games, auto-responses, admin tools, and media features.

## Menu Sections
1. 🎓 التعلم والدراسة — plans, summaries, flashcards, quizzes, GPA, study rules, Pomodoro, sources, daily schedule
2. 📖 القرآن الكريم — adhkar and Quran commands
3. 🤖 الذكاء الاصطناعي — AI chat/image quality where configured
4. 🎮 الألعاب — quiz, math, chess, tic-tac-toe, dice, coin, RPS, educational games
5. 🛠️ أدوات نافعة — global translator, reminders, alarm, QR
6. 💰 الاقتصاد — bank, deposit, withdraw, transfer, work, daily reward, energy
7. 👤 الحساب والمعلومات — profile with picture and full saved information, bot status, time, report, owner
8. 🎧 الوسائط والتحميل — songs as audio/video, YouTube search, video download
9. 📌 الإنتاجية والتنظيم — tasks and notes
10. 📊 التحليل والإحصاءات — user stats, leaderboard, group activity, plugin usage
11. 🛡️ السلامة والخصوصية — link checks, privacy tips, group safety rules
12. 💻 البرمجة والمطور — code formatting, JSON formatting, regex testing
13. 🌱 الصحة والعادات — water, breathing, and smart break prompts
14. 👥 إدارة القروب — name/description, kick/add, promote/demote, lock/open, mentions, anti-link
15. 👑 أوامر المالك — bot control and moderation
16. 📜 كل الأقسام — combined section view

## Study Commands
- `.تعلم` — shows the study section help
- `.خطة رياضيات 7` — study plan by subject and days
- `.تلخيص <نص>` — quick local summary
- `.بطاقات <نص>` — flashcards from notes
- `.اختبرني فيزياء` — quick self-test question
- `.معدلي 90 85 77` — approximate average/grade
- `.قاعدة` — useful study rule
- `.بومودورو` — focus method
- `.مصادر` — recommended study resources
- `.جدول` — short daily study schedule

## Educational Games
- `.كلمة` / `.رتب` — arrange a study-related word
- `.سرعة` / `.حساب_سريع` — quick arithmetic
- `.ذاكرة` — memory number challenge
- `.حل <الإجابة>` — answer educational games

## Important Fixes
- Menu supports English, Arabic, and Persian numerals.
- Bot admin detection supports newer WhatsApp JID/LID participant formats.
- Promote/demote group update parsing avoids `@undefined` and crash cases.
- Bot ignores its own sent messages before plugin processing to prevent reply loops.
- Owner/mod/admin/bot matching is more tolerant of decoded JIDs, LID participant IDs, phoneNumber fields, and number formats.
- Profile command safely handles missing names and now sends profile picture plus full stored account/economy information.
- Group message tracking stores total messages per user and per-group counts; `.رسائلي`, `.رسائل @عضو`, and `.ترتيب_الرسائل` display the tracker.
- Main command list sends with the bot menu image.
- Database writes are triggered after message handling and before reconnect/exit to reduce data loss on restart.
- Song command supports explicit audio/video choice: `.اغنيه صوت ...`, `.اغنيه فيديو ...`, `.فيديو ...`.
- Legacy `.ترجم` plugins are disabled; global translator remains active.
- Duplicate bank commands are removed from active use; `plugins/البنك.js` is the main bank.
