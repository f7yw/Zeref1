import { fmt } from '../lib/economy.js'
import { typingDelay } from '../lib/presence.js'

let handler = async (m, { conn, usedPrefix }) => {
  const user = global.db.data.users[m.sender]
  if (!user) return m.reply(`❌ استخدم *${usedPrefix}تسجيل* أولاً`)

  await typingDelay(conn, m.chat, 800)

  const txs = Array.isArray(user.transactions) ? user.transactions.slice(0, 20) : []
  if (!txs.length) return m.reply('📭 لا توجد معاملات مسجلة بعد.\nاستخدم البوت أكثر لتظهر هنا!')

  const total = txs.reduce((acc, t) => {
    return t.type === 'earn' ? { ...acc, earned: acc.earned + t.amount } : { ...acc, spent: acc.spent + t.amount }
  }, { earned: 0, spent: 0 })

  const lines = txs.map((tx, i) => {
    const icon = tx.type === 'earn' ? '🟢' : '🔴'
    const sign = tx.type === 'earn' ? '+' : '-'
    const d = new Date(tx.time)
    const timeStr = `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`
    return `${icon} ${sign}${tx.amount} 🪙 — ${tx.reason}\n     ⏰ ${timeStr}`
  }).join('\n')

  await m.reply(
`╭────『 📋 سجل المعاملات 』────
│
│ 💰 *المحفظة الحالية:* ${fmt(user.money)}
│ 🏦 *البنك:* ${fmt(user.bank)}
│
│ ─── آخر ${txs.length} معاملة ───
│
${lines}
│
│ ─── ملخص ───
│ 🟢 *مجموع المكاسب:* +${total.earned} 🪙
│ 🔴 *مجموع المصروف:* -${total.spent} 🪙
│ 📊 *الصافي:* ${total.earned - total.spent >= 0 ? '+' : ''}${total.earned - total.spent} 🪙
│
╰──────────────────`.trim()
  )
}

handler.help = ['معاملاتي', 'transactions']
handler.tags = ['economy']
handler.command = /^(معاملاتي|سجل_المعاملات|transactions|محفظتي)$/i
export default handler
