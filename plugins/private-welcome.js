/**
 * 👋 ترحيب الخاص (First-DM Welcome)
 * ────────────────────────────────────
 * عند أول رسالة خاصة من أي رقم جديد إلى البوت → يرسل البوت رسالة تعريفية
 * تخبر المستخدم بأنه يتحدث مع بوت آلي وليس إنساناً، ويُرشده للأوامر.
 *
 * - المالك/المميزون مستثنون.
 * - رسالة الترحيب تُحفَظ مرّة واحدة لكل رقم في DB كي لا تتكرر.
 * - يمكن للمطور تخصيص النص أو إيقافها.
 *
 * أوامر:
 *   .ترحيب_الخاص             ← عرض الحالة
 *   .ترحيب_الخاص تشغيل|ايقاف ← تفعيل/إيقاف
 *   .ترحيب_الخاص نص <الرسالة> ← تخصيص النص (يدعم {name} و {bot})
 *   .تصفير_ترحيب @           ← يُعيد إرسال الترحيب لرقم بعينه
 */

const KEY = 'privateWelcome'

const DEFAULT_TEXT =
`👋 *مرحباً {name}*

أنا *{bot}* — بوتٌ آلي، لستُ إنساناً 🤖
هذه قناة آلية مخصّصة للأوامر فقط. لن يردّ عليك شخص هنا.

🧭 *للاستخدام:*
• أرسل  *.اوامر*  أو  *.menu*  لعرض القائمة الكاملة.
• الأوامر تبدأ بنقطة، مثل:  *.تسجيل*  ،  *.قران*  ،  *.شطرنج*

⚠️ إن تواصلت معي بدون داعٍ قد تُحظر تلقائياً.
شكراً لتفهّمك 🌿`

function getCfg() {
  global.db.data.botSettings ??= {}
  global.db.data.botSettings[KEY] ??= { enabled: true, text: DEFAULT_TEXT, greeted: {} }
  const cfg = global.db.data.botSettings[KEY]
  cfg.greeted ??= {}
  return cfg
}

let handler = async (m, { args, command, isOwner }) => {
  if (!isOwner) throw '❌ هذا الأمر للمطور فقط.'
  const cfg = getCfg()

  if (/^تصفير_ترحيب$/i.test(command)) {
    const target = m.mentionedJid?.[0] || m.quoted?.sender
    if (!target) throw 'منشن العضو الذي تريد إعادة الترحيب له.'
    delete cfg.greeted[target]
    global.db.markDirty?.()
    return m.reply(`✅ سيُعاد إرسال الترحيب لـ @${target.split('@')[0]} عند رسالته القادمة.`, null, { mentions: [target] })
  }

  const sub = (args[0] || '').toLowerCase()

  if (/^(تشغيل|on|نعم|فعل)$/.test(sub)) {
    cfg.enabled = true; global.db.markDirty?.()
    return m.reply('✅ تم تفعيل ترحيب الخاص. سيستقبل كل رقم جديد رسالة تعريفية تلقائياً.')
  }
  if (/^(ايقاف|إيقاف|off|تعطيل|اطفاء)$/.test(sub)) {
    cfg.enabled = false; global.db.markDirty?.()
    return m.reply('⛔ تم إيقاف ترحيب الخاص.')
  }
  if (sub === 'نص' || sub === 'text') {
    const newText = args.slice(1).join(' ').trim()
    if (!newText) throw 'اكتب النص بعد الكلمة.\nمثال: .ترحيب_الخاص نص أهلاً {name}، أنا {bot}'
    cfg.text = newText; global.db.markDirty?.()
    return m.reply(`✅ تم تحديث نص الترحيب.\n\n📝 *المعاينة:*\n${newText}`)
  }
  if (sub === 'افتراضي' || sub === 'reset') {
    cfg.text = DEFAULT_TEXT; global.db.markDirty?.()
    return m.reply('✅ تم استرجاع النص الافتراضي.')
  }

  return m.reply(
`╭───『 👋 ترحيب الخاص 』
│
│ 🔘 *الحالة:* ${cfg.enabled ? '✅ مفعَّل' : '⛔ متوقف'}
│ 👥 *تم الترحيب بـ:* ${Object.keys(cfg.greeted).length} رقم
│
│ 📝 *النص الحالي:*
│ ${cfg.text.split('\n').slice(0, 4).join('\n│ ')}${cfg.text.split('\n').length > 4 ? '\n│ ...' : ''}
│
╰────────

⚙️ *الأوامر:*
• .ترحيب_الخاص تشغيل
• .ترحيب_الخاص ايقاف
• .ترحيب_الخاص نص <رسالتك>
   (متغيرات: {name} {bot})
• .ترحيب_الخاص افتراضي
• .تصفير_ترحيب @عضو`)
}

handler.command = /^(ترحيب_الخاص|private_welcome|pwelcome|تصفير_ترحيب)$/i
handler.help = ['ترحيب_الخاص', 'تصفير_ترحيب']
handler.tags = ['owner']
handler.owner = true

// ── خطّاف before: يرسل ترحيب لأي رقم جديد في الخاص ────────────────────────
handler.before = async function (m, { conn, isOwner, isROwner, isPrems }) {
  try {
    const cfg = getCfg()
    if (!cfg.enabled) return
    if (m.isGroup || m.fromMe) return
    if (isOwner || isROwner || isPrems) return
    const sender = m.sender
    if (!sender || !sender.endsWith('@s.whatsapp.net')) return
    if (cfg.greeted[sender]) return

    // علّم قبل الإرسال (تجنّب السباق)
    cfg.greeted[sender] = Date.now()
    global.db.markDirty?.()

    let name = sender.split('@')[0]
    try { name = await conn.getName(sender) || name } catch {}
    const botName = conn.user?.name || 'ZEREF Bot'

    const text = (cfg.text || DEFAULT_TEXT)
      .replace(/\{name\}/g, name)
      .replace(/\{bot\}/g, botName)

    await conn.sendMessage(sender, { text }).catch(() => {})
  } catch (_) {}
}

export default handler
