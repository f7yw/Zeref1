import { initEconomy, fmt, getRole , isVip} from '../lib/economy.js'
import { xpRange } from '../lib/levelling.js'

let handler = async (m, { conn, usedPrefix }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  const who  = m.quoted?.sender || m.mentionedJid?.[0] || m.sender
  const user = global.db.data.users[who]
  if (!user) throw `✳️ المستخدم مفقود من قاعدة البيانات`
  initEconomy(user)

  const level = user.level || 0
  const exp   = user.exp   || 0
  const { max } = xpRange(level, global.multiplier)
  const role  = getRole(level)

  let name = who.split('@')[0]
  try { name = await conn.getName(who) || name } catch (_) {}

  conn.reply(m.chat, `
╭────『 🏆 الرتبة 』────
│
│ 👤 *@${who.split('@')[0]}*
│ 🏆 المستوى:  *${level}*
│ ⚔️  الرتبة:   *${role}*
│ ⭐ XP:        *${exp} / ${max}*
│
│ ─── 💰 الاقتصاد ───
│ 💰 المحفظة:  ${fmt(user.money)}
│ 🏦 البنك:    ${fmt(user.bank)}
│ 💎 الماس:    ${user.diamond || 0}
│ ⚡ الطاقة:   ${user.energy || 0}/100
│
│ 📌 ${usedPrefix}بروفايل  ← ملفك الكامل
│ 📌 ${usedPrefix}البنك     ← إدارة الأموال
╰──────────────────`.trim(), m, { mentions: [who] })
}

handler.help    = ['رانك']
handler.tags    = ['econ']
handler.command = /^(رانك|rank)$/i

export default handler
