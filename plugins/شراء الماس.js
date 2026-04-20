import { initEconomy, logTransaction, fmt } from '../lib/economy.js'

const COIN_PER_DIAMOND = 1_000

let handler = async (m, { conn, usedPrefix, command, args }) => {
  const user = global.db.data.users[m.sender]
  if (!user) return m.reply('❌ أرسل أي أمر أولاً لتسجيل حسابك.')
  initEconomy(user)

  // Show shop info
  if (/^(شراء_الماس|شراء-الماس|متجر_الماس)$/i.test(command) && !args[0]) {
    return m.reply(`
╭────『 💎 متجر الماس 』────
│
│ 💡 يمكنك شراء الماس بعملاتك
│
│ 💎 1 ماسة = ${COIN_PER_DIAMOND.toLocaleString('en')} 🪙
│
│ 💰 رصيدك: ${fmt(user.money)}
│ 💎 ماسك:  ${user.diamond || 0}
│
│ 📖 طريقة الاستخدام:
│ ${usedPrefix}شراء_الماس 5
│    ⟵ يشتري 5 ماسات بـ 5,000 🪙
│
│ ${usedPrefix}شراء_الماس الكل
│    ⟵ يشتري أقصى ماس ممكن
│
╰──────────────────`.trim())
  }

  let count
  if (/الكل/i.test(args[0])) {
    count = Math.floor((user.money || 0) / COIN_PER_DIAMOND)
  } else {
    count = parseInt(args[0]) || 0
  }

  if (!count || count < 1) {
    return m.reply(`❌ اكتب عدد الماسات:\n${usedPrefix}شراء_الماس 5`)
  }

  const totalCost = count * COIN_PER_DIAMOND

  if (user.money < totalCost) {
    const canAfford = Math.floor((user.money || 0) / COIN_PER_DIAMOND)
    return m.reply(
      `❌ *رصيدك غير كافٍ!*\n\n` +
      `💰 رصيدك: ${fmt(user.money)}\n` +
      `💸 المطلوب: ${fmt(totalCost)}\n` +
      `💎 يمكنك شراء: ${canAfford} ماسة فقط`
    )
  }

  user.money   -= totalCost
  user.diamond  = (user.diamond || 0) + count

  logTransaction(user, 'spend', totalCost, `💎 شراء ${count} ماسة`)

  return m.reply(`
╭────『 💎 تم الشراء 』────
│
│ ✅ اشتريت *${count}* 💎
│
│ 💸 التكلفة:    ${fmt(totalCost)}
│ 💰 الرصيد الآن: ${fmt(user.money)}
│ 💎 الماس الآن:  ${user.diamond}
│
╰──────────────────`.trim())
}

handler.help    = ['شراء_الماس <عدد>']
handler.tags    = ['economy']
handler.command = /^(شراء_الماس|شراء-الماس|متجر_الماس|الماسي|diamond)$/i
export default handler
