import { initUser } from '../lib/userInit.js'
import { initEconomy, fmt , isVip} from '../lib/economy.js'

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  if (!text) throw `*مثال: ${usedPrefix}${command} حجر*`
  
  const choices = ['حجر', 'ورقة', 'مقص']
  const userChoice = text.trim().toLowerCase()
  if (!choices.includes(userChoice)) throw `*خياراتك هي: حجر، ورقة، مقص*`
  
  let botChoice = ''
  const astro = Math.random()
  if (astro < 0.34) botChoice = 'حجر'
  else if (astro < 0.67) botChoice = 'مقص'
  else botChoice = 'ورقة'

  const user = global.db.data.users[m.sender] || (global.db.data.users[m.sender] = {})
  initUser(user, m.pushName, m.sender)
  initEconomy(user, m.sender)

  let result = ''
  let win = false
  let tie = false

  if (userChoice === botChoice) {
    result = '🤝 تعادل!'
    tie = true
  } else if (
    (userChoice === 'حجر' && botChoice === 'مقص') ||
    (userChoice === 'ورقة' && botChoice === 'حجر') ||
    (userChoice === 'مقص' && botChoice === 'ورقة')
  ) {
    result = '🎉 فزت!'
    win = true
  } else {
    result = '❌ خسرت!'
  }

  const xpReward = win ? 1000 : tie ? 500 : -300
  user.exp = (user.exp || 0) + xpReward
  if (user.exp < 0) user.exp = 0

  const response = `╭────『 🎮 حجر-ورقة-مقص 』────
│
│ 👤 أنت: *${userChoice}*
│ 🤖 البوت: *${botChoice}*
│
│ 🏁 النتيجة: *${result}*
│ │ ⭐ XP: ${xpReward > 0 ? '+' : ''}${xpReward}
│
╰──────────────────`

  await m.reply(response)
}

handler.help = ['حجره', 'لعبة']
handler.tags = ['game']
handler.command = /^(حجره|لعبة|ppt)$/i

export default handler
