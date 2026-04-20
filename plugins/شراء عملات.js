import { initEconomy, logTransaction, fmt } from '../lib/economy.js'

const COINS_PER_DIAMOND = 800

let handler = async (m, { conn, usedPrefix, command, args }) => {
  const user = global.db.data.users[m.sender]
  if (!user) return m.reply('❌ أرسل أي أمر أولاً لتسجيل حسابك.')
  initEconomy(user)

  // Show shop info
  if (!args[0] || !/^\d+$/.test(args[0]) && !/الكل/i.test(args[0])) {
    return m.reply(`
╭────『 🪙 متجر العملات 』────
│
│ 💡 حوّل ماسك إلى عملات
│
│ 💎 1 ماسة = ${COINS_PER_DIAMOND.toLocaleString('en')} 🪙
│
│ 💰 رصيدك: ${fmt(user.money)}
│ 💎 ماسك:  ${user.diamond || 0}
│
│ 📖 طريقة الاستخدام:
│ ${usedPrefix}شراء_عملات 3
│    ⟵ يبيع 3 ماسات → +2,400 🪙
│
│ ${usedPrefix}شراء_عملات الكل
│    ⟵ يبيع كل ماسك
│
╰──────────────────`.trim())
  }

  let count
  if (/الكل/i.test(args[0])) {
    count = user.diamond || 0
  } else {
    count = parseInt(args[0]) || 0
  }

  if (!count || count < 1) {
    return m.reply(`❌ ليس لديك ماس للبيع.`)
  }

  if ((user.diamond || 0) < count) {
    return m.reply(
      `❌ *ماسك غير كافٍ!*\n\n` +
      `💎 ماسك: ${user.diamond || 0}\n` +
      `🔢 طلبت: ${count}`
    )
  }

  const earned = count * COINS_PER_DIAMOND
  user.diamond  = (user.diamond || 0) - count
  user.money    = (user.money   || 0) + earned

  logTransaction(user, 'earn', earned, `💎 بيع ${count} ماسة`)

  return m.reply(`
╭────『 🪙 تم التحويل 』────
│
│ ✅ بعت *${count}* 💎 مقابل عملات
│
│ 💰 ربحت:      +${fmt(earned)}
│ 💰 رصيدك الآن: ${fmt(user.money)}
│ 💎 الماس الآن:  ${user.diamond}
│
╰──────────────────`.trim())
}

handler.help    = ['شراء_عملات <عدد>']
handler.tags    = ['economy']
handler.command = /^(شراء_عملات|شراء-عملات|بيع_الماس|بيع-الماس|تحويل_ماس)$/i
export default handler
