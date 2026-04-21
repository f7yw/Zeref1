import { xpRange } from '../lib/levelling.js'
import { isVip, fmt, fmtEnergy, getRole } from '../lib/economy.js'
import { initUser } from '../lib/userInit.js'
import { typingDelay } from '../lib/presence.js'

let handler = async (m, { conn, usedPrefix }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  const who   = m.mentionedJid?.[0] || m.quoted?.sender || m.sender
  const isSelf = who === m.sender
  const user  = global.db.data.users[who] || (global.db.data.users[who] = {})
  initUser(user, isSelf ? m.pushName : undefined, who)

  await typingDelay(conn, m.chat, 800)

  const vip    = isVip(who)
  const level  = user.level  || 0
  const exp    = user.exp    || 0
  const { max } = xpRange(level, global.multiplier)
  const bar    = (() => {
    const pct = Math.min(10, Math.floor((exp / Math.max(max, 1)) * 10))
    return '█'.repeat(pct) + '░'.repeat(10 - pct)
  })()

  let name = user.name || who.split('@')[0]
  try { name = await conn.getName(who) || name } catch (_) {}

  const registered = user.registered
  const regDate    = registered && user.regTime > 0
    ? new Date(user.regTime).toLocaleString('ar-YE')
    : null

  const lastSeen = user.messages?.last && user.messages.last > 0
    ? new Date(user.messages.last).toLocaleString('ar-YE')
    : 'غير محفوظ'

  const pp = await conn.profilePictureUrl(who, 'image').catch(() => './src/avatar_contact.png')

  // Warn stars
  const warnCount  = user.warn || 0
  const warnStars  = '⭕'.repeat(warnCount) + '⚪'.repeat(Math.max(0, 3 - warnCount))
  const warnStatus = warnCount === 0 ? '✅ لا يوجد' : warnCount >= 3 ? '⛔ خطر الطرد' : `⚠️ ${warnCount}/3`

  // Premium label
  const premLabel  = vip
    ? '💎 مميز (VIP)'
    : user.premiumTime > Date.now() ? '⭐ مميز' : '❌ عادي'

  // Messages
  const totalMsgs = user.messages?.total || 0
  const groupMsgs = m.isGroup ? (user.messages?.groups?.[m.chat] || 0) : null

  const regLine = registered
    ? `✅ مسجل منذ: *${regDate}*`
    : `❌ غير مسجل ← استخدم *${usedPrefix}تسجيل*`

  const text =
`╭──────『 👤 ${name} 』──────
│
│ 🆔 *الرقم:* +${who.split('@')[0]}
│ 📋 *الحالة:* ${regLine}
│ 💎 *العضوية:* ${premLabel}
│ 🚫 *محظور:* ${user.banned ? `نعم — ${user.bannedReason || 'بدون سبب'}` : 'لا'}
│ ⚠️ *التحذيرات:* ${warnStatus} ${warnStars}
│
│ ─── المستوى والخبرة ───
│ 🏆 *المستوى:*  ${level}  (${getRole(level)})
│ ⭐ *XP:* ${exp} / ${max}
│ ${bar}
│
│ ─── الاقتصاد ───
│ 💰 *المحفظة:* ${fmt(user.money)}
│ 🏦 *البنك:*   ${fmt(user.bank)}
│ 💎 *الماس:*   ${user.diamond || 0}
│ ⚡ *الطاقة:*  ${fmtEnergy(user, who)}
│
│ ─── النشاط ───
│ 💬 *إجمالي الرسائل:* ${totalMsgs}
│${groupMsgs !== null ? `\n│ 📊 *رسائل هذا القروب:* ${groupMsgs}\n│` : ''}
│ 🕐 *آخر نشاط:* ${lastSeen}
│
╰──────────────────────`.trim()

  await conn.sendMessage(m.chat, { image: { url: pp }, caption: text, mentions: [who] }, { quoted: m })
}

handler.help = ['بروفايل', 'profile']
handler.tags = ['info']
handler.command = /^(بروفايل|ملفي|حسابي|profile|perfil)$/i
export default handler
