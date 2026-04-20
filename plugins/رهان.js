import { fmt, initEconomy, msToHuman } from '../lib/economy.js'

const SLOT_COOLDOWN = 15 * 1000  // 15 seconds
const MIN_BET       = 50

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const user = global.db.data.users[m.sender]
  if (!user) return m.reply('❌ أرسل أي أمر أولاً لتسجيل حسابك.')
  initEconomy(user)

  if (!args[0] || isNaN(args[0])) {
    return m.reply(
      `╭────『 🎰 الرهان 』────\n│\n│ كم تريد أن تراهن؟\n│\n│ 📌 مثال:\n│   *${usedPrefix + command} 200*\n│\n│ ─── القواعد ───\n│ 🎯 الحد الأدنى: ${MIN_BET} 🪙\n│ 3 رموز متطابقة → ×3 ربح 🏆\n│ 2 رموز متطابقة → استرداد + 10٪ 🎁\n│ لا تطابق → خسارة الرهان ❌\n│ ⏰ كولداون: 15 ثانية\n│\n│ ⚠️ *هذه مجرد لعبة ترفيهية*\n│\n╰──────────────────`.trim()
    )
  }

  const bet = parseInt(args[0])

  if (bet < MIN_BET)
    return m.reply(`❌ الحد الأدنى للرهان هو *${MIN_BET} 🪙*`)

  if (user.money < bet)
    return m.reply(`❌ رصيدك غير كافٍ!\n💰 محفظتك: ${fmt(user.money)}`)

  const now  = Date.now()
  const last = user.lastslot || 0
  const rem  = SLOT_COOLDOWN - (now - last)
  if (rem > 0) return m.reply(`⏳ انتظر *${msToHuman(rem)}* قبل الرهان مجدداً.`)

  const emojis  = ['🎯', '💎', '🔮', '🌟', '🎪', '🦋']
  const roll    = () => emojis[Math.floor(Math.random() * emojis.length)]
  const [a, b, c] = [roll(), roll(), roll()]

  // Always deduct the bet first
  user.money -= bet
  user.totalSpent = (user.totalSpent || 0) + bet
  logTransaction(user, 'spend', bet, '🎰 رهان المقامرة')

  let winMsg
  if (a === b && b === c) {
    const prize = bet * 3
    user.money += prize
    user.totalEarned = (user.totalEarned || 0) + prize
    logTransaction(user, 'earn', prize, '🎰 فوز جاك باكبوت ×3')
    winMsg = `🏆 *فوز كبير! جاك باكبوت!*\n│ 💰 ربحت: ${fmt(prize)} (×3)`
  } else if (a === b || b === c || a === c) {
    const prize = Math.floor(bet * 1.1)
    user.money += prize
    user.totalEarned = (user.totalEarned || 0) + prize
    logTransaction(user, 'earn', prize, '🎰 تطابق جزئي +10٪')
    winMsg = `🎁 *تطابق جزئي!*\n│ 💰 استردّيت: ${fmt(prize)} (+10٪)`
  } else {
    winMsg = `❌ *خسرت الرهان!*\n│ 💸 خسرت: ${fmt(bet)}`
  }

  user.lastslot = now

  await m.reply(
`╭────『 🎰 ماكينة الحظ 』────
│
│   ${a} │ ${b} │ ${c}
│
│ ${winMsg}
│ 💰 رصيدك الآن: ${fmt(user.money)}
│
│ ⚠️ هذه مجرد لعبة ترفيهية افتراضية
╰──────────────────`.trim()
  )
}

handler.help    = ['رهان', 'slot']
handler.tags    = ['game']
handler.command = /^(slot|رهان|القمار)$/i
export default handler
