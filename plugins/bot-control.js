/**
 * أوامر تحكم متقدمة بالبوت وحساب واتساب
 * المالك فقط — rowner = true
 */
import os from 'os'
import { fmt } from '../lib/economy.js'

const startTime = Date.now()

function uptime() {
  const ms  = Date.now() - startTime
  const s   = Math.floor(ms / 1000)
  const m   = Math.floor(s / 60)
  const h   = Math.floor(m / 60)
  const d   = Math.floor(h / 24)
  if (d) return `${d} يوم ${h % 24} ساعة`
  if (h) return `${h} ساعة ${m % 60} دقيقة`
  return `${m} دقيقة ${s % 60} ثانية`
}

function memMB() {
  const used = process.memoryUsage()
  return {
    rss:  (used.rss / 1024 / 1024).toFixed(1),
    heap: (used.heapUsed / 1024 / 1024).toFixed(1),
    ext:  (used.external / 1024 / 1024).toFixed(1),
    total: (os.totalmem() / 1024 / 1024).toFixed(0),
    free:  (os.freemem()  / 1024 / 1024).toFixed(0),
  }
}

const PRIVACY_MAP = {
  'كل': 'all', 'الكل': 'all',
  'جهات': 'contacts', 'جهات_الاتصال': 'contacts',
  'لا_احد': 'none', 'لا_أحد': 'none', 'لا': 'none'
}

