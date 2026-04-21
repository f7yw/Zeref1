import { syncEnergy, msToNextRegen, MAX_ENERGY, fmtEnergy, FEES, initEconomy , isVip} from '../lib/economy.js'

let handler = async (m, { usedPrefix }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  const user = global.db.data.users[m.sender]
  if (!user) return m.reply('❌ أرسل أي أمر أولاً لتسجيل حسابك.\n👤 العضوية: ' + vipStatus)
  initEconomy(user)

  const energy    = syncEnergy(user)
  const nextRegen = msToNextRegen(user)
  const nextSecs  = Math.ceil(nextRegen / 1000)
  const energyBar = fmtEnergy(user)
  const pct       = Math.round((energy / MAX_ENERGY) * 100)

  const status = energy >= 80 ? '🟢 ممتاز'
               : energy >= 50 ? '🟡 جيد'
               : energy >= 20 ? '🟠 منخفض'
               : '🔴 ناضب — استرح!'

  await m.reply(
`╭────────『 ⚡ الطاقة 』────────
│
│ ${energyBar}
│ 📊 *النسبة:*       ${pct}٪
│ 💡 *الحالة:*       ${status}
│ ⏱️ *التجديد بعد:*  ${nextSecs < 60 ? nextSecs + ' ثانية' : Math.ceil(nextSecs/60) + ' دقيقة'}
│ ♻️ *معدل الشحن:*   +1 طاقة كل 3 دقائق
│
│ ─── تكلفة الأوامر ───
│ 🤖 ذكاء اصطناعي:   ${FEES.ai} ⚡
│ 🖼️ تحسين الصورة:   ${FEES.hd} ⚡
│ 🌍 ترجمة:          ${FEES.translate} ⚡
│ 🛠️ عمل:            10 ⚡
│ 🎮 ألعاب:          مجانية ✅
│ 📖 أوامر عادية:    مجانية ✅
│
│ 💡 استخدم *${usedPrefix}يومي* للحصول على +50 طاقة
│
╰────────────────────────────────`.trim()
  )
}

handler.help    = ['طاقة', 'energy']
handler.tags    = ['economy']
handler.command = /^(طاقة|طاقه|energy|الطاقة)$/i
export default handler
