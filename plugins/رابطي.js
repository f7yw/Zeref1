import { isVip } from '../lib/economy.js'
let handler = async (m, { conn, text }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  let tagme = `https://wa.me/+${m.sender.replace(`+`)}/?text=BY+『彡ℤ𝕖𝕣𝕖𝕗』`
  let mylink = [m.sender]
  conn.reply(m.chat, tagme, m, { contextInfo: { mylink }})
}
handler.help = ['منشني']
handler.tags = ['group']
handler.command = /^رابطي$/i

handler.group = false

export default handler