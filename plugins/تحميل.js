import { isVip } from '../lib/economy.js'
let handler = async (m, { usedPrefix, command }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  await m.reply(`❌ أمر تحميل الفيديو معطّل حالياً.\nجرب ${usedPrefix}بحث_يوتيوب للبحث عن الفيديو.\n👤 العضوية: ${vipStatus}`)
}
handler.help = []
handler.tags = ['downloader']
handler.command = /^(فيديو|video|dl|تحميل)$/i
handler.disabled = true
export default handler
