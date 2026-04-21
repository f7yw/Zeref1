# Zeref - SHADOW WhatsApp Bot

## Overview
Arabic WhatsApp bot built with Node.js and Baileys. Focused on: study support, economy, games, group administration, media downloads, productivity tools, analytics, safety, auto-translation, and Islamic content.

## Owner / Config
- **Owner number:** 967778088098
- **Bot number:** 967782114485
- **Bot name:** SHADOW - Bot
- **Prefix:** `.` (and Arabic variations via global.prefix)

## Tech Stack
- **Runtime:** Node.js ES Modules
- **WhatsApp:** `@whiskeysockets/baileys`
- **Database:** Supabase PostgreSQL (primary) + local JSON fallback — auto-upserted after every change and every 30s
- **Server:** Express on port 3000

## Architecture
- `index.js` — starts app and Express server
- `main.js` — initializes WhatsApp, loads DB, binds events, loads plugins
- `handler.js` — command routing, permissions, XP/money, bot status gating
- `plugins/menu.js` — numbered menu sections with `normalizeChoice()` (supports Arabic/Persian numerals)
- `plugins/general-sections.js` — productivity, analytics, safety, developer, media helper, wellness
- `plugins/advanced-stats.js` — new: balance report, VIP review, group/user stats, error log, backup
- `plugins/media-tools.js` — new: link info, audio/video extract, OCR, format convert, image search

## Economy System (Single Source of Truth)
- **`lib/economy.js`** — `initEconomy()`, `isVip()`, `logTransaction()`, `syncVipResources()`, `fmt()`, `fmtEnergy()`, `syncEnergy()`, `deductEnergy()`, `getRole()`, `MAX_ENERGY`, `FEES`
- **`lib/userInit.js`** — `initUser(user, name, jid?)` — calls `initEconomy` + optional VIP sync
- All financial changes MUST call `logTransaction(user, 'earn'|'spend', amount, reason)` — 30 per user stored in DB

### Economy Fields (canonical)
| Field | Default | Description |
|-------|---------|-------------|
| `money` | 0 | Wallet balance |
| `bank` | 0 | Bank balance |
| `energy` | 100 | Energy (max 100) |
| `diamond` | 0 | Diamond count |
| `premium` | false | VIP status flag |
| `premiumTime` | 0 | VIP expiry (ms timestamp) |
| `infiniteResources` | false | Bypasses energy checks |
| `transactions` | [] | Last 30 transaction records |
| `totalEarned` | 0 | Cumulative earned |
| `totalSpent` | 0 | Cumulative spent |

### VIP / Premium Rules
- `premium = true` → status flag only
- `premiumTime = Date.now() + 10years` → expiry
- `infiniteResources = true` → bypasses energy consumption in commands
- **Does NOT inflate money/bank to fake 2B** — VIP users have REAL balances
- Welcome bonus on addprem: +50,000 🪙, +10,000 bank, +50 💎
- `syncVipResources()` — syncs flags only, no money inflation
- `plugins/owner-addprem.js` — sets DB fields + global.prems, gives modest bonus
- `plugins/مغادرة.js` — when user unregisters: resets ALL fields including money/bank/diamond

## Shop System
- `plugins/شراء الماس.js` — buy diamonds with coins: 1💎 = 1,000🪙
- `plugins/شراء عملات.js` — sell diamonds for coins: 1💎 = 800🪙
- Both use `initEconomy()` and `logTransaction()`

## New Commands Added
### Advanced Stats (`plugins/advanced-stats.js`)
- `.تقرير_المال` — detailed financial report with last 5 transactions
- `.مراجعة_البريم` — VIP status, expiry, real balance
- `.احصائيات_القروب` — group member count, admins, top 5 active, settings
- `.احصائياتي_مفصل` — full user stats (level, XP, messages, economy)
- `.اخطاء` — owner: shows recent bot errors (tracked in `global._recentErrors`)
- `.نسخة_احتياطية` — owner: sends DB as JSON document to WhatsApp