// ─────────────────────────────────────────────────────────────────────────────
let handler = async (m, { conn, args, text, command, usedPrefix }) => {

  // ════════════════════════════════════════════════════════════════════════════
  // ─── معلومات البوت ──────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════

  if (/^(وقت_التشغيل|uptime|وقت_التشغيل_البوت)$/i.test(command)) {
    const mem = memMB()
    return m.reply(
`⏱️ *وقت التشغيل*

🕐 يعمل منذ: *${uptime()}*
🧠 RAM المستخدم: *${mem.rss} MB*
📦 Heap: *${mem.heap} MB*
🖥️ إجمالي RAM: *${mem.total} MB*
💾 RAM المتاح: *${mem.free} MB*
⚡ Node.js: *${process.version}*
🖥️ النظام: *${os.platform()} ${os.arch()}*`)
  }

  if (/^(رام|ram|ذاكرة|memory)$/i.test(command)) {
    const mem = memMB()
    const pct = Math.round((parseFloat(mem.rss) / parseFloat(mem.total)) * 100)
    const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10))
    return m.reply(
`🧠 *استخدام الذاكرة*

${bar} ${pct}%
💾 RSS: ${mem.rss} MB
📦 Heap: ${mem.heap} MB
🔌 External: ${mem.ext} MB
🖥️ المتاح: ${mem.free} / ${mem.total} MB`)
  }

  if (/^(تقرير_البوت|bot_report|تقرير_مفصل)$/i.test(command)) {
    const users  = Object.keys(global.db.data.users  || {}).length
    const chats  = Object.keys(global.db.data.chats  || {}).length
    const prems  = Object.values(global.db.data.users || {}).filter(u => u.premiumTime > Date.now()).length
    const banned = Object.values(global.db.data.users || {}).filter(u => u.banned).length
    const mem    = memMB()
    const allChats = Object.keys(global.db.data.chats || {})
    const groups   = allChats.filter(j => j.endsWith('@g.us')).length
    return m.reply(
`📊 *تقرير البوت الكامل*

⏱️ وقت التشغيل: *${uptime()}*
🧠 الذاكرة: *${mem.rss} MB*

─── قاعدة البيانات ───
👥 المستخدمون: *${users}*
💬 المحادثات: *${chats}*
👑 المميزون: *${prems}*
🚫 المحظورون: *${banned}*
📱 القروبات: *${groups}*

─── الأداء ───
⚡ Node.js: *${process.version}*
📦 المنصة: *${os.platform()}*
🔑 البريميوم الكلي: *${prems}*
📬 إجمالي الرسائل: *${Object.values(global.db.data.users || {}).reduce((a, u) => a + (u.messages?.total || 0), 0)}*`)
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ─── إعدادات البوت ──────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════

  if (/^(تفعيل_الكل|enable_all)$/i.test(command)) {
    let count = 0
    for (const chat of Object.values(global.db.data.chats || {})) {
      if (chat.botOff) { chat.botOff = false; count++ }
    }
    await global.db.write()
    return m.reply(`✅ تم تفعيل البوت في *${count}* محادثة.`)
  }

  if (/^(ايقاف_الكل|إيقاف_الكل|disable_all)$/i.test(command)) {
    let count = 0
    for (const chat of Object.values(global.db.data.chats || {})) {
      if (!chat.botOff) { chat.botOff = true; count++ }
    }
    await global.db.write()
    return m.reply(`⛔ تم إيقاف البوت في *${count}* محادثة.`)
  }

  if (/^(تغيير_البادئة|setprefix|بادئة)$/i.test(command)) {
    if (!text || text.trim().length > 3) return m.reply(`حدد الرمز الجديد (حرف أو رمز):\n${usedPrefix}${command} !`)
    const newPrefix = text.trim()[0]
    global.opts.prefix = newPrefix
    // حفظ في config إذا أمكن
    global.db.data.botSettings       ??= {}
    global.db.data.botSettings.prefix = newPrefix
    await global.db.write()
    return m.reply(`✅ تم تغيير البادئة إلى: *${newPrefix}*\nمثال: *${newPrefix}menu*`)
  }

  if (/^(مسح_الذاكرة|clearcache|clear_cache)$/i.test(command)) {
    if (global.gc) global.gc()
    const before = process.memoryUsage().rss
    // مسح الكاش المؤقت
    if (conn.games3)    conn.games3    = {}
    if (conn.quizGame)  conn.quizGame  = {}
    if (conn.games)     conn.games     = {}
    const after = process.memoryUsage().rss
    const freed = ((before - after) / 1024 / 1024).toFixed(2)
    return m.reply(`🧹 *تم مسح الذاكرة المؤقتة*\n💾 محرر: ${freed} MB\n🧠 الآن: ${(after/1024/1024).toFixed(1)} MB`)
  }

  if (/^(إعادة_تشغيل|restart|اعادة_تشغيل)$/i.test(command)) {
    await m.reply('🔄 جاري إعادة التشغيل...')
    setTimeout(() => process.exit(0), 2000)
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ─── قوائم القروبات والمحادثات ──────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════

  if (/^(قائمة_القروبات|list_groups|القروبات)$/i.test(command)) {
    const groups = []
    for (const [jid, data] of Object.entries(conn.chats || {})) {
      if (jid.endsWith('@g.us')) {
        const name = data.name || data.subject || jid.split('@')[0]
        groups.push({ jid, name })
      }
    }
    if (!groups.length) return m.reply('لا توجد قروبات مسجلة حالياً.')
    const lines = groups.slice(0, 50).map((g, i) => `${i + 1}. *${g.name}*\n   \`${g.jid}\``).join('\n')
    return m.reply(`📋 *القروبات (${groups.length})*\n\n${lines}${groups.length > 50 ? `\n\n...و ${groups.length - 50} قروب إضافي` : ''}`)
  }

  if (/^(بث_للقروبات|broadcast_groups|بث_قروبات)$/i.test(command)) {
    if (!text) return m.reply(`اكتب رسالة البث:\n${usedPrefix}${command} مرحباً بالجميع!`)
    const groups = Object.keys(conn.chats || {}).filter(j => j.endsWith('@g.us'))
    if (!groups.length) return m.reply('لا توجد قروبات.')
    await m.reply(`📡 جاري الإرسال لـ *${groups.length}* قروب...`)
    let sent = 0, failed = 0
    for (const jid of groups) {
      try {
        await conn.sendMessage(jid, { text: `📢 *رسالة من المطور:*\n\n${text}` })
        sent++
        await new Promise(r => setTimeout(r, 1500))
      } catch { failed++ }
    }
    return m.reply(`✅ *اكتمل البث*\n📤 وصل: ${sent}\n❌ فشل: ${failed}`)
  }

  if (/^(بث_للكل|broadcast_all|بث_عام)$/i.test(command)) {
    if (!text) return m.reply(`اكتب الرسالة:\n${usedPrefix}${command} النص`)
    const allChats = Object.keys(conn.chats || {}).filter(j => !j.endsWith('@broadcast'))
    await m.reply(`📡 جاري الإرسال لـ *${allChats.length}* محادثة...`)
    let sent = 0, failed = 0
    for (const jid of allChats) {
      try {
        await conn.sendMessage(jid, { text: `📢 *رسالة من المطور:*\n\n${text}` })
        sent++
        await new Promise(r => setTimeout(r, 1200))
      } catch { failed++ }
    }
    return m.reply(`✅ *اكتمل البث الكامل*\n📤 وصل: ${sent}\n❌ فشل: ${failed}`)
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ─── الحساب (واتساب) ────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════

  if (/^(اسم_البوت|setbotname|غير_اسم_البوت)$/i.test(command)) {
    if (!text) return m.reply(`اكتب الاسم الجديد:\n${usedPrefix}${command} زيريف`)
    await conn.updateProfileName(text.trim())
    return m.reply(`✅ تم تغيير اسم البوت إلى: *${text.trim()}*`)
  }

  if (/^(وصف_البوت|setbotbio|نبذة_البوت|غير_الوصف)$/i.test(command)) {
    if (!text) return m.reply(`اكتب النبذة الجديدة:\n${usedPrefix}${command} بوت واتساب متطور`)
    await conn.updateProfileStatus(text.trim())
    return m.reply(`✅ تم تغيير النبذة إلى:\n*${text.trim()}*`)
  }

  if (/^(صورة_البوت|setbotpic|غير_صورة_البوت)$/i.test(command)) {
    const isQuotedImg = m.quoted && (m.quoted.mtype === 'imageMessage' || m.quoted.mimetype?.startsWith?.('image'))
    const isOwnImg    = m.mtype === 'imageMessage' || m.msg?.mimetype?.startsWith?.('image')
    const img = isQuotedImg ? await m.quoted.download()
              : isOwnImg    ? await m.download()
              : null
    if (!img) return m.reply(`أرسل أو رُدّ على صورة مع الأمر:\n${usedPrefix}${command}`)
    try {
      const sharp = (await import('sharp')).default
      const cleaned = await sharp(img, { failOn: 'none' })
        .rotate()
        .resize(640, 640, { fit: 'cover' })
        .jpeg({ quality: 90, mozjpeg: true })
        .toBuffer()
      await conn.updateProfilePicture(conn.user.id, cleaned)
      return m.reply('✅ تم تغيير صورة البوت بنجاح!')
    } catch (e) {
      return m.reply('❌ فشل تغيير الصورة: الملف تالف أو غير مدعوم. جرّب صورة أخرى (PNG أو JPG عادي).')
    }
  }

  if (/^(حذف_صورة_البوت|removebotpic)$/i.test(command)) {
    await conn.removeProfilePicture(conn.user.id)
    return m.reply('✅ تم حذف صورة البوت.')
  }

  if (/^(صورة_الحساب_الحالية|botpic|صورتي)$/i.test(command)) {
    const pp = await conn.profilePictureUrl(conn.user.id, 'image').catch(() => null)
    if (!pp) return m.reply('لا توجد صورة حالية.')
    return conn.sendMessage(m.chat, { image: { url: pp }, caption: '🖼️ الصورة الحالية للبوت' }, { quoted: m })
  }

  // ─── الخصوصية ────────────────────────────────────────────────────────────

  if (/^(خصوصية_المشاهدة|last_seen|آخر_ظهور)$/i.test(command)) {
    const val = PRIVACY_MAP[(args[0] || '').trim()] || 'contacts'
    await conn.updateLastSeenPrivacy(val)
    const label = { all: 'الجميع', contacts: 'جهات الاتصال', none: 'لا أحد' }
    return m.reply(`✅ تم تغيير خصوصية آخر ظهور إلى: *${label[val]}*`)
  }

  if (/^(خصوصية_الصورة|pp_privacy|خصوصية_صورة_البوت)$/i.test(command)) {
    const val = PRIVACY_MAP[(args[0] || '').trim()] || 'contacts'
    await conn.updateProfilePicturePrivacy(val)
    const label = { all: 'الجميع', contacts: 'جهات الاتصال', none: 'لا أحد' }
    return m.reply(`✅ تم تغيير خصوصية صورة البوت إلى: *${label[val]}*`)
  }

  if (/^(خصوصية_الحالة|status_privacy)$/i.test(command)) {
    const val = PRIVACY_MAP[(args[0] || '').trim()] || 'contacts'
    await conn.updateStatusPrivacy(val)
    const label = { all: 'الجميع', contacts: 'جهات الاتصال', none: 'لا أحد' }
    return m.reply(`✅ تم تغيير خصوصية الحالة إلى: *${label[val]}*`)
  }

  if (/^(خصوصية_المجموعات|group_privacy|من_يضيفني)$/i.test(command)) {
    const val = PRIVACY_MAP[(args[0] || '').trim()] || 'contacts'
    await conn.updateGroupsAddPrivacy(val)
    const label = { all: 'الجميع', contacts: 'جهات الاتصال', none: 'لا أحد' }
    return m.reply(`✅ تم تغيير من يمكنه إضافتك للقروبات: *${label[val]}*\n\n💡 للتغيير: استخدم أحد:\n• كل — الجميع\n• جهات — جهات الاتصال\n• لا_أحد — لا أحد`)
  }

  if (/^(جميع_الخصوصية|privacy_all|كل_الخصوصية)$/i.test(command)) {
    const val = PRIVACY_MAP[(args[0] || '').trim()] || 'contacts'
    try { await conn.updateLastSeenPrivacy(val)       } catch {}
    try { await conn.updateProfilePicturePrivacy(val) } catch {}
    try { await conn.updateStatusPrivacy(val)         } catch {}
    try { await conn.updateGroupsAddPrivacy(val)      } catch {}
    try { await conn.updateOnlinePrivacy(val)         } catch {}
    const label = { all: 'الجميع', contacts: 'جهات الاتصال', none: 'لا أحد' }
    return m.reply(`✅ تم تعيين جميع إعدادات الخصوصية إلى: *${label[val]}*`)
  }

  // ─── الأجهزة المرتبطة ────────────────────────────────────────────────────

  if (/^(الاجهزة|الأجهزة_المرتبطة|linked_devices|اجهزتي)$/i.test(command)) {
    // Baileys لا يوفّر API مباشر لسرد كل الأجهزة المرتبطة — نجلب من user.devices إن وُجد
    // ومن authState كاحتياط، ونعرض على الأقل الجهاز الحالي
    let devices = []
    try {
      // طريقة 1: بعض إصدارات Baileys تعرّض user.devices
      if (Array.isArray(conn.user?.devices) && conn.user.devices.length) {
        devices = conn.user.devices
      }
      // طريقة 2: استعلام USync لأجهزة الرقم نفسه
      if (!devices.length && typeof conn.getUSyncDevices === 'function') {
        const me = conn.user?.id?.split(':')[0]?.split('@')[0]
        if (me) {
          const list = await conn.getUSyncDevices([me + '@s.whatsapp.net'], true, false).catch(() => [])
          devices = (list || []).map(j => ({ id: j }))
        }
      }
    } catch {}

    const meId   = conn.user?.id || conn.user?.lid || 'غير معروف'
    const meName = conn.user?.name || conn.user?.verifiedName || 'البوت'
    const platform = conn.authState?.creds?.platform || 'غير معروف'

    // ── البوتات الفرعية (Jadibot) — تُعرض في الحالتين ──
    let subBotsBlock = ''
    let totalConnections = 1
    try {
      const { listSubBots } = await import('../lib/jadibot.js')
      const subs = listSubBots()
      const onlineCount  = subs.filter(s => s.online).length
      const offlineCount = subs.length - onlineCount
      totalConnections = 1 + onlineCount
      if (subs.length) {
        const subLines = subs.map((s, i) =>
          `   ${i + 1}. +${s.phone}  ${s.online ? '🟢 متصل' : '🔴 غير متصل'}\n      🧩 ${s.features.join(', ') || '—'}`
        ).join('\n')
        subBotsBlock = `\n\n🤖 *البوتات الفرعية (${subs.length})*  —  🟢 ${onlineCount} | 🔴 ${offlineCount}\n${subLines}`
      } else {
        subBotsBlock = `\n\n🤖 *البوتات الفرعية:* لا يوجد بوتات فرعية مسجّلة.`
      }
    } catch (e) {
      subBotsBlock = `\n\n⚠️ تعذّر جلب البوتات الفرعية: ${e?.message || e}`
    }

    if (!devices.length) {
      return m.reply(
`📱 *الأجهزة المرتبطة*

🤖 الجهاز الحالي (البوت):
   • الاسم: *${meName}*
   • المعرّف: \`${meId}\`
   • المنصّة: *${platform}*

🔗 إجمالي الاتصالات النشطة: *${totalConnections}*

⚠️ Baileys لا يوفّر سرداً كاملاً لكل الأجهزة المرتبطة بالحساب.
لرؤية كل الأجهزة افتح: واتساب → الأجهزة المرتبطة على هاتفك.${subBotsBlock}`
      )
    }

    const lines = devices.map((d, i) => {
      const id = typeof d === 'string' ? d : (d.id || d.jid || 'غير معروف')
      const plat = (typeof d === 'object' && (d.platform || d.device)) || ''
      return `${i + 1}. 📱 ${plat ? `*${plat}*\n   ` : ''}ID: \`${id}\``
    }).join('\n')

    return m.reply(
`📱 *الأجهزة المرتبطة (${devices.length})*

${lines}

🔗 إجمالي الاتصالات النشطة: *${totalConnections}* (البوت الرئيسي + البوتات الفرعية المتصلة)${subBotsBlock}`
    )
  }

  // ─── رفض المكالمات ──────────────────────────────────────────────────────

  if (/^(رفض_المكالمات|reject_calls|حجب_مكالمات)$/i.test(command)) {
    global.db.data.botSettings       ??= {}
    global.db.data.botSettings.rejectCalls = true
    await global.db.write()
    return m.reply('📵 تم تفعيل رفض المكالمات تلقائياً.')
  }

  if (/^(قبول_المكالمات|allow_calls|تعطيل_رفض_مكالمات)$/i.test(command)) {
    global.db.data.botSettings       ??= {}
    global.db.data.botSettings.rejectCalls = false
    await global.db.write()
    return m.reply('📞 تم إيقاف رفض المكالمات.')
  }

  // ─── الحضور (Presence) ──────────────────────────────────────────────────

  if (/^(حضور_دائم|always_online|متاح_دائم)$/i.test(command)) {
    global.db.data.botSettings       ??= {}
    global.db.data.botSettings.alwaysOnline = true
    await global.db.write()
    await conn.sendPresenceUpdate('available', conn.user.id)
    return m.reply('🟢 تم تفعيل الحضور الدائم (متاح).')
  }

  if (/^(حضور_إيقاف|حضور_ايقاف|offline_presence)$/i.test(command)) {
    global.db.data.botSettings       ??= {}
    global.db.data.botSettings.alwaysOnline = false
    await global.db.write()
    await conn.sendPresenceUpdate('unavailable', conn.user.id)
    return m.reply('⚫ تم إيقاف الحضور الدائم.')
  }

  // ─── نشر حالة واتساب ────────────────────────────────────────────────────

  if (/^(نشر_حالة|post_status|حالة_واتساب|status_post)$/i.test(command)) {
    const isQuotedImg   = m.quoted && (m.quoted.mtype === 'imageMessage'   || m.quoted.mimetype?.startsWith?.('image'))
    const isQuotedVideo = m.quoted && (m.quoted.mtype === 'videoMessage'   || m.quoted.mimetype?.startsWith?.('video'))
    const isQuotedAudio = m.quoted && (m.quoted.mtype === 'audioMessage'   || m.quoted.mimetype?.startsWith?.('audio'))
    const hasText  = !!(text && text.trim())
    const hasMedia = isQuotedImg || isQuotedVideo || isQuotedAudio

    if (!hasText && !hasMedia) {
      return m.reply(
`📤 *نشر حالة واتساب*

الاستخدام:
• ${usedPrefix}${command} نص الحالة
• رُدّ على صورة/فيديو/صوت بـ ${usedPrefix}${command} [تعليق]

ملاحظة: تُنشر الحالة لجهات الاتصال المحفوظة فقط.`)
    }

    try {
      // اجمع جهات الاتصال الصحيحة (تنسيق @s.whatsapp.net فقط، وأرقام صحيحة)
      const audienceSet = new Set()
      const addJid = (jid) => {
        if (typeof jid !== 'string') return
        if (!jid.endsWith('@s.whatsapp.net')) return
        const num = jid.split('@')[0].replace(/\D/g, '')
        if (num.length < 6 || num.length > 16) return
        audienceSet.add(`${num}@s.whatsapp.net`)
      }
      for (const jid of Object.keys(conn.contacts || {})) addJid(jid)
      for (const u of Object.keys(global.db?.data?.users || {})) addJid(u)
      // أزل البوت نفسه من الجمهور
      const botNum = String(conn.user?.id || '').split(/[:@]/)[0].replace(/\D/g, '')
      if (botNum) audienceSet.delete(`${botNum}@s.whatsapp.net`)

      const audience = [...audienceSet]
      if (!audience.length) {
        return m.reply('❌ لا توجد جهات اتصال صالحة لنشر الحالة لها.\nأضف جهات اتصال على واتساب أولاً.')
      }

      const sendOpts = { backgroundColor: '#128C7E', font: 1, statusJidList: audience }

      if (isQuotedImg) {
        const img = await m.quoted.download()
        if (!img?.length) throw new Error('فشل تحميل الصورة')
        await conn.sendMessage('status@broadcast',
          { image: img, caption: text || m.quoted.caption || '' }, sendOpts)
      } else if (isQuotedVideo) {
        const vid = await m.quoted.download()
        if (!vid?.length) throw new Error('فشل تحميل الفيديو')
        await conn.sendMessage('status@broadcast',
          { video: vid, caption: text || m.quoted.caption || '' }, sendOpts)
      } else if (isQuotedAudio) {
        const aud = await m.quoted.download()
        if (!aud?.length) throw new Error('فشل تحميل الملف الصوتي')
        await conn.sendMessage('status@broadcast',
          { audio: aud, mimetype: 'audio/mp4', ptt: true }, sendOpts)
      } else {
        await conn.sendMessage('status@broadcast',
          { text: text.trim() }, sendOpts)
      }
      return m.reply(`✅ تم نشر الحالة بنجاح إلى *${audience.length}* جهة اتصال.`)
    } catch (e) {
      console.error('[STATUS]', e)
      return m.reply(`❌ فشل نشر الحالة: ${e?.message || 'خطأ غير معروف'}\n\n💡 تأكد من:\n• وجود جهات اتصال محفوظة\n• صحة الملف المُرفق`)
    }
  }

  // ─── إعداد الردود التلقائية ─────────────────────────────────────────────

  if (/^(رد_تلقائي|auto_reply|autoreply)$/i.test(command)) {
    const sub = (args[0] || '').toLowerCase()
    const chat = global.db.data.chats[m.chat] ??= {}
    if (sub === 'تشغيل' || sub === 'on') {
      chat.autoReply = true
      await global.db.write()
      return m.reply('✅ تم تفعيل الرد التلقائي في هذه المحادثة.')
    }
    if (sub === 'ايقاف' || sub === 'إيقاف' || sub === 'off') {
      chat.autoReply = false
      await global.db.write()
      return m.reply('⛔ تم إيقاف الرد التلقائي.')
    }
    return m.reply(`الوضع الحالي: *${chat.autoReply ? 'مفعل ✅' : 'متوقف ⛔'}*\n\nللتغيير:\n${usedPrefix}${command} تشغيل\n${usedPrefix}${command} ايقاف`)
  }

  // ─── لوحة تحكم البوت الكاملة ────────────────────────────────────────────

  if (/^(تحكم_البوت|bot_panel|لوحة_البوت|لوحة|لوحه|panel|اعدادات|إعدادات|settings)$/i.test(command)) {
    const mem  = memMB()
    const sets = global.db.data.botSettings || {}
    const users = Object.keys(global.db.data.users || {}).length
    const chat  = global.db.data.chats[m.chat] || {}
    return m.reply(
`╭────『 ⚙️ لوحة التحكم الكاملة 』────
│
│ ─── حالة البوت ───
│ ⏱️ وقت التشغيل: ${uptime()}
│ 🧠 الذاكرة: ${mem.rss} MB
│ 👥 المستخدمون: ${users}
│
│ ─── الأوضاع ───
│ 🌍 الوضع: ${global.opts?.self ? 'خاص للمالك' : 'عام'}
│ 👁️ قراءة الرسائل: ${global.opts?.autoread ? '✅ مفعل' : '❌ متوقف'}
│ 📵 رفض المكالمات: ${sets.rejectCalls ? '✅ مفعل' : '❌ متوقف'}
│ 🟢 حضور دائم: ${sets.alwaysOnline ? '✅ مفعل' : '❌ متوقف'}
│ 💬 رد تلقائي هنا: ${chat.autoReply ? '✅ مفعل' : '❌ متوقف'}
│
│ ─── أوامر التحكم ───
│ .اسم_البوت [اسم]
│ .وصف_البوت [نص]
│ .صورة_البوت (مع صورة)
│ .وقت_التشغيل
│ .رام
│ .تقرير_البوت
│ .تفعيل_الكل / .ايقاف_الكل
│ .بث_للقروبات [رسالة]
│ .بث_للكل [رسالة]
│ .قائمة_القروبات
│ .إعادة_تشغيل
│ .مسح_الذاكرة
│
│ ─── الخصوصية ───
│ .خصوصية_المشاهدة [كل/جهات/لا_أحد]
│ .خصوصية_الصورة [كل/جهات/لا_أحد]
│ .خصوصية_الحالة [كل/جهات/لا_أحد]
│ .خصوصية_المجموعات [كل/جهات/لا_أحد]
│ .جميع_الخصوصية [كل/جهات/لا_أحد]
│
│ ─── الحساب ───
│ .نشر_حالة [نص]
│ .حضور_دائم / .حضور_إيقاف
│ .رفض_المكالمات / .قبول_المكالمات
│ .الأجهزة_المرتبطة
│ .رد_تلقائي [تشغيل/ايقاف]
╰────────────────────────────`.trim())
  }
}

handler.help = [
  'تحكم_البوت', 'وقت_التشغيل', 'رام', 'تقرير_البوت',
  'اسم_البوت', 'وصف_البوت', 'صورة_البوت',
  'تفعيل_الكل', 'ايقاف_الكل', 'تغيير_البادئة',
  'بث_للقروبات', 'بث_للكل', 'قائمة_القروبات',
  'مسح_الذاكرة', 'إعادة_تشغيل',
  'خصوصية_المشاهدة', 'خصوصية_الصورة', 'خصوصية_الحالة',
  'خصوصية_المجموعات', 'جميع_الخصوصية',
  'نشر_حالة', 'حضور_دائم', 'رفض_المكالمات',
  'الأجهزة_المرتبطة', 'رد_تلقائي'
]
handler.tags  = ['owner']
handler.rowner = true
handler.command = /^(تحكم_البوت|bot_panel|لوحة_البوت|لوحة|لوحه|panel|اعدادات|إعدادات|settings|وقت_التشغيل|uptime|وقت_التشغيل_البوت|رام|ram|ذاكرة|memory|تقرير_البوت|bot_report|تقرير_مفصل|تفعيل_الكل|enable_all|ايقاف_الكل|إيقاف_الكل|disable_all|تغيير_البادئة|setprefix|بادئة|مسح_الذاكرة|clearcache|clear_cache|إعادة_تشغيل|restart|اعادة_تشغيل|قائمة_القروبات|list_groups|القروبات|بث_للقروبات|broadcast_groups|بث_قروبات|بث_للكل|broadcast_all|بث_عام|اسم_البوت|setbotname|غير_اسم_البوت|وصف_البوت|setbotbio|نبذة_البوت|غير_الوصف|صورة_البوت|setbotpic|غير_صورة_البوت|حذف_صورة_البوت|removebotpic|صورة_الحساب_الحالية|botpic|صورتي|خصوصية_المشاهدة|last_seen|آخر_ظهور|خصوصية_الصورة|pp_privacy|خصوصية_صورة_البوت|خصوصية_الحالة|status_privacy|خصوصية_المجموعات|group_privacy|من_يضيفني|جميع_الخصوصية|privacy_all|كل_الخصوصية|الاجهزة|الأجهزة_المرتبطة|linked_devices|اجهزتي|رفض_المكالمات|reject_calls|حجب_مكالمات|قبول_المكالمات|allow_calls|تعطيل_رفض_مكالمات|حضور_دائم|always_online|متاح_دائم|حضور_إيقاف|حضور_ايقاف|offline_presence|نشر_حالة|post_status|حالة_واتساب|رد_تلقائي|auto_reply|autoreply)$/i
export default handler
