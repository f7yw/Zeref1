import fetch from 'node-fetch'
let handler  = async (m, { conn, text }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
try {
let res = await fetch('https://api.thedogapi.com/v1/images/search')
let img = await res.json()
let caption = `*𝐒𝐇𝐀𝐃𝐎𝐖_BOT*`.trim()
conn.sendFile(m.chat, img[0].url, 'dog.jpg', caption, m)
} catch {
throw '*Error!*'
}}
handler.help = ['كلب']
handler.tags = ['random']
handler.command = /^كلب$/i
handler.fail = null
export default handler