### Media Tools (`plugins/media-tools.js`)
- `.معلومات_رابط <url>` — detect platform, safety check
- `.تحميل_صوت <url>` — extract audio (uses lib/ytdlp.js or lib/y2mate.js)
- `.تحميل_فيديو <url>` — download video
- `.ocr` — extract text from image (requires tesseract.js)
- `.تحويل_صيغة` — image→sticker, video→audio conversion
- `.بحث_صورة <كلمة>` — image search via Unsplash

## Level System (`plugins/لفل.js`)
- Fixed: `conn.getName` now properly awaited
- Fixed: `initUser` + `initEconomy` called before accessing user fields
- `getRole(level)` computed inline — no undefined `user.role` reference
- Bonus: +1 diamond every 5 levels on level-up

## Bet System (`plugins/رهان.js`)
- Bet deducted FIRST from wallet before any calculation
- Prize added ONLY on win (partial or jackpot)
- All outcomes logged with `logTransaction`
- Import fixed: `logTransaction` added to import

## Bug Fixes Applied (Audit)
1. `رهان.js` — missing `logTransaction` import (CRITICAL — was using undefined function)
2. `رهان.js` — bet inflation exploit fixed (deduct before calculate)
3. `لفل.js` — `conn.getName` not awaited (crash on slow connections)
4. `لفل.js` — `user.role` undefined (not in schema) → replaced with `getRole(level)`
5. `لفل.js` — no `initUser`/`initEconomy` before field access
6. `شراء الماس.js` — completely rewritten (was just balance display, Spanish commands)
7. `شراء عملات.js` — completely rewritten (was spending XP for `limit` tokens, broken)
8. `owner-addprem.js` — removed 2B money/bank inflation → now gives modest welcome bonus
9. `lib/economy.js syncVipResources` — removed 2B inflation, flags only
10. `lib/economy.js fmt()` — removed `user.infiniteResources` → "∞" display (real balance now shown)
11. `البنك.js` — removed `fmt(user.money, user)` second arg (no longer needed)
12. `مغادرة.js` — unregister now resets money/bank/diamond/energy/transactions
13. `سوال.js` + `جواب.js` + `تحدي.js` — `logTransaction` added to all reward paths
14. `global-translator.js` — fixed: skips command messages (prefix check)
15. `tr.js` — fixed redirect when Arabic translator command used instead of مترجم
16. Menu — shop descriptions updated to match new شراء_الماس / شراء_عملات logic

## Plugins (127 total, as of last audit)
- **Games:** شطرنج, اكس/اكس1, سوال, تحدي, رهان, فزوره, خمن, تخمين, حجره, لو, لو2, حظ, رياضيات, جواب, علم/علم1/علم2, العاب3, العاب-سريعة
- **Economy:** البنك, عمل, يومي, طاقة, معاملاتي, شراء الماس, شراء عملات, لفل
- **Media:** اغنيه, بنترست, تحميل, mp3, hd, media-tools
- **Islamic:** قران, آية الكرسي, اذكار الصباح, اذكار المساء, حديث
- **Group:** group-admin, group-request, ايقافوتشغيل, فتح_اغلاق, صورة-القروب
- **Owner:** owner-addprem, owner-banlist, owner-banuser, owner-block-unblock, owner-blocklist, owner-join, owner-listprem, db-clear, owner-panel, مغادرة
- **Utility:** global-translator, tr/tr2, general-sections, advanced-stats, reminder, منبه, study, study-games, offensive-words, security, bot-status, شات, profile, تسجيل, بلاغ, menu

## LID JID Handling (Multi-Device WhatsApp)
- `global.lidPhoneMap` is populated in `handler.js` on every group message
- LID JIDs (`158884446605486@lid`) are resolved to phone JIDs before owner/VIP checks
- `isVip()` in `economy.js` resolves LID → phone via `global.lidPhoneMap` before comparing
- Owner (`967778088098`) is correctly recognized even when sending from LID JID
- `global.mods` only contains `967778088098` (removed stale LID entry)

