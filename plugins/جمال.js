import { isVip } from '../lib/economy.js'
let handler = async (m, { conn, command, text }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
let beauty = `▣──────────────────
│
*▣─❧ نسبة الجمال*
  *نسبة جمال ${text}*
*${Math.floor(Math.random() * 100)}%* *من 100%*
│
▣──────────────────
`.trim()
m.reply(beauty, null, { mentions: conn.parseMention(beauty) })}
handler.help = ['beauty']
handler.tags = ['fun']
handler.command = /^(جمال)$/i
export default handler
