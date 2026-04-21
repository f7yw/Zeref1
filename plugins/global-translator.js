import { isVip } from '../lib/economy.js'
import translate from '@vitalets/google-translate-api'
import { typingDelay } from '../lib/presence.js'

const LANG_MAP = {
  ar: 'عربي', en: 'إنجليزي', fr: 'فرنسي', tr: 'تركي',
  es: 'إسباني', de: 'ألماني', zh: 'صيني', ru: 'روسي',
  ja: 'ياباني', ko: 'كوري', it: 'إيطالي', pt: 'برتغالي',
  fa: 'فارسي', hi: 'هندي', ur: 'أردو', id: 'إندونيسي'
}

const VALID_LANGS = new Set(Object.keys(LANG_MAP))

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  const chat = global.db.data.chats[m.chat] || {}
  if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = chat

  const sub = (args[0] || '').trim().toLowerCase()

  if (sub === 'تشغيل' || sub === 'on') {
    const lang = (args[1] || '').trim().toLowerCase()
    if (!VALID_LANGS.has(lang)) {
      return m.reply(
        `❌ *اللغة غير صحيحة*\n\n` +
        `📌 *مثال:* ${usedPrefix}مترجم تشغيل ar\n\n` +
        `🌐 *اللغات المتاحة:*\n` +
        Object.entries(LANG_MAP).map(([k, v]) => `• ${k} — ${v}`).join('\n')
      )
    }
    chat.globalTranslate = { enabled: true, to: lang }
    return m.reply(`✅ *تم تفعيل الترجمة التلقائية*\n🌍 سيتم ترجمة الرسائل إلى *${LANG_MAP[lang]}* (${lang})\n👤 العضوية: ${vipStatus}`)
  }

  if (sub === 'ايقاف' || sub === 'إيقاف' || sub === 'off') {
    chat.globalTranslate = { enabled: false, to: 'ar' }
    return m.reply(`✅ *تم إيقاف الترجمة التلقائية*\n👤 العضوية: ${vipStatus}`)
  }

  const status = chat.globalTranslate?.enabled
    ? `✅ مفعلة → *${LANG_MAP[chat.globalTranslate.to] || chat.globalTranslate.to}* (${chat.globalTranslate.to})`
    : `❌ متوقفة`

  await m.reply(
    `╭────『 🌍 المترجم التلقائي 』────\n` +
    `│\n` +
    `│ 📡 *الحالة:* ${status}\n` +
    `│\n` +
    `│ 📌 *لتفعيل:*\n` +
    `│ ${usedPrefix}مترجم تشغيل ar\n` +
    `│ ${usedPrefix}مترجم تشغيل en\n` +
    `│\n` +
    `│ 🔕 *لإيقاف:*\n` +
    `│ ${usedPrefix}مترجم ايقاف\n` +
    `│\n` +
    `╰──────────────────────`
  )
}

handler.command = /^(مترجم|translator)$/i
handler.exp = 0
handler.fail = null

handler.before = async (m, { conn }) => {
  if (!m.text || !m.text.trim()) return false
  if (!global.db.data.chats) return false

  // Skip bot commands — don't translate prefixed messages
  if (global.prefix && global.prefix.test(m.text)) return false

  const chat = global.db.data.chats[m.chat] || {}
  if (!chat.globalTranslate?.enabled) return false

  const lang = chat.globalTranslate.to
  if (!VALID_LANGS.has(lang)) return false

  try {
    const text = m.text.trim()
    if (text.length < 2) return false

    const result = await translate(text, { to: lang })
    const translated = result?.text || ''

    if (translated && translated !== text) {
      const langName = LANG_MAP[lang] || lang
      await conn.sendMessage(
        m.chat,
        { text: `🌍 *ترجمة تلقائية إلى ${langName}:*\n${translated}\n👤 العضوية: ${vipStatus}` },
        { quoted: m }
      )
    }
  } catch (e) {
    console.error('[GLOBAL-TR]', e?.message || e)
  }

  return false
}

export default handler
