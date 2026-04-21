import { isVip } from '../lib/economy.js'
async function handler(m, { usedPrefix }) {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
let users = [...new Set([...global.conns.filter(conn => conn.user && conn.state !== 'close').map(conn => conn.user)])]
await m.reply( '*—◉ قائمة البوتات الفرعية ♧*\n\n*◉ يمكنك الاتصال بهم لمطالبتهم بالانضمام إلى مجموعتك ، كن محترمًا!!*\n\n*◉ إذا ظهر النص فارغًا ، فهذا يعني أنه لا توجد برامج فرعية نشطة*\n\n*[❗] The Shadow - Bots - سيتحمل الفريق جميع المسؤوليات أو الأحداث التي حدثت فيما يتعلق بالبوت أو الروبوت*')
await m.reply(users.map(v => '👉🏻 wa.me/' + v.jid.replace(/[^0-9]/g, '') + `?text=${usedPrefix}estado (${v.name})`).join('\n'))}
handler.command = handler.help = ['listjadibot','bots','subsbots']
handler.tags = ['jadibot']
export default handler
