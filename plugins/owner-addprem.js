import { logTransaction, initEconomy, MAX_ENERGY } from '../lib/economy.js'

const VIP_DURATION = 10 * 365 * 24 * 60 * 60 * 1000
const VIP_BONUS_MONEY   = 50000
const VIP_BONUS_BANK    = 10000
const VIP_BONUS_DIAMOND = 50

let handler = async (m, { conn, text }) => {
  // نفس طريقة البروفايل (مضمونة)
  let who = m.mentionedJid?.[0] || m.quoted?.sender || (text ? text.replace(/\D/g, '') + '@s.whatsapp.net' : null)

  if (!who) throw `*[❗] يرجى تحديد المستخدم (@منشن أو رد أو رقم)*`

  const jid = who
  const num = jid.split('@')[0]

  // منع التكرار
  if (global.prems.includes(num)) {
    throw `*[❗] @${num} مميّز بالفعل*`
  }

  global.prems.push(num)

  // تأكد من وجود المستخدم
  global.db.data.users[jid] ||= {}
  const user = global.db.data.users[jid]

  initEconomy(user)

  // تعيين VIP
  user.premium = true
  user.premiumTime = Date.now() + VIP_DURATION
  user.premiumDate = Date.now()

  // مزايا VIP
  user.infiniteResources = true
  user.energy = MAX_ENERGY
  user.lastEnergyRegen = Date.now()

  // مكافآت
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

  await conn.sendMessage(m.chat, { text: msg, mentions: [jid] }, { quoted: m })
}

handler.help = ['addprem <@user>']
handler.tags = ['owner']
handler.command = /^(add|\+)prem|بريم|myprem$/i
handler.rowner = true

export default handler