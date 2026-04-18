import { logTransaction } from '../lib/economy.js'

const VIP_DURATION = 10 * 365 * 24 * 60 * 60 * 1000  // 10 years
const VIP_MONEY    = 2_000_000_000                      // "infinite" wallet

let handler = async (m, { conn, text }) => {
  let who
  if (m.isGroup) who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : text
  else who = m.chat

  if (!who) throw `*[❗] يرجى تحديد المستخدم (@منشن أو رد)*`

  const jid = who.includes('@') ? who : `${who.replace(/\D/g, '')}@s.whatsapp.net`
  const num = jid.split('@')[0]

  if (global.prems.includes(num)) throw `*[❗] @${num} مميّز بالفعل*`

  // ── Persist in global.prems (runtime) ───────────────────────────────────
  global.prems.push(num)

  // ── Persist in local database ────────────────────────────────────────────
  if (!global.db.data.users[jid]) global.db.data.users[jid] = {}
  const user = global.db.data.users[jid]
  user.premium          = true
  user.premiumTime      = Date.now() + VIP_DURATION
  user.premiumDate      = Date.now()
  user.infiniteResources = true
  user.energy           = 100
  user.lastEnergyRegen  = Date.now()
  if ((user.money  || 0) < 1_000_000) user.money  = VIP_MONEY
  if ((user.bank   || 0) < 1_000_000) user.bank   = VIP_MONEY
  if ((user.diamond|| 0) < 100)       user.diamond = 999
  logTransaction(user, 'earn', VIP_MONEY, `👑 ترقية VIP — موارد لا نهاية لها`)

  const msg = `╭────『 👑 ترقية VIP 』────
│
│ ✅ @${num} الآن مميّز!
│
│ 💰 محفظة: ∞ لا نهاية
│ 🏦 بنك:    ∞ لا نهاية
│ 💎 ماس:   ∞
│ ⚡ طاقة:  100/100 (دائمة)
│
│ يمكنه استخدام أي أمر بلا قيود.
│ البيانات محفوظة في قاعدة البيانات.
│
╰──────────────────`
  await m.reply(msg, null, { mentions: [jid] })
}

handler.help    = ['addprem <@user>']
handler.tags    = ['owner']
handler.command = /^(add|\+)prem|بريم|myprem$/i
handler.rowner  = true
export default handler
