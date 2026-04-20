import { logTransaction, initEconomy, MAX_ENERGY } from '../lib/economy.js'

const VIP_DURATION = 10 * 365 * 24 * 60 * 60 * 1000
const VIP_BONUS_MONEY   = 50000
const VIP_BONUS_BANK    = 10000
const VIP_BONUS_DIAMOND = 50

let handler = async (m, { conn, text }) => {
  let jid = m.mentionedJid?.[0] || m.quoted?.sender

  if (!jid && text) {
    const cleaned = text.replace(/[^0-9]/g, '')
    if (cleaned.length >= 7) jid = cleaned + '@s.whatsapp.net'
  }

  if (!jid) throw `*[❗] يرجى تحديد المستخدم (@منشن أو رد أو رقم الهاتف)*`

  const num = jid.split('@')[0].replace(/[^0-9]/g, '')

  if (!num) throw `*[❗] رقم المستخدم غير صالح*`

  const normalJid = num + '@s.whatsapp.net'

  if (global.prems.includes(num)) {
    throw `*[❗] المستخدم +${num} مميّز بالفعل*`
  }

  global.prems.push(num)

  global.db.data.users[normalJid] ||= {}
  const user = global.db.data.users[normalJid]

  initEconomy(user)

  user.premium = true
  user.premiumTime = Date.now() + VIP_DURATION
  user.premiumDate = Date.now()
  user.infiniteResources = true
  user.energy = MAX_ENERGY
  user.lastEnergyRegen = Date.now()
  user.money = (user.money || 0) + VIP_BONUS_MONEY
  user.bank = (user.bank || 0) + VIP_BONUS_BANK
  user.diamond = (user.diamond || 0) + VIP_BONUS_DIAMOND

  logTransaction(user, 'earn', VIP_BONUS_MONEY, '👑 هدية ترقية VIP')

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

  await conn.sendMessage(m.chat, { text: msg, mentions: [normalJid] }, { quoted: m })
}

handler.help = ['addprem <@user>']
handler.tags = ['owner']
handler.command = /^(add|\+)prem|بريم|myprem$/i
handler.rowner = true

export default handler
