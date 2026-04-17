import translate from '@vitalets/google-translate-api'

function isCommand(text) {
  return global.prefix.test(text || '')
}

let handler = async (m, { args, command, usedPrefix }) => {
  const chat = global.db.data.chats[m.chat] || (global.db.data.chats[m.chat] = {})
  chat.globalTranslate = chat.globalTranslate || { enabled: false, to: 'ar' }
  const sub = (args[0] || '').toLowerCase()

  if (/^(لغة|lang)$/i.test(command)) {
    const lang = (args[0] || '').toLowerCase()
    if (!/^[a-z]{2}$/i.test(lang)) return m.reply(`اكتب رمز لغة صحيح:\n${usedPrefix}${command} ar`)
    chat.globalTranslate.to = lang
    return m.reply(`🌍 تم تغيير لغة الترجمة العامة إلى: *${lang}*`)
  }

  if (/^(تشغيل|on)$/i.test(sub)) {
    const lang = (args[1] || chat.globalTranslate.to || 'ar').toLowerCase()
    if (!/^[a-z]{2}$/i.test(lang)) return m.reply('رمز اللغة يجب أن يكون حرفين مثل ar أو en.')
    chat.globalTranslate.enabled = true
    chat.globalTranslate.to = lang
    return m.reply(`✅ تم تشغيل الترجمة العامة إلى: *${lang}*`)
  }

  if (/^(ايقاف|إيقاف|off)$/i.test(sub)) {
    chat.globalTranslate.enabled = false
    return m.reply('✅ تم إيقاف الترجمة العامة.')
  }

  return m.reply(`استخدم:\n${usedPrefix}${command} تشغيل ar\n${usedPrefix}${command} ايقاف\n${usedPrefix}لغة en`)
}

handler.before = async function (m) {
  if (!m.text || m.isBaileys || isCommand(m.text)) return false
  const chat = global.db.data.chats[m.chat]
  const settings = chat?.globalTranslate
  if (!settings?.enabled || !settings.to) return false
  if (m.text.length > 800) return false
  try {
    const result = await translate(m.text, { to: settings.to, autoCorrect: true })
    const translated = result?.text?.trim()
    if (!translated || translated.toLowerCase() === m.text.toLowerCase()) return false
    await this.reply(m.chat, `🌍 *ترجمة تلقائية [${settings.to}]:*\n${translated}`, m)
  } catch (_) {}
  return false
}

handler.help = ['مترجم تشغيل ar', 'مترجم ايقاف', 'لغة ar']
handler.tags = ['tools']
handler.command = /^(مترجم|ترجمة_عامة|ترجمه_عامه|لغة|lang)$/i
export default handler