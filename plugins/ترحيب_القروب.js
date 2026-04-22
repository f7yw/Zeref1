/**
 * 👋 ترحيب القروب (Group Welcome / Goodbye)
 * ───────────────────────────────────────────
 * يرسل رسالة ترحيب تلقائية لكل عضو جديد ينضم للقروب،
 * مع منشن العضو وبياناته (الاسم، الرقم، رقم العضو في القروب،
 * صورة الملف الشخصي إن وُجدت).
 *
 * الإعدادات لكل قروب على حدة (per-chat) ومحفوظة في DB.chats[jid]:
 *   welcome:        true|false  (افتراضي true)
 *   welcomeText:    نص قابل للتخصيص
 *   goodbye:        true|false  (افتراضي true)
 *   goodbyeText:    نص قابل للتخصيص
 *
 * المتغيّرات المتاحة في النص:
 *   {user}     ← منشن العضو
 *   {name}     ← اسم العضو الكامل/المعروف
 *   {number}   ← رقمه
 *   {group}    ← اسم القروب
 *   {desc}     ← وصف القروب (سطر واحد)
 *   {count}    ← عدد الأعضاء بعد الانضمام
 *   {bot}      ← اسم البوت
 *
 * الأوامر (للمشرفين فقط):
 *   .ترحيب                  ← عرض الحالة
 *   .ترحيب تشغيل|ايقاف
 *   .ترحيب نص <الرسالة>     ← تخصيص النص
 *   .ترحيب افتراضي          ← استرجاع النص الافتراضي
 *   .وداع تشغيل|ايقاف|نص…   ← نفس الشيء لرسالة الوداع
 */

const DEFAULT_WELCOME =
`╭───『 🎉 *أهلاً بك في {group}* 』
│
│ 👤 *العضو:* {user}
│ 🪪 *الاسم:* {name}
│ 📱 *الرقم:* +{number}
│ #️⃣ *رقم العضوية:* {count}
│
│ 📜 {desc}
│
│ 🤖 لاستخدام البوت أرسل: *.اوامر*
╰────────`

const DEFAULT_GOODBYE =
`╭───『 👋 *وداعاً* 』
│
│ غادر/طُرد العضو {user}
│ 🪪 {name}
│ 👥 *العدد المتبقي:* {count}
│
╰────────`

function getChatCfg(jid) {
  global.db.data.chats ??= {}
  global.db.data.chats[jid] ??= {}
  const c = global.db.data.chats[jid]
  if (c.welcome === undefined)     c.welcome = true
  if (c.goodbye === undefined)     c.goodbye = true
  if (!c.welcomeText) c.welcomeText = DEFAULT_WELCOME
  if (!c.goodbyeText) c.goodbyeText = DEFAULT_GOODBYE
  return c
}

// ── يستدعى من main.js عند انضمام/مغادرة عضو ───────────────────────────────
export async function fireGroupWelcome(conn, groupJid, participantJid, kind /* 'add'|'remove' */) {
  try {
    if (!groupJid || !participantJid) return
    const cfg = getChatCfg(groupJid)
    if (kind === 'add'    && !cfg.welcome) return
    if (kind === 'remove' && !cfg.goodbye) return

    let meta = null
    try { meta = await conn.groupMetadata(groupJid) } catch (_) {}
    const groupName = meta?.subject || 'المجموعة'
    const groupDesc = (meta?.desc || '—').toString().split('\n')[0].slice(0, 200) || '—'
    const count     = meta?.participants?.length ?? 0

    let displayName = String(participantJid).split('@')[0]
    try { displayName = (await conn.getName?.(participantJid)) || displayName } catch (_) {}
    const number    = String(participantJid).split('@')[0].split(':')[0]
    const botName   = conn.user?.name || 'ZEREF'

    const tpl = kind === 'add' ? cfg.welcomeText : cfg.goodbyeText
    const text = String(tpl)
      .replace(/\{user\}/g,   '@' + number)
      .replace(/\{name\}/g,   displayName)
      .replace(/\{number\}/g, number)
      .replace(/\{group\}/g,  groupName)
      .replace(/\{desc\}/g,   groupDesc)
      .replace(/\{count\}/g,  String(count))
      .replace(/\{bot\}/g,    botName)

    // حاول جلب صورة العضو وإرسالها مع النص
    let ppUrl = null
    if (kind === 'add') {
      try { ppUrl = await conn.profilePictureUrl(participantJid, 'image').catch(() => null) } catch (_) {}
    }

    const mentions = [participantJid]
    if (ppUrl) {
      try {
        await conn.sendMessage(groupJid, { image: { url: ppUrl }, caption: text, mentions })
        return
      } catch (_) { /* fallback to plain text */ }
    }
    await conn.sendMessage(groupJid, { text, mentions }).catch(() => {})
  } catch (e) {
    console.error('[WELCOME]', e?.message)
  }
}

