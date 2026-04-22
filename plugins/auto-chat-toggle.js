// ─── التحكّم بمؤشّر "جاري الكتابة..." ───────────────────────────────────────
// يضبط ظهور إشعار "...يكتب" لمدة 5 ثوانٍ الذي يُرسله البوت لكل رسالة واردة.
// هذا المؤشر كان يضايق بعض الأعضاء، لذا أصبح قابلاً للإطفاء.
// الإعداد لكل بوت (رئيسي/فرعي) ويُحفظ في Supabase.
//   • settings[botJid].showTyping  (افتراضياً true)
// ─────────────────────────────────────────────────────────────────────────────

let handler = async (m, { conn, args, command, isROwner, isOwner }) => {
  const sub = (args[0] || '').toLowerCase().trim()
  const botJid = conn?.user?.jid || conn?.user?.id || 'main'

  global.db.data.settings = global.db.data.settings || {}
  const s = global.db.data.settings[botJid] = global.db.data.settings[botJid] || {}
  if (typeof s.showTyping !== 'boolean') s.showTyping = true

  if (!isROwner && !isOwner) {
    return m.reply(box('🛡️ صلاحيات غير كافية', [
      'هذا الإعداد يخصّ المطور فقط.',
      `الحالة الحالية: *${s.showTyping ? '✅ يظهر "يكتب..."' : '⛔ صامت'}*`,
    ]))
  }

  if (/^(تشغيل|on|نعم|فعل|اظهار|إظهار)$/i.test(sub)) {
    s.showTyping = true
    global.markDirty?.()
    return m.reply(box('⌨️ تشغيل مؤشّر الكتابة', [
      '✅ سيظهر إشعار "...يكتب" قبل كل ردّ (5 ثوانٍ).',
      '💾 الإعداد محفوظ في السحاب.',
    ]))
  }

  if (/^(ايقاف|إيقاف|off|تعطيل|اطفاء|اخفاء|إخفاء)$/i.test(sub)) {
    s.showTyping = false
    global.markDirty?.()
    return m.reply(box('🤐 إيقاف مؤشّر الكتابة', [
      '⛔ لن يظهر "...يكتب" بعد الآن.',
      'الردود نفسها تعمل كالمعتاد — فقط المؤشّر أُخفي.',
      '💾 الإعداد محفوظ في السحاب.',
    ]))
  }

  return m.reply(box('⌨️ مؤشّر "جاري الكتابة..."', [
    `🔘 الحالة: *${s.showTyping ? '✅ يظهر للأعضاء' : '⛔ مخفي'}*`,
    `⏱️ المدّة: 5 ثوانٍ بعد كل رسالة واردة`,
    `🤖 البوت: ${botJid.split('@')[0] || 'الرئيسي'}`,
    '',
    '⚙️ التحكّم:',
    `• .${command} تشغيل   — إظهار المؤشّر`,
    `• .${command} ايقاف   — إخفاء المؤشّر`,
    '',
    '💡 يطبَّق على هذا البوت فقط (رئيسي أو فرعي).',
  ]))
}

function box(title, lines) {
  return `╭────『 ${title} 』────\n│\n│ ${lines.join('\n│ ')}\n│\n╰──────────────────`
}

handler.help    = ['كتابة_البوت [تشغيل|ايقاف]']
handler.tags    = ['owner']
handler.command = /^(كتابة_البوت|كتابه_البوت|مؤشر_الكتابة|مؤشر_الكتابه|اظهار_الكتابة|إظهار_الكتابة|typing|show_typing)$/i
handler.rowner  = false
handler.owner   = true

export default handler
