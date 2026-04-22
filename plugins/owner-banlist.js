import { isVip } from '../lib/economy.js'
let handler = async (m, { conn, isOwner }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
let chats = Object.entries(global.db.data.chats).filter(chat => chat[1].isBanned)
let users = Object.entries(global.db.data.users).filter(user => user[1].banned)
let caption = `
┌〔 المستخدمين المحظورين 〕
├ المجموع : ${users.length} ${users ? '\n' + users.map(([jid], i) => `
├ ${isOwner ? '@' + jid.split`@`[0] : jid}`.trim()).join('\n') : '├'}
└────

┌〔 الشاتات المحظوره 〕
├ المجموع : ${chats.length} ${chats ? '\n' + chats.map(([jid], i) => `
├ ${isOwner ? '@' + jid.split`@`[0] : jid}`.trim()).join('\n') : '├'}
└────
`.trim()
m.reply(caption, null, {mentions: conn.parseMention(caption)})}
handler.command = /^(المحظور|المحظورين|banlist|bannedlist|daftarban|daftarbanned)$/i
handler.rowner = true
export default handler
