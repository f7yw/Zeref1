import { isVip } from '../lib/economy.js'
/**
 * بلوك / فك_البلوك — Block & Unblock
 * Accepts: @mention | reply | raw number (e.g. 967778088098)
 * Owner-only
 */

function resolveTarget(m, text) {
  // 1. mention
  let jid = m.mentionedJid?.[0]
  // 2. reply
  if (!jid) jid = m.quoted?.sender
  // 3. raw number in text
  if (!jid) {
    const digits = (text || '').replace(/\D/g, '')
    if (digits.length >= 8) jid = `${digits}@s.whatsapp.net`
  }
  if (!jid) return null
  // updateBlockStatus لا يقبل @lid — حوّل إلى @s.whatsapp.net
  if (jid.endsWith('@lid')) {
    const mapped = global.lidPhoneMap?.[jid]
    if (mapped) jid = mapped
    else {
      const num = jid.split('@')[0].replace(/\D/g, '')
      if (num.length >= 8) jid = `${num}@s.whatsapp.net`
    }
  }
  return jid
}

function safeNum(jid) {
  return jid ? jid.split('@')[0] : '?'
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  const isBlock   = /^(بلوك|blok|block)$/i.test(command)
  const action    = isBlock ? 'block' : 'unblock'
  const actionAr  = isBlock ? 'حظر' : 'رفع الحظر'
  const icon      = isBlock ? '🚫' : '✅'

  const target = resolveTarget(m, text)

  if (!target) {
    return m.reply(
`╭────『 ${icon} ${actionAr} 』────
│
│ ❌ لم يتم تحديد المستخدم!
│
│ 📖 طرق الاستخدام:
│
│ 1️⃣  المنشن:
│   ${usedPrefix}${command} @شخص
│
│ 2️⃣  الرد على رسالته:
│   رُد على رسالته ثم اكتب ${usedPrefix}${command}
│
│ 3️⃣  رقم الهاتف مباشرة:
│   ${usedPrefix}${command} 967778088098
│
╰──────────────────`.trim()
    )
  }

  // Protect owner and bot from being blocked
  const ownerNums = (global.owner || []).map(e => String(Array.isArray(e) ? e[0] : e).replace(/\D/g, ''))
  const botNum    = (global.db?.data?.settings?.botNumber || conn.user?.id || '').replace(/\D/g, '').slice(0, 12)
  const targetNum = safeNum(target)

  if (ownerNums.some(n => n === targetNum)) {
    return m.reply(`╭────『 ⚠️ محمي 』────\n│\n│ ❌ لا يمكن ${actionAr} مالك البوت.\n│\n╰──────────────────`.trim())
  }
  if (botNum && targetNum === botNum) {
    return m.reply(`╭────『 ⚠️ خطأ 』────\n│\n│ ❌ لا يمكن ${actionAr} البوت نفسه.\n│\n╰──────────────────`.trim())
  }

  try {
    await conn.updateBlockStatus(target, action)

    let displayName = `@${targetNum}`
    try { displayName = (await conn.getName(target)) || displayName } catch (_) {}

    await m.reply(
`╭────『 ${icon} ${actionAr} 』────
│
│ ${icon} تمّ بنجاح!
│
│ 👤 المستخدم: *${displayName}*
│ 📱 الرقم:    *+${targetNum}*
│ 🔧 العملية:  *${actionAr}*
│
╰──────────────────`.trim(),
      null, { mentions: [target] }
    )
  } catch (e) {
    await m.reply(
`╭────『 ❌ فشل 』────
│
│ تعذّرت العملية للمستخدم @${targetNum}
│ السبب: ${e?.message || 'خطأ غير معروف'}
│
│ تأكد أن الرقم صحيح ومسجل على واتساب.
│
╰──────────────────`.trim(),
      null, { mentions: [target] }
    )
  }
}

handler.help    = ['بلوك <@شخص|رقم>', 'فك_البلوك <@شخص|رقم>']
handler.tags    = ['owner']
handler.command = /^(بلوك|blok|block|فك_البلوك|فك-البلوك|رفع-البلوك|unblok|unblock)$/i
handler.rowner  = true
export default handler