## Owner Admin Panel (`plugins/owner-panel.js`)
All commands restricted to `rowner = true` (real owner only — 967778088098).
- `.لوحة_التحكم` — full help for all admin commands
- `.عرض_مستخدم @` — view full user data (level, XP, money, bank, diamonds, VIP, banned)
- `.قائمة_المستخدمين` — list all users in DB (up to 30)
- `.اضافة_مال @ 1000` — add coins to wallet
- `.اضافة_بنك @ 1000` — add coins to bank
- `.اضافة_ماس @ 10` — add diamonds
- `.تعديل_مال @ 5000` — set wallet to exact amount
- `.تعديل_مستوى @ 5` — set level
- `.اعادة_ضبط @` — reset all user data to defaults
- `.حذف_مستخدم @` — permanently delete user from DB
- `.حذف_بريم @` — revoke VIP membership
- `.حالة_السحاب` — Supabase connection status, memory, LID map count
- `.مزامنة_السحاب` — force immediate sync to Supabase
- `.تعطيل_بوت` / `.تفعيل_بوت` — toggle bot in a specific group

## Supabase DB (`lib/supabaseDB.js`)
- Writes to cloud + local JSON simultaneously on every `write()` call
- Auto-sync every 2 minutes via `_startAutoSync()` (only if `_dirty = true`)
- `markDirty()` method to flag pending changes
- `status` getter returns cloud state, last sync time, error count, user/chat counts
- Console logs: `[DB] ☁️ Data loaded from Supabase ✅` on successful read

## Handler Features
- Level-up: silent in DB, shown on `.لفل`; bonuses granted automatically
- `handler.register = true` blocks unregistered users on يومي/عمل
- Temp ban: `user.tempBannedUntil` blocks all commands with time remaining
- Response delay: 500–1200ms realistic delay per command
- Startup log: sent to all developer-flagged owners (5s after connect)
- Message tracking: `user.messages.total`, `user.messages.groups[chat]`, `chat.messageStats`

## Role Recognition & Auto-Stamp (Apr 2026)
On every incoming message, `handler.js` now:
1. **Enforces "Infinite Developer"** — for any owner/rowner sender, sets `registered=true`, `premium=true`, `premiumTime=+50y`, `infiniteResources=true`, `energy=100`, raises `money/bank/diamond/limit` to 1B/1B/1M/999K, clears `banned`/`tempBannedUntil`, sets `role='👑 مطور'`. Applied per-message (cannot be depleted).
2. **Bot-as-Merchant deepening** — for every JID variant the bot owns (via `botJidsOf`), enforces the same merchant identity (`name='زيريف ⚜️ التاجر'`, `bio`, infinite resources, level 999) every message — not just on connect.
3. **m helper props** — attaches `m.tier` ('dev'|'vip'|'normal'), `m.tierBadge`, `m.isOwnerUser`, `m.isROwnerUser`, `m.isModsUser`, `m.isVipUser` so plugins can use them directly.
4. **Auto badge stamp on ALL replies** — wraps `m.reply` and `conn.sendMessage` per-plugin-call to append role badge (`👑 مطور · ✓ مسجّل`, `💎 مميز · ...`, `👤 عادي · ...`) to text/caption when not already present. Restored in `finally` to avoid permanent mutation.
5. **Owner bypass on `plugin.register`** — owners/VIPs no longer get blocked by `plugin.register == true` even before the auto-register step settles in DB.

This means EVERY plugin (incl. obfuscated ones, owner panel, ai, شات, etc.) automatically tags its reply with the sender's tier — no per-plugin edits needed.

## Important Rules
- Never duplicate economy logic outside `lib/economy.js` and `lib/userInit.js`
- Every money/bank/energy/diamond change must call `logTransaction`
- Arabic command names must not be changed without necessity
- `premium = true` = status; real balance = always one record; `infiniteResources = true` = bypass energy checks only
