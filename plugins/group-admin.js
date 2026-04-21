/**
 * أوامر إدارة المجموعات الأساسية
 * الأولوية: المطور > المميز = مشرف المجموعة > عادي
 */
import { isVip } from '../lib/economy.js'

function cleanNumber(input = '') {
  return input.replace(/[^0-9]/g, '')
}

function targetUser(m, args) {
  const mention = m.mentionedJid?.[0]
  const quoted  = m.quoted?.sender
  const number  = cleanNumber(args.join(' '))
  if (mention) return mention
  if (quoted)  return quoted
  if (number.length >= 7) return `${number}@s.whatsapp.net`
  return null
}

function participantJids(participants) {
  return participants.map(p => p.id || p.jid).filter(Boolean)
}

let handler = async (m, { conn, args, text, command, participants, usedPrefix }) => {
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }

  // ── تغيير اسم القروب ─────────────────────────────────────────────────────
  if (/^(اسم_القروب|اسم-القروب|تغيير_الاسم|setname)$/i.test(command)) {
    if (!text) return m.reply(`اكتب الاسم الجديد:\n${usedPrefix}${command} الاسم الجديد`)
    await conn.groupUpdateSubject(m.chat, text.trim())
    return m.reply(`✅ تم تغيير اسم القروب إلى:\n*${text.trim()}*`)
  }

  // ── تغيير وصف القروب ────────────────────────────────────────────────────
  if (/^(وصف_القروب|وصف-القروب|setdesc)$/i.test(command)) {
    if (!text) return m.reply(`اكتب الوصف الجديد:\n${usedPrefix}${command} الوصف`)
    await conn.groupUpdateDescription(m.chat, text.trim())
    return m.reply(`✅ تم تغيير وصف القروب.`)
  }

  // ── طرد عضو ───────────────────────────────────────────────────────────────
  if (/^(طرد|kick|حذف)$/i.test(command)) {
    const target = targetUser(m, args)
    if (!target) return m.reply(`حدد العضو:\n${usedPrefix}${command} @الشخص`)
    if (target === conn.user.jid) return m.reply('❌ لا أستطيع طرد نفسي.')
    await conn.groupParticipantsUpdate(m.chat, [target], 'remove')
    return conn.sendMessage(m.chat,
      { text: `✅ تم طرد @${target.split('@')[0]}`, mentions: [target] }, { quoted: m })
  }

  // ── إضافة عضو ─────────────────────────────────────────────────────────────
  if (/^(اضف|إضافة|اضافة|add)$/i.test(command)) {
    const target = targetUser(m, args)
    if (!target) return m.reply(`اكتب رقم العضو مع رمز الدولة:\n${usedPrefix}${command} 967xxxxxxxx`)
    await conn.groupParticipantsUpdate(m.chat, [target], 'add')
    return conn.sendMessage(m.chat,
      { text: `✅ تم إرسال طلب إضافة @${target.split('@')[0]}`, mentions: [target] }, { quoted: m })
  }

  // ── ترقية لمشرف ──────────────────────────────────────────────────────────
  if (/^(رفع|ترقية|promote|مشرف)$/i.test(command)) {
    const target = targetUser(m, args)
    if (!target) return m.reply(`حدد العضو:\n${usedPrefix}${command} @الشخص`)
    await conn.groupParticipantsUpdate(m.chat, [target], 'promote')
    const name = await getName(target)
    return conn.sendMessage(m.chat,
      { text: `✅ *${name}* (@${target.split('@')[0]}) أصبح مشرفاً 👑`, mentions: [target] }, { quoted: m })
  }

  // ── خفض مشرف ─────────────────────────────────────────────────────────────
  if (/^(خفض|تنزيل|demote)$/i.test(command)) {
    const target = targetUser(m, args)
    if (!target) return m.reply(`حدد العضو:\n${usedPrefix}${command} @الشخص`)
    await conn.groupParticipantsUpdate(m.chat, [target], 'demote')
    const name = await getName(target)
    return conn.sendMessage(m.chat,
      { text: `✅ تم خفض *${name}* (@${target.split('@')[0]}) من الإشراف`, mentions: [target] }, { quoted: m })
  }

  // ── قفل القروب ───────────────────────────────────────────────────────────
  if (/^(قفل_القروب|قفل-القروب|closegc|قفل)$/i.test(command)) {
    await conn.groupSettingUpdate(m.chat, 'announcement')
    return m.reply(`🔒 تم قفل القروب. المشرفون فقط يمكنهم الإرسال.`)
  }

  // ── فتح القروب ───────────────────────────────────────────────────────────
  if (/^(فتح_القروب|فتح-القروب|opengc|فتح)$/i.test(command)) {
    await conn.groupSettingUpdate(m.chat, 'not_announcement')
    return m.reply(`🔓 تم فتح القروب. الجميع يمكنهم الإرسال.`)
  }

  const members = participantJids(participants)

  // ── منشن مخفي ─────────────────────────────────────────────────────────────
  if (/^(منشن_مخفي|منشن-مخفي|مخفي|hidetag)$/i.test(command)) {
    const msg = text || 'تنبيه للجميع'
    return conn.sendMessage(m.chat, { text: msg, mentions: members }, { quoted: m })
  }

  // ── منشن ظاهر ─────────────────────────────────────────────────────────────
  if (/^(منشن_ظاهر|منشن-ظاهر|الكل|منشن|tagall)$/i.test(command)) {
    const header = text ? `*${text}*\n\n` : '*منشن جماعي:*\n\n'
    const list = (await Promise.all(members.map(async jid => `@${jid.split('@')[0]}`))).join(' ')
    return conn.sendMessage(m.chat, { text: header + list, mentions: members }, { quoted: m })
  }
}

handler.help = ['اسم_القروب', 'وصف_القروب', 'طرد', 'اضف', 'رفع', 'خفض', 'قفل_القروب', 'فتح_القروب', 'منشن_مخفي', 'منشن_ظاهر']
handler.tags = ['group']
handler.command = /^(اسم_القروب|اسم-القروب|تغيير_الاسم|setname|وصف_القروب|وصف-القروب|setdesc|طرد|kick|حذف|اضف|إضافة|اضافة|add|رفع|ترقية|promote|مشرف|خفض|تنزيل|demote|قفل_القروب|قفل-القروب|closegc|قفل|فتح_القروب|فتح-القروب|opengc|فتح|منشن_مخفي|منشن-مخفي|مخفي|hidetag|منشن_ظاهر|منشن-ظاهر|الكل|منشن|tagall)$/i
handler.group    = true
handler.admin    = true
handler.botAdmin = true
export default handler
