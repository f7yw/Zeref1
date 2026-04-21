import { syncEnergy, MAX_ENERGY, fmt, initEconomy, msToHuman, isVip, logTransaction } from '../lib/economy.js'

const DAILY_COOLDOWN = 24 * 60 * 60 * 1000
const ENERGY_BONUS   = 50
const COIN_MIN       = 300
const COIN_MAX       = 700
const XP_BONUS       = 200
const DIAMOND_CHANCE = 0.10  // 10% chance to get a diamond

let handler = async (m) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const user = global.db.data.users[m.sender]
  if (!user) return m.reply('❌ سجّل أولاً باستخدام أي أمر.\n👤 العضوية: ' + vipStatus)
  initEconomy(user)

  const vip  = isVip(m.sender)
  const now  = Date.now()
  const last = user.lastDaily || 0
  const rem  = DAILY_COOLDOWN - (now - last)

  if (rem > 0 && !vip) {
    return m.reply(
      `╭────『 ⏳ المكافأة اليومية 』────\n│\n│ ⏰ يمكنك المطالبة بعد:\n│ *${msToHuman(rem)}*\n│\n╰──────────────────`.trim()
    )
  }

  const coins   = Math.floor(Math.random() * (COIN_MAX - COIN_MIN + 1)) + COIN_MIN
  const gotDia  = Math.random() < DIAMOND_CHANCE
  const energy  = syncEnergy(user)
  const newNrg  = Math.min(MAX_ENERGY, energy + ENERGY_BONUS)

  user.money    += coins
  user.exp      += XP_BONUS
  user.energy    = newNrg
  user.lastDaily = now
  user.totalEarned = (user.totalEarned || 0) + coins
  if (gotDia) user.diamond = (user.diamond || 0) + 1
  logTransaction(user, 'earn', coins, `🎁 مكافأة يومية`)

  const lines = [
    `╭────『 🎁 المكافأة اليومية 』────`,
    `│`,
    `│ ✅ *تم استلام مكافأتك اليومية!*`,
    `│`,
    `│ 💰 عملات:  +${fmt(coins)}`,
    `│ ⭐ خبرة:   +${XP_BONUS} XP`,
    `│ ⚡ طاقة:   +${ENERGY_BONUS} (الآن: ${newNrg}/${MAX_ENERGY})`,
    gotDia ? `│ 💎 حظ!     +1 ماسة نادرة!` : `│ 💎 حظك غداً للماسة (احتمال 10٪)`,
    `│`,
    `│ 💰 رصيدك الآن: ${fmt(user.money)}`,
    `│ ⏰ المكافأة التالية: بعد 24 ساعة`,
    `│`,
    `╰──────────────────`,
  ]

  await m.reply(lines.join('\n'))
}

handler.help     = ['يومي', 'daily']
handler.tags     = ['economy']
handler.command  = /^(يومي|daily|مكافأة|المكافأة)$/i
handler.register = true
export default handler
