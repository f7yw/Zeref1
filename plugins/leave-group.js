import { isVip } from '../lib/economy.js'
let handler = async (m, { conn, args, command }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
await m.reply('*لن اشتاك لكم معه السلامه الي باعنا خسر دلعنا ⁦^⁠_⁠^⁩*') 
await  conn.groupLeave(m.chat)}
handler.command = /^(out|leavegc|اخرج|برا)$/i
handler.group = true
handler.rowner = true
export default handler