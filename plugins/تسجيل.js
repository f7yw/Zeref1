import { initUser } from '../lib/userInit.js'
import { isVip, fmt, MAX_ENERGY } from '../lib/economy.js'
import { typingDelay } from '../lib/presence.js'

let handler = async (m, { conn, usedPrefix }) => {
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const user = global.db.data.users[m.sender] || (global.db.data.users[m.sender] = {})
  initUser(user, m.pushName, m.sender)

  if (user.registered) {
    const regDate = user.regTime > 0
      ? new Date(user.regTime).toLocaleString('ar-YE')
      : 'غير محدد'
    return m.reply(
`╭────『 ✅ مسجل مسبقاً 』────
│
│ 👤 *${user.name || m.pushName || 'مستخدم'}*
│ 📅 التسجيل: *${regDate}*
│
│ استخدم *${usedPrefix}بروفايل* لعرض ملفك
│
╰──────────────────`.trim()
    )
  }

  await typingDelay(conn, m.chat, 1200)

  user.registered = true
  user.regTime    = Date.now()
  user.name       = m.pushName || m.sender.split('@')[0]
  // حفظ فوري في القاعدة السحابية حتى لا يضيع التسجيل
  try { await global.db.write() } catch (e) { console.error('[REG-WRITE]', e?.message) }

  // VIP users get premium auto-set (syncVipResources already called via initUser, this is a safety fallback)
  const vip = isVip(m.sender)
  if (vip && !user.premium) {
    user.premium          = true
    user.premiumTime      = Date.now() + 1000 * 60 * 60 * 24 * 365 * 10
    user.infiniteResources = true
  }

  const pp = await conn.profilePictureUrl(m.sender, 'image').catch(() => './src/avatar_contact.png')

  const caption =
`╭───────『 🎉 تم التسجيل بنجاح 』───────
│
│ 👤 *الاسم:*     ${user.name}
│ 🆔 *الرقم:*     @${m.sender.split('@')[0]}
│
│ ─────── 🎁 مكافأة التسجيل ───────
│ 💰 *المحفظة:*  ${fmt(user.money)}
│ 🏦 *البنك:*    ${fmt(user.bank)}
│ ⚡ *الطاقة:*   ${user.energy}/${MAX_ENERGY}
│ 🏆 *المستوى:*  ${user.level}
│ ⭐ *XP:*       ${user.exp}
│${vip ? '\n│ 💎 *VIP:* وصول مميز نشط ♾️\n│' : ''}
│ ─────── 📌 الأوامر الأساسية ───────
│ ${usedPrefix}بروفايل    ← ملفك الشخصي الكامل
│ ${usedPrefix}بنك        ← إدارة الأموال
│ ${usedPrefix}يومي       ← مكافأة يومية
│ ${usedPrefix}عمل        ← اكسب عملات
│ ${usedPrefix}شغل اغنية  ← تشغيل موسيقى
│
╰──────────────────────────────`.trim()

  try {
    await conn.sendMessage(m.chat, { image: { url: pp }, caption, mentions: [m.sender] }, { quoted: m })
  } catch {
    await m.reply(caption, null, { mentions: [m.sender] })
  }
}

handler.help = ['تسجيل', 'register']
handler.tags = ['main']
// أزيل (انضم) لأنه يتعارض مع plugins/owner-join.js (إضافة البوت لقروب عبر رابط)
handler.command = /^(تسجيل|تسجل|register|سجل|انضمام|اشتراك)$/i
export default handler
