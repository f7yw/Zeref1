import { isVip } from '../lib/economy.js'
let handler = async (m, { conn, command, text }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
let stupidity = `*قـــيـــاس نسـبـــه حضـــك🍹*
*•┃❖❂━━━━━━❨🕊️❩━━━━━━❂*╟❧
*نسبة حــضـــكك ${text}هيا* *${Math.floor(Math.random() * 
100)}%* *من 100%*

*حلو زز ابقى متفائل*
*•┃❖━━━━━━━❨🕊️❩━━━━━━❂*╟❧`.trim()
m.reply(stupidity, null, { mentions: conn.parseMention(stupidity) })}
handler.help = ['stupidity']
handler.tags = ['fun']
handler.command = /^(حضي|حض|حظ|حظي)$/i
export default handler