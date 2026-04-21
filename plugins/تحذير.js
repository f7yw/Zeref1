import { isVip } from '../lib/economy.js'
const handler = async (m, { conn, text, command, usedPrefix }) => {
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  if (m.mentionedJid?.includes(conn.user.jid)) return

  const dReason = 'بدون سبب'
  const msgtext = text || dReason
  const sdms = msgtext.replace(/@\d+-?\d* /g, '')

  let who
  if (m.isGroup) {
    who = m.mentionedJid?.[0] || m.quoted?.sender || null
  } else {
    who = m.chat
  }

  const warntext = `*[❗] قم بالرد على الرسالة أو منشن المستخدم*\n\n*—◉ مثال:*\n*${usedPrefix + command} @${global.suittag}*`

  if (!who) {
    return m.reply(warntext, m.chat, { mentions: conn.parseMention(warntext) })
  }

  global.db.data.users[who] ||= {}
  const user = global.db.data.users[who]
  user.warn ||= 0
  user.warn += 1

  const mention = `@${who.split('@')[0]}`
  await conn.reply(
    m.chat,
    `${mention} تلقى تحذيرًا في هذه المجموعة!\nالسبب: ${sdms}\n*التحذيرات ${user.warn}/3*\n👤 العضوية: ${vipStatus}`,
    m,
    { mentions: [who] }
  )

  if (user.warn >= 3) {
    await conn.reply(
      m.chat,
      `تم تجاوز 3 تحذيرات.\n${mention} سيتم طرده الآن.\n👤 العضوية: ${vipStatus}`,
      m,
      { mentions: [who] }
    )

    await conn.groupParticipantsUpdate(m.chat, [who], 'remove')
    user.warn = 0
  }

  return !1
}

handler.command = /^(advertir|advertencia|warn|تحذير)$/i
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler