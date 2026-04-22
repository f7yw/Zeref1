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

function explainError(e) {
  const raw = (e?.data || e?.output?.statusCode || e?.message || '').toString().toLowerCase()
  if (raw.includes('forbidden') || raw.includes('403')) return 'البوت ليس مشرفاً في هذا القروب.'
  if (raw.includes('not-authorized') || raw.includes('401')) return 'لا يوجد صلاحية لتنفيذ هذا الأمر.'
  if (raw.includes('item-not-found') || raw.includes('404')) return 'هذا الرقم غير موجود على واتساب.'
  if (raw.includes('conflict') || raw.includes('409')) return 'العضو موجود مسبقاً أو حالته لا تسمح بالعملية.'
  if (raw.includes('bad-request') || raw.includes('400')) return 'الرقم غير صالح أو لا يمكن إضافته (قد يحتاج دعوة برابط).'
  if (raw.includes('rate') || raw.includes('429')) return 'تم تجاوز الحد المسموح، حاول لاحقاً.'
  return 'فشل تنفيذ الأمر. تأكد من صلاحيات البوت وصحة الرقم.'
}

async function safeUpdate(conn, chat, jids, action) {
  try {
    const res = await conn.groupParticipantsUpdate(chat, jids, action)
    const failed = (res || []).filter(r => r.status && r.status !== '200')
    if (failed.length === (jids?.length || 0) && failed.length > 0) {
      const codes = failed.map(f => f.status).join(',')
      throw Object.assign(new Error('all-failed: ' + codes), { data: codes })
    }
    return { ok: true, res }
  } catch (e) {
    return { ok: false, error: e, message: explainError(e) }
  }
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
    const r = await safeUpdate(conn, m.chat, [target], 'remove')
    if (!r.ok) return m.reply(`❌ تعذر طرد @${target.split('@')[0]}\nالسبب: ${r.message}`)
    return conn.sendMessage(m.chat,
      { text: `✅ تم طرد @${target.split('@')[0]}`, mentions: [target] }, { quoted: m })
  }

  // ── إضافة عضو ─────────────────────────────────────────────────────────────
  if (/^(اضف|إضافة|اضافة|add)$/i.test(command)) {
    const target = targetUser(m, args)
    if (!target) return m.reply(`اكتب رقم العضو مع رمز الدولة:\n${usedPrefix}${command} 967xxxxxxxx`)
    const r = await safeUpdate(conn, m.chat, [target], 'add')
    if (!r.ok) {
      try {
        const code = await conn.groupInviteCode(m.chat).catch(() => null)
        const link = code ? `\nرابط الدعوة: https://chat.whatsapp.com/${code}` : ''
        return m.reply(`❌ تعذر إضافة @${target.split('@')[0]}\nالسبب: ${r.message}${link}`)
      } catch {
        return m.reply(`❌ تعذر إضافة @${target.split('@')[0]}\nالسبب: ${r.message}`)
      }
    }
    return conn.sendMessage(m.chat,
      { text: `✅ تم إرسال طلب إضافة @${target.split('@')[0]}`, mentions: [target] }, { quoted: m })
  }

  // ── ترقية لمشرف ──────────────────────────────────────────────────────────
  if (/^(رفع|ترقية|promote|مشرف)$/i.test(command)) {
    const target = targetUser(m, args)
    if (!target) return m.reply(`حدد العضو:\n${usedPrefix}${command} @الشخص`)
    const r = await safeUpdate(conn, m.chat, [target], 'promote')
    if (!r.ok) return m.reply(`❌ تعذر الترقية\nالسبب: ${r.message}`)
    const name = await getName(target)
    return conn.sendMessage(m.chat,
      { text: `✅ *${name}* (@${target.split('@')[0]}) أصبح مشرفاً 👑`, mentions: [target] }, { quoted: m })
  }

  // ── خفض مشرف ─────────────────────────────────────────────────────────────
  if (/^(خفض|تنزيل|demote)$/i.test(command)) {
    const target = targetUser(m, args)
    if (!target) return m.reply(`حدد العضو:\n${usedPrefix}${command} @الشخص`)
    const r = await safeUpdate(conn, m.chat, [target], 'demote')
    if (!r.ok) return m.reply(`❌ تعذر الخفض\nالسبب: ${r.message}`)
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
handler.command = /^(اسم_القروب|اسم-القروب|تغيير_الاسم|setname|وصف_القروب|وصف-القروب|setdesc|طرد|kick|اضف|إضافة|اضافة|add|رفع|ترقية|promote|مشرف|خفض|تنزيل|demote|قفل_القروب|قفل-القروب|closegc|قفل|فتح_القروب|فتح-القروب|opengc|فتح|منشن_مخفي|منشن-مخفي|مخفي|hidetag|منشن_ظاهر|منشن-ظاهر|الكل|منشن|tagall)$/i
handler.group    = true
handler.admin    = true
handler.botAdmin = true
export default handler
