import { isVip } from '../lib/economy.js'
import { initUser } from '../lib/userInit.js'

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  let who
  if (m.isGroup) who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : false
  else who = m.chat
  
  if (!who) {
    let BANtext = `╭────『 🔖 إدارة المستخدم 』────
│
│ ⚠️ منشن الشخص أو رد على رسالته
│
│ 📌 مثال: *${usedPrefix + command} @${global.suittag || m.sender.split('@')[0]}*
│
╰──────────────────`
    return m.reply(BANtext, m.chat, { mentions: conn.parseMention(BANtext) })
  }
  
  let user = global.db.data.users[who]
  if (!user) {
    user = global.db.data.users[who] = {}
    initUser(user, undefined, who)
  }

  const isBanning = !command.includes('الغاء') && command !== 'unban'
  user.banned = isBanning
  user.bannedReason = text ? text.replace('@' + who.split`@` [0], '').trim() : ''

  const status = isBanning ? '🚫 تم حظر' : '✅ تم إلغاء حظر'
  const caption = `╭────『 👤 إدارة المستخدم 』────
│
│ ${status}: @${who.split('@')[0]}
│ 📝 السبب: ${user.bannedReason || 'غير محدد'}
│
╰──────────────────`

  await conn.reply(m.chat, caption, m, { mentions: [who] })
}

handler.help = ['banuser', 'unbanuser', 'بان', 'الغاء_بان']
handler.tags = ['owner']
handler.command = /^(banuser|unbanuser|بان|الغاء_بان|حظر|الغاء_الحظر)$/i
handler.rowner = true

export default handler
