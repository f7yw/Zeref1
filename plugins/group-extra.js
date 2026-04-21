/**
 * أوامر تحكم متقدمة للمجموعات
 */
import { isVip } from '../lib/economy.js'

const getName = async (conn, jid) => {
  try { return await conn.getName(jid) } catch { return jid.split('@')[0] }
}

function pJids(participants) {
  return participants.map(p => p.id || p.jid).filter(Boolean)
}

function targetUser(m, args) {
  const mention = m.mentionedJid?.[0]
  const quoted  = m.quoted?.sender
  const num     = (args.join(' ') || '').replace(/[^0-9]/g, '')
  if (mention) return mention
  if (quoted)  return quoted
  if (num.length >= 7) return `${num}@s.whatsapp.net`
  return null
}

function isAdmin(jid, participants) {
  const p = participants.find(x => (x.id || x.jid) === jid)
  return p?.admin === 'admin' || p?.admin === 'superadmin'
}

// ─────────────────────────────────────────────────────────────────────────────
let handler = async (m, { conn, args, text, command, participants, groupMetadata, usedPrefix, isAdmin: callerIsAdmin, isBotAdmin }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const members   = pJids(participants)
  const admins    = participants.filter(p => p.admin).map(p => p.id || p.jid)

  // ── رابط الدعوة ───────────────────────────────────────────────────────────
  if (/^(رابط|دعوة|invitelink|link)$/i.test(command)) {
    const code = await conn.groupInviteCode(m.chat)
    return m.reply(`🔗 *رابط انضمام القروب:*\nhttps://chat.whatsapp.com/${code}\n\n⚠️ أرسل هذا الرابط بحذر`)
  }

  // ── تجديد الرابط (إلغاء القديم) ──────────────────────────────────────────
  if (/^(تجديد_الرابط|رابط_جديد|revoke)$/i.test(command)) {
    await conn.groupRevokeInvite(m.chat)
    const newCode = await conn.groupInviteCode(m.chat)
    return m.reply(`✅ *تم تجديد رابط القروب*\n\n🔗 الرابط الجديد:\nhttps://chat.whatsapp.com/${newCode}`)
  }

  // ── قائمة الأعضاء ─────────────────────────────────────────────────────────
  if (/^(اعضاء|أعضاء|قائمة_الأعضاء|members)$/i.test(command)) {
    const lines = await Promise.all(
      members.map(async (jid, i) => {
        const tag = admins.includes(jid) ? '👑' : '👤'
        return `${i + 1}. ${tag} @${jid.split('@')[0]}`
      })
    )
    return conn.sendMessage(m.chat,
      { text: `📋 *أعضاء القروب* (${members.length})\n\n${lines.join('\n')}`, mentions: members },
      { quoted: m })
  }

  // ── قائمة المشرفين ────────────────────────────────────────────────────────
  if (/^(المشرفين|مشرفين|admins)$/i.test(command)) {
    if (!admins.length) return m.reply('لا يوجد مشرفون حالياً.')
    const lines = await Promise.all(admins.map(async (jid, i) => `${i + 1}. 👑 @${jid.split('@')[0]}`))
    return conn.sendMessage(m.chat,
      { text: `🛡️ *المشرفون* (${admins.length})\n\n${lines.join('\n')}`, mentions: admins },
      { quoted: m })
  }

  // ── إحصائيات المجموعة ─────────────────────────────────────────────────────
  if (/^(احصائيات|إحصائيات|groupinfo|معلومات_القروب)$/i.test(command)) {
    const createdAt = groupMetadata?.creation
      ? new Date(groupMetadata.creation * 1000).toLocaleDateString('ar-SA')
      : 'غير معروف'
    return m.reply(
`📊 *معلومات المجموعة*

📌 الاسم: *${groupMetadata?.subject || 'غير معروف'}*
👥 الأعضاء: *${members.length}*
👑 المشرفون: *${admins.length}*
👤 الأعضاء العاديون: *${members.length - admins.length}*
📅 تاريخ الإنشاء: *${createdAt}*
🔒 وضع الإرسال: *${groupMetadata?.announce ? 'مشرفون فقط' : 'الجميع'}*
📝 الوصف: ${groupMetadata?.desc || 'لا يوجد وصف'}`)
  }

  // ── طرد الجميع (غير المشرفين) ─────────────────────────────────────────────
  if (/^(طرد_الجميع|kickall|طرد_كل_الاعضاء)$/i.test(command)) {
    const targets = members.filter(jid => !admins.includes(jid) && jid !== conn.user?.id && jid !== conn.user?.jid)
    if (!targets.length) return m.reply('لا يوجد أعضاء غير مشرفين لطردهم.')
    await m.reply(`⏳ جاري طرد *${targets.length}* عضو...`)
    let done = 0, failed = 0
    for (const jid of targets) {
      try {
        await conn.groupParticipantsUpdate(m.chat, [jid], 'remove')
        done++
        await new Promise(r => setTimeout(r, 800))
      } catch { failed++ }
    }
    return m.reply(`✅ *اكتمل الطرد الجماعي*\n✔️ تم طرد: ${done}\n❌ فشل: ${failed}`)
  }

  // ── طرد عدة أشخاص دفعة واحدة ─────────────────────────────────────────────
  if (/^(طرد_متعدد|kickmulti)$/i.test(command)) {
    const targets = m.mentionedJid?.length
      ? m.mentionedJid
      : args.map(a => `${a.replace(/[^0-9]/g, '')}@s.whatsapp.net`).filter(j => j.length > 15)
    if (!targets.length) return m.reply(`حدد الأعضاء بالمنشن:\n${usedPrefix}${command} @شخص1 @شخص2`)
    let done = 0
    for (const jid of targets) {
      try { await conn.groupParticipantsUpdate(m.chat, [jid], 'remove'); done++; await new Promise(r => setTimeout(r, 600)) }
      catch {}
    }
    return conn.sendMessage(m.chat,
      { text: `✅ تم طرد *${done}* من أصل *${targets.length}*`, mentions: targets }, { quoted: m })
  }

  // ── ترقية متعددة ──────────────────────────────────────────────────────────
  if (/^(ترقية_متعددة|promotemulti)$/i.test(command)) {
    const targets = m.mentionedJid || []
    if (!targets.length) return m.reply(`حدد الأعضاء بالمنشن:\n${usedPrefix}${command} @شخص1 @شخص2`)
    for (const jid of targets) {
      try { await conn.groupParticipantsUpdate(m.chat, [jid], 'promote'); await new Promise(r => setTimeout(r, 500)) }
      catch {}
    }
    return conn.sendMessage(m.chat,
      { text: `✅ تمت ترقية *${targets.length}* عضو إلى مشرف`, mentions: targets }, { quoted: m })
  }

  // ── خفض متعدد ─────────────────────────────────────────────────────────────
  if (/^(خفض_متعدد|demotemulti)$/i.test(command)) {
    const targets = m.mentionedJid || []
    if (!targets.length) return m.reply(`حدد الأعضاء بالمنشن:\n${usedPrefix}${command} @شخص1 @شخص2`)
    for (const jid of targets) {
      try { await conn.groupParticipantsUpdate(m.chat, [jid], 'demote'); await new Promise(r => setTimeout(r, 500)) }
      catch {}
    }
    return conn.sendMessage(m.chat,
      { text: `✅ تم خفض *${targets.length}* مشرف`, mentions: targets }, { quoted: m })
  }

  // ── تغيير صورة القروب ────────────────────────────────────────────────────
  if (/^(صورة_القروب|صوره_القروب|seticon|غير_صورة)$/i.test(command)) {
    const isQuotedImg = m.quoted && (m.quoted.mtype === 'imageMessage' || m.quoted.mimetype?.startsWith?.('image'))
    const isOwnImg    = m.mtype === 'imageMessage' || m.msg?.mimetype?.startsWith?.('image')
    const img = isQuotedImg ? await m.quoted.download()
              : isOwnImg    ? await m.download()
              : null
    if (!img) return m.reply(`أرسل أو رُدّ على صورة مع الأمر:\n${usedPrefix}${command}`)
    try {
      const sharp = (await import('sharp')).default
      const cleaned = await sharp(img, { failOn: 'none' })
        .rotate().resize(640, 640, { fit: 'cover' })
        .jpeg({ quality: 90, mozjpeg: true }).toBuffer()
      await conn.updateProfilePicture(m.chat, cleaned)
      return m.reply('✅ تم تغيير صورة القروب بنجاح!')
    } catch (e) {
      return m.reply('❌ فشل تغيير الصورة: الملف تالف أو غير مدعوم.')
    }
  }

  // ── إزالة صورة القروب ────────────────────────────────────────────────────
  if (/^(حذف_صورة_القروب|removeicon)$/i.test(command)) {
    await conn.removeProfilePicture(m.chat)
    return m.reply('✅ تم حذف صورة القروب.')
  }

  // ── تفعيل طلبات الانضمام ────────────────────────────────────────────────
  if (/^(طلبات_انضمام|joinapproval)$/i.test(command)) {
    await conn.groupJoinedSubscribe(m.chat)
    return m.reply('✅ تم تفعيل الموافقة على طلبات الانضمام.')
  }

  // ── حظر التعديل لغير المشرفين ─────────────────────────────────────────────
  if (/^(قفل_الإعدادات|قفل_اعدادات|locksettings)$/i.test(command)) {
    await conn.groupSettingUpdate(m.chat, 'locked')
    return m.reply('🔒 الآن فقط المشرفون يمكنهم تعديل معلومات القروب.')
  }

  if (/^(فتح_الإعدادات|فتح_اعدادات|unlocksettings)$/i.test(command)) {
    await conn.groupSettingUpdate(m.chat, 'unlocked')
    return m.reply('🔓 الجميع يمكنهم الآن تعديل معلومات القروب.')
  }

  // ── منشن المشرفين فقط ────────────────────────────────────────────────────
  if (/^(منشن_مشرفين|tagadmins)$/i.test(command)) {
    const msg = text ? `*${text}*\n\n` : '*تنبيه للمشرفين:*\n\n'
    const lines = admins.map(jid => `@${jid.split('@')[0]}`).join(' ')
    return conn.sendMessage(m.chat, { text: msg + lines, mentions: admins }, { quoted: m })
  }

  // ── إرسال رسالة خاصة لعضو من داخل القروب ─────────────────────────────────
  if (/^(رسالة_خاصة|dm|message)$/i.test(command)) {
    const target = targetUser(m, args)
    const msg    = args.slice(m.mentionedJid?.[0] || text?.startsWith('@') ? 1 : 0).join(' ')
    if (!target) return m.reply(`استخدام:\n${usedPrefix}${command} @شخص رسالتك`)
    if (!msg.trim()) return m.reply('اكتب الرسالة بعد المنشن.')
    await conn.sendMessage(target, { text: `📩 *رسالة من مشرف* في مجموعة ${groupMetadata?.subject}:\n\n${msg}` })
    return m.reply(`✅ تم إرسال الرسالة الخاصة لـ @${target.split('@')[0]}`, null, { mentions: [target] })
  }

  // ── نشر رسالة لجميع الأعضاء في خاص ──────────────────────────────────────
  if (/^(رسالة_جماعية|broadcast)$/i.test(command)) {
    if (!text) return m.reply(`اكتب الرسالة:\n${usedPrefix}${command} الرسالة`)
    await m.reply(`📡 جاري إرسال البث لـ *${members.length}* عضو...`)
    let sent = 0, failed = 0
    for (const jid of members) {
      try {
        await conn.sendMessage(jid, {
          text: `📢 *بث من مجموعة ${groupMetadata?.subject}*\n\n${text}`
        })
        sent++
        await new Promise(r => setTimeout(r, 1200))
      } catch { failed++ }
    }
    return m.reply(`✅ *اكتمل البث*\n📤 وصل: ${sent}\n❌ فشل: ${failed}`)
  }

  // ── تنظيف المحادثة (حذف رسائل البوت) ───────────────────────────────────
  if (/^(تنظيف_القروب|cleanchat)$/i.test(command)) {
    return m.reply('⚠️ هذا الأمر يحتاج صلاحية حذف الرسائل يدوياً من واتساب. استخدم \`.تنظيف\` للرسائل المؤقتة.')
  }

  // ── تعيين رسالة الترحيب ──────────────────────────────────────────────────
  if (/^(رسالة_ترحيب|setwelcome)$/i.test(command)) {
    if (!text) return m.reply(`اكتب رسالة الترحيب (يمكنك استخدام {اسم} للاسم):\n${usedPrefix}${command} أهلاً {اسم} في قروبنا!`)
    global.db.data.chats[m.chat] ??= {}
    global.db.data.chats[m.chat].welcomeMsg = text
    await global.db.write()
    return m.reply(`✅ تم حفظ رسالة الترحيب:\n\n*${text}*`)
  }

  // ── تعيين رسالة الوداع ───────────────────────────────────────────────────
  if (/^(رسالة_وداع|setgoodbye)$/i.test(command)) {
    if (!text) return m.reply(`اكتب رسالة الوداع:\n${usedPrefix}${command} وداعاً {اسم}`)
    global.db.data.chats[m.chat] ??= {}
    global.db.data.chats[m.chat].goodbyeMsg = text
    await global.db.write()
    return m.reply(`✅ تم حفظ رسالة الوداع:\n\n*${text}*`)
  }

  // ── تفعيل/إيقاف الترحيب ─────────────────────────────────────────────────
  if (/^(تفعيل_ترحيب|تشغيل_ترحيب)$/i.test(command)) {
    global.db.data.chats[m.chat] ??= {}
    global.db.data.chats[m.chat].welcome = true
    await global.db.write()
    return m.reply('✅ تم تفعيل رسائل الترحيب.')
  }

  if (/^(إيقاف_ترحيب|تعطيل_ترحيب)$/i.test(command)) {
    global.db.data.chats[m.chat] ??= {}
    global.db.data.chats[m.chat].welcome = false
    await global.db.write()
    return m.reply('⛔ تم إيقاف رسائل الترحيب.')
  }

  // ── تثبيت رسالة ──────────────────────────────────────────────────────────
  if (/^(تثبيت|pin)$/i.test(command)) {
    if (!m.quoted) return m.reply(`رُدّ على رسالة مع الأمر ${usedPrefix}${command}`)
    // المدد المسموحة: 86400 (24س)، 604800 (7أ)، 2592000 (30ي)
    const requested = parseInt(args[0]) || 86400
    const allowed   = [86400, 604800, 2592000]
    const duration  = allowed.includes(requested) ? requested : 86400
    try {
      const key = m.quoted.vM?.key || {
        remoteJid: m.chat,
        fromMe: m.quoted.fromMe,
        id: m.quoted.id,
        ...(m.isGroup ? { participant: m.quoted.sender } : {})
      }
      await conn.sendMessage(m.chat, { pin: key, type: 1, time: duration })
      const label = duration === 604800 ? '7 أيام' : duration === 2592000 ? '30 يوم' : '24 ساعة'
      return m.reply(`📌 تم تثبيت الرسالة لمدة ${label}.`)
    } catch (e) {
      return m.reply(`❌ فشل التثبيت: ${e?.message || 'خطأ غير معروف'}`)
    }
  }

  // ── إلغاء تثبيت رسالة ────────────────────────────────────────────────────
  if (/^(الغاء_تثبيت|unpin)$/i.test(command)) {
    if (!m.quoted) return m.reply(`رُدّ على الرسالة المثبتة مع الأمر ${usedPrefix}${command}`)
    try {
      const key = m.quoted.vM?.key || {
        remoteJid: m.chat,
        fromMe: m.quoted.fromMe,
        id: m.quoted.id,
        ...(m.isGroup ? { participant: m.quoted.sender } : {})
      }
      await conn.sendMessage(m.chat, { pin: key, type: 2, time: 0 })
      return m.reply('📌 تم إلغاء تثبيت الرسالة.')
    } catch (e) {
      return m.reply(`❌ فشل إلغاء التثبيت: ${e?.message || 'خطأ غير معروف'}`)
    }
  }

  // ── عد أعضاء المجموعة ────────────────────────────────────────────────────
  if (/^(عدد_الاعضاء|count|كم_عضو)$/i.test(command)) {
    return m.reply(
`👥 *إحصاء الأعضاء*

📊 الإجمالي: *${members.length}* عضو
👑 المشرفون: *${admins.length}*
👤 الأعضاء: *${members.length - admins.length}*`)
  }

  // ── استخراج أرقام الأعضاء ────────────────────────────────────────────────
  if (/^(ارقام_الاعضاء|exportnumbers)$/i.test(command)) {
    const nums = members.map(jid => '+' + jid.split('@')[0]).join('\n')
    return m.reply(`📱 *أرقام أعضاء القروب (${members.length})*\n\n${nums}`)
  }

  // ── مغادرة البوت للمجموعة ────────────────────────────────────────────────
  if (/^(مغادرة_البوت|leavegc|botleave)$/i.test(command)) {
    await m.reply('👋 مع السلامة!')
    await new Promise(r => setTimeout(r, 1500))
    await conn.groupLeave(m.chat)
  }
}

