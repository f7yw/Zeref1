function hasLink(text = '') {
  return /(https?:\/\/|chat\.whatsapp\.com\/|wa\.me\/|t\.me\/|discord\.gg\/)/i.test(text)
}

let handler = async (m, { args, command }) => {
  const chat = global.db.data.chats[m.chat] || (global.db.data.chats[m.chat] = {})
  const sub = (args[0] || '').toLowerCase()
  if (/^(تشغيل|on)$/i.test(sub)) {
    chat.antiLink = true
    return m.reply('🛡️ تم تفعيل حماية الروابط في القروب.')
  }
  if (/^(ايقاف|إيقاف|off)$/i.test(sub)) {
    chat.antiLink = false
    return m.reply('🛡️ تم إيقاف حماية الروابط في القروب.')
  }
  return m.reply(`استخدم:\n.${command} تشغيل\n.${command} ايقاف`)
}

handler.before = async function (m, { conn, isAdmin, isBotAdmin, isOwner }) {
  if (!m.isGroup || !m.text || m.isBaileys) return false
  const chat = global.db.data.chats[m.chat]
  if (!chat?.antiLink || isAdmin || isOwner) return false
  if (!hasLink(m.text)) return false
  await conn.sendMessage(m.chat, { delete: m.key }).catch(() => {})
  await conn.reply(m.chat, `🛡️ تم حذف رابط من @${m.sender.split('@')[0]}${isBotAdmin ? '' : '\nارفع البوت مشرفاً ليتمكن من الطرد عند الحاجة.'}`, m, { mentions: [m.sender] })
  return true
}

handler.help = ['الحماية تشغيل', 'الحماية ايقاف']
handler.tags = ['group']
handler.command = /^(الحماية|حماية|security|antilink)$/i
handler.group = true
handler.admin = true
export default handler