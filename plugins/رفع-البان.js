import { isVip } from '../lib/economy.js'
let handler = async (m, { conn, text}) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
 await conn.sendMessage(m.chat, { react: { text: '🔔', key: m.key } })
if (!text) throw '*المنشن*'
let who
if (m.isGroup) who = m.mentionedJid[0]
else who = m.chat
if (!who) throw '*المنشن*'
let users = global.db.data.users
users[who].banned = false
conn.reply(m.chat, `*[❗]تم إلغاء حظر المستخدم*\n*—◉ يقدر يستخدم البوت الان*\n👤 العضوية: ${vipStatus}`, m)
}
handler.help = ['unbanuser']
handler.tags = ['owner']
handler.command = /^رفع-البان$/i
handler.rowner = true
export default handler
