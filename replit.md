# Zeref - SHADOW WhatsApp Bot

## Overview
A comprehensive, multi-functional WhatsApp bot built with Node.js. Features AI responses (OpenAI/ChatGPT), entertainment (anime, games, media downloading), utility tools (image/video editing, translations, reminders), an economy/RPG system, and owner/admin controls.

## Tech Stack
- **Runtime:** Node.js (ES Modules)
- **WhatsApp:** `@whiskeysockets/baileys` for WhatsApp Web API
- **Database:** Lowdb (JSON-based local storage via `database.json`) + optional MongoDB via `lib/mongoDB.js`
- **Server:** Express on port 3000 (keeps bot alive on hosting platforms)
- **Key Libraries:** axios, fluent-ffmpeg, jimp, openai, cfonts, chalk, pino

## Architecture
- **`index.js`** - Entry point; manages cluster, checks internet, starts Express server on port 3000
- **`main.js`** - Core engine; initializes WhatsApp connection (Baileys), loads database, imports plugins
- **`handler.js`** - Central message processor; routes commands to plugins, manages XP/money
- **`config.js`** - Global configuration: owner numbers, bot name, images, settings
- **`plugins/`** - Modular plugin files for each feature (ai.js, anime.js, etc.)
- **`lib/`** - Shared utility functions, database adapters, scrapers, media converters
- **`src/`** - Static assets: JSON data, fonts, images
- **`views/`** - Basic HTML/CSS for a web landing page/status monitor
- **`Zeref/`** - WhatsApp session credentials (creds.json)

## Configuration
- Owner numbers and bot settings in `config.js`
- Phone number for pairing is hardcoded in `main.js` (line 126): `967782114485`
- Bot uses pairing code authentication (no QR scan needed)

## Running
- Workflow: `node index.js` on port 3000 (console output type)
- Bot auto-restarts on connection loss via cluster module

## Authentication
On first run (or if session is cleared), the bot generates a pairing code for the configured phone number. Enter this code in WhatsApp > Linked Devices > Link a Device > Link with phone number.
