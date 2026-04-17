import { xpRange } from '../lib/levelling.js'
import { initEconomy, syncEnergy, fmt, fmtEnergy, getRole } from '../lib/economy.js'

let handler = async (m, { conn }) => {
  const who = m.mentionedJid?.[0] || m.quoted?.sender || m.sender
  const user = global.db.data.users[who] || (global.db.data.users[who] = {})
  initEconomy(user)
  syncEnergy(user)
  const level = user.level || 0
  const { max } = xpRange(level, global.multiplier)
  const name = await conn.getName(who).catch(() => who.split('@')[0])
  const registered = user.registered ? 'نعم' : 'لا'
  const premium = user.premium || user.premiumTime > 0 ? 'نعم' : 'لا'
  const banned = user.banned ? 'نعم' : 'لا'
  const text = `
╭────『 👤 البروفايل 』────
│ الاسم: *${name}*
│ الرقم: @${who.split('@')[0]}
│ مسجل: *${registered}*
│ مميز: *${premium}*
│ محظور: *${banned}*
│
│ المستوى: *${level}*
│ الرتبة: *${getRole(level)}*
│ XP: *${user.exp || 0} / ${max}*
│
│ المحفظة: *${fmt(user.money)}*
│ البنك: *${fmt(user.bank)}*
│ الماس: *${user.diamond || 0}*
│ الطاقة: ${fmtEnergy(user)}
│
│ المكتسبات: *${fmt(user.totalEarned)}*
│ المصروفات: *${fmt(user.totalSpent)}*
╰──────────────────`.trim()
  await conn.reply(m.chat, text, m, { mentions: [who] })
}

handler.help = ['بروفايل', 'profile']
handler.tags = ['info']
handler.command = /^(بروفايل|ملفي|حسابي|profile|perfil)$/i
export default handler