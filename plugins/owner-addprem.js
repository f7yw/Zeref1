import { logTransaction, initEconomy, MAX_ENERGY } from '../lib/economy.js'

const VIP_DURATION = 10 * 365 * 24 * 60 * 60 * 1000
const VIP_BONUS_MONEY   = 50_000
const VIP_BONUS_BANK    = 10_000
const VIP_BONUS_DIAMOND = 50

let handler = async (m, { conn, text }) => {
  let who
  if (m.isGroup) who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text
  else who = m.chat

  if (!who) throw `*[❗] يرجى تحديد المستخدم (@منشن أو رد)*`

  const jid = who.includes('@') ? who : `${who.replace(/\D/g, '')}@s.whatsapp.net`
  const num = jid.split('@')[0]

  if (global.prems.includes(num)) throw `*[❗] @${num} مميّز بالفعل*`

  global.prems.push(num)

  if (!global.db.data.users[jid]) global.db.data.users[jid] = {}
  const user = global.db.data.users[jid]
  initEconomy(user)

  user.premium           = true
  user.premiumTime       = Date.now() + VIP_DURATION
  user.premiumDate       = Date.now()
  user.infiniteResources = true
  user.energy            = MAX_ENERGY
  user.lastEnergyRegen   = Date.now()

  user.money   = (user.money   || 0) + VIP_BONUS_MONEY
  user.bank    = (user.bank    || 0) + VIP_BONUS_BANK
  user.diamond = (user.diamond || 0) + VIP_BONUS_DIAMOND

  logTransaction(user, 'earn', VIP_BONUS_MONEY, `👑 هدية ترقية VIP`)

  const msg = `╭────『 👑 ترقية VIP 』────
│
│ ✅ @${num} الآن مميّز!
│
│ 💰 هدية ترحيب: +${VIP_BONUS_MONEY.toLocaleString('en')} 🪙
│ 🏦 بنك:        +${VIP_BONUS_BANK.toLocaleString('en')} 🪙
│ 💎 ماس:        +${VIP_BONUS_DIAMOND}
│ ⚡ طاقة:       ${MAX_ENERGY}/${MAX_ENERGY} (دائمة)
│
│ ⭐ يتخطى حدود الطاقة في جميع الأوامر.
│ 💡 رصيده الحقيقي محفوظ ويمكن تتبعه.
│
╰──────────────────`
  await m.reply(msg, null, { mentions: [jid] })
}

handler.help    = ['addprem <@user>']
handler.tags    = ['owner']
handler.command = /^(add|\+)prem|بريم|myprem$/i
handler.rowner  = true
export default handler