// تسجيل عالمي لاستخدامه في main.js
global.fireGroupWelcome = fireGroupWelcome

// ── أوامر التحكّم (للمشرفين فقط) ──────────────────────────────────────────
let handler = async (m, { args, command, isAdmin, isOwner }) => {
  if (!m.isGroup) throw '⚠️ هذا الأمر يعمل داخل القروبات فقط.'
  if (!isAdmin && !isOwner) throw '🛡️ هذا الأمر للمشرفين فقط.'

  const cfg = getChatCfg(m.chat)
  const isGoodbye = /^(وداع|goodbye|bye)$/i.test(command)
  const key       = isGoodbye ? 'goodbye'     : 'welcome'
  const textKey   = isGoodbye ? 'goodbyeText' : 'welcomeText'
  const def       = isGoodbye ? DEFAULT_GOODBYE : DEFAULT_WELCOME
  const label     = isGoodbye ? 'الوداع' : 'الترحيب'

  const sub = (args[0] || '').toLowerCase()

  if (/^(تشغيل|on|نعم|فعل)$/.test(sub)) {
    cfg[key] = true; global.markDirty?.()
    return m.reply(`✅ تم تفعيل ${label} في هذا القروب.`)
  }
  if (/^(ايقاف|إيقاف|off|تعطيل|اطفاء)$/.test(sub)) {
    cfg[key] = false; global.markDirty?.()
    return m.reply(`⛔ تم إيقاف ${label} في هذا القروب.`)
  }
  if (sub === 'نص' || sub === 'text') {
    const txt = args.slice(1).join(' ').trim()
    if (!txt) throw `اكتب النص بعد الكلمة.\nمثال: .${command} نص أهلاً {user} في {group}`
    cfg[textKey] = txt; global.markDirty?.()
    return m.reply(`✅ تم تحديث نص ${label}.\n\n📝 *المعاينة:*\n${txt}`)
  }
  if (sub === 'افتراضي' || sub === 'reset') {
    cfg[textKey] = def; global.markDirty?.()
    return m.reply(`✅ تم استرجاع النص الافتراضي لـ ${label}.`)
  }
  if (sub === 'تجربة' || sub === 'test') {
    await fireGroupWelcome(m.conn || global.conn, m.chat, m.sender, isGoodbye ? 'remove' : 'add')
    return
  }

  return m.reply(
`╭───『 👋 إعدادات ${label} 』
│
│ 🔘 *الحالة:* ${cfg[key] ? '✅ مفعَّل' : '⛔ متوقف'}
│
│ 📝 *النص الحالي:*
│ ${String(cfg[textKey]).split('\n').slice(0, 5).join('\n│ ')}${String(cfg[textKey]).split('\n').length > 5 ? '\n│ ...' : ''}
│
╰────────

⚙️ *الأوامر:*
• .${command} تشغيل
• .${command} ايقاف
• .${command} نص <رسالتك>
• .${command} افتراضي
• .${command} تجربة

🧩 *المتغيّرات:* {user} {name} {number} {group} {desc} {count} {bot}`)
}

handler.command = /^(ترحيب|welcome|وداع|goodbye|bye)$/i
handler.help    = ['ترحيب', 'وداع']
handler.tags    = ['group']
handler.group   = true
handler.admin   = true

export default handler