handler.help = [
  'رابط', 'تجديد_الرابط', 'أعضاء', 'المشرفين', 'احصائيات',
  'طرد_الجميع', 'طرد_متعدد', 'ترقية_متعددة', 'خفض_متعدد',
  'صورة_القروب', 'قفل_الإعدادات', 'فتح_الإعدادات',
  'منشن_مشرفين', 'رسالة_خاصة', 'رسالة_جماعية',
  'رسالة_ترحيب', 'رسالة_وداع', 'تثبيت', 'الغاء_تثبيت',
  'عدد_الاعضاء', 'ارقام_الاعضاء', 'مغادرة_البوت'
]
handler.tags = ['group']
handler.command = /^(رابط|دعوة|invitelink|link|تجديد_الرابط|رابط_جديد|revoke|اعضاء|أعضاء|قائمة_الأعضاء|members|المشرفين|مشرفين|admins|احصائيات|إحصائيات|groupinfo|معلومات_القروب|طرد_الجميع|kickall|طرد_كل_الاعضاء|طرد_متعدد|kickmulti|ترقية_متعددة|promotemulti|خفض_متعدد|demotemulti|صورة_القروب|صوره_القروب|seticon|غير_صورة|حذف_صورة_القروب|removeicon|قفل_الإعدادات|قفل_اعدادات|locksettings|فتح_الإعدادات|فتح_اعدادات|unlocksettings|منشن_مشرفين|tagadmins|رسالة_خاصة|dm|message|رسالة_جماعية|broadcast|رسالة_ترحيب|setwelcome|رسالة_وداع|setgoodbye|تفعيل_ترحيب|تشغيل_ترحيب|إيقاف_ترحيب|تعطيل_ترحيب|تثبيت|pin|الغاء_تثبيت|unpin|عدد_الاعضاء|count|كم_عضو|ارقام_الاعضاء|exportnumbers|مغادرة_البوت|leavegc|botleave|طلبات_انضمام|joinapproval)$/i
handler.group  = true
handler.admin  = true
handler.botAdmin = true
export default handler
