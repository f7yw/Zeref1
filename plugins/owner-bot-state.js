// ─────────────────────────────────────────────────────────────────────────────
// plugins/owner-bot-state.js
// تحكّم المطور في حالة البوت: تعطيل/تفعيل أوامر، وضع الصيانة، الوضع الخاص،
// إدارة اقتراح الأوامر — كل ذلك مُخزَّن في Supabase.
// ─────────────────────────────────────────────────────────────────────────────
import {
  ensureBotState,
  disableCommand,
  enableCommand,
  getDisabledCommands,
  isCommandDisabled,
  setMaintenance,
  isMaintenance,
  setPrivateMode,
  isPrivateMode,
  setSuggest,
  isSuggestEnabled,
  normalizeCmd,
  getCommandRegistry,
} from '../lib/botControl.js'

const ON_WORDS  = ['تشغيل', 'فتح', 'on', 'enable', 'true', '1']
const OFF_WORDS = ['ايقاف', 'إيقاف', 'اغلاق', 'إغلاق', 'off', 'disable', 'false', '0']
function parseToggle(arg = '') {
  const a = String(arg).trim().toLowerCase()
  if (ON_WORDS.includes(a))  return true
  if (OFF_WORDS.includes(a)) return false
  return null
}

function box(title, lines) {
  const top = `╭────『 ${title} 』────`
  const body = lines.map(l => l === '' ? '│' : `│ ${l}`).join('\n')
  return `${top}\n${body}\n╰──────────────────`
}

const handler = async (m, { conn, command, args, text, isOwner, isROwner }) => {
  if (!(isOwner || isROwner)) {
    return m.reply('🔒 *هذا الأمر للمطور فقط.*')
  }
  const botJid = conn?.user?.jid || conn?.user?.id || 'main'
  const cmd = String(command || '').toLowerCase()
  ensureBotState(botJid)

  // ── 1) تعطيل أمر ───────────────────────────────────────────────
  if (/^(ايقاف[_\s]?الامر|إيقاف[_\s]?الامر|تعطيل[_\s]?الامر|disable[_\s]?cmd)$/i.test(cmd)) {
    const target = normalizeCmd(args[0] || '')
    if (!target) {
      return m.reply(box('⛔ تعطيل أمر', [
        'الاستخدام: *ايقاف_الامر <اسم_الأمر>*',
        '',
        'مثال:',
        '• ايقاف_الامر رهان',
        '• ايقاف_الامر ai',
      ]))
    }
    const registry = getCommandRegistry()
    if (!registry.includes(target)) {
      return m.reply(box('⚠️ أمر غير معروف', [
        `لم أجد أمراً باسم: *${target}*`,
        '',
        'تأكد من الاسم — جرّب: *الاوامر_المعطلة* لرؤية القائمة.',
      ]))
    }
    if (isCommandDisabled(target, botJid)) {
      return m.reply(`⚠️ الأمر *${target}* معطّل أصلاً.`)
    }
    disableCommand(target, botJid)
    return m.reply(box('✅ تم تعطيل الأمر', [
      `🚫 الأمر: *${target}*`,
      '🌐 محفوظ سحابياً (Supabase)',
      '',
      `لإعادة تفعيله: *تفعيل_الامر ${target}*`,
    ]))
  }

  // ── 2) تفعيل أمر ───────────────────────────────────────────────
  if (/^(تفعيل[_\s]?الامر|enable[_\s]?cmd)$/i.test(cmd)) {
    const target = normalizeCmd(args[0] || '')
    if (!target) {
      return m.reply('الاستخدام: *تفعيل_الامر <اسم_الأمر>*')
    }
    if (!isCommandDisabled(target, botJid)) {
      return m.reply(`ℹ️ الأمر *${target}* ليس معطّلاً.`)
    }
    enableCommand(target, botJid)
    return m.reply(box('✅ تم تفعيل الأمر', [
      `🟢 الأمر: *${target}* صار يعمل`,
      '🌐 محفوظ سحابياً (Supabase)',
    ]))
  }

  // ── 3) قائمة الأوامر المعطّلة ─────────────────────────────────
  if (/^(الاوامر[_\s]?المعطلة|قائمة[_\s]?الاوامر[_\s]?المعطلة|disabled[_\s]?cmds)$/i.test(cmd)) {
    const list = getDisabledCommands(botJid)
    if (!list.length) {
      return m.reply(box('📋 الأوامر المعطّلة', [
        '✅ لا توجد أوامر معطّلة حالياً.',
        '',
        'لتعطيل أمر: *ايقاف_الامر <اسم>*',
      ]))
    }
    const lines = list.map((c, i) => `${i + 1}. 🚫 ${c}`)
    return m.reply(box(`📋 الأوامر المعطّلة (${list.length})`, [
      ...lines,
      '',
      'لإعادة تفعيل: *تفعيل_الامر <اسم>*',
      '🌐 مزامنة فورية مع Supabase',
    ]))
  }

  // ── 4) وضع الصيانة ────────────────────────────────────────────
  if (/^(وضع[_\s]?الصيانة|صيانة|maintenance)$/i.test(cmd)) {
    const toggle = parseToggle(args[0])
    if (toggle === null) {
      const cur = isMaintenance(botJid)
      return m.reply(box('🛠️ وضع الصيانة', [
        `الحالة الحالية: ${cur ? '🟠 *مفعّل*' : '🟢 *موقوف*'}`,
        '',
        'الاستخدام: *وضع_الصيانة تشغيل|ايقاف*',
        '',
        '📌 عند التفعيل: لا أحد يستطيع استخدام أي أمر سوى المطور.',
      ]))
    }
    setMaintenance(toggle, botJid)
    return m.reply(box(toggle ? '🛠️ تم تفعيل وضع الصيانة' : '✅ تم إيقاف وضع الصيانة', [
      toggle
        ? '🟠 البوت لا يستجيب لأحد سوى المطور.'
        : '🟢 البوت عاد للعمل الطبيعي مع الجميع.',
      '🌐 محفوظ سحابياً (Supabase)',
    ]))
  }

  // ── 5) الوضع الخاص (VIP فقط) ──────────────────────────────────
  if (/^(وضع[_\s]?خاص|الوضع[_\s]?الخاص|private[_\s]?mode|vip[_\s]?only)$/i.test(cmd)) {
    const toggle = parseToggle(args[0])
    if (toggle === null) {
      const cur = isPrivateMode(botJid)
      return m.reply(box('🔐 الوضع الخاص', [
        `الحالة الحالية: ${cur ? '🟣 *مفعّل*' : '🟢 *موقوف*'}`,
        '',
        'الاستخدام: *وضع_خاص تشغيل|ايقاف*',
        '',
        '📌 عند التفعيل: المطور والمميزون (VIP) فقط يستخدمون البوت.',
      ]))
    }
    setPrivateMode(toggle, botJid)
    return m.reply(box(toggle ? '🔐 تم تفعيل الوضع الخاص' : '✅ تم إيقاف الوضع الخاص', [
      toggle
        ? '🟣 الأوامر مقتصرة على المطور والمميزين.'
        : '🟢 البوت عاد للجميع.',
      '🌐 محفوظ سحابياً (Supabase)',
    ]))
  }

  // ── 6) تشغيل/إيقاف اقتراح الأوامر ────────────────────────────
  if (/^(اقتراح[_\s]?الاوامر|تصحيح[_\s]?الاوامر|suggest[_\s]?cmds)$/i.test(cmd)) {
    const toggle = parseToggle(args[0])
    if (toggle === null) {
      const cur = isSuggestEnabled(botJid)
      return m.reply(box('💡 اقتراح الأوامر', [
        `الحالة الحالية: ${cur ? '🟢 *مفعّل*' : '🔴 *موقوف*'}`,
        '',
        'الاستخدام: *اقتراح_الاوامر تشغيل|ايقاف*',
        '',
        '📌 عند التفعيل: لو كتب المستخدم أمراً خاطئاً، يقترح البوت البديل الصحيح.',
      ]))
    }
    setSuggest(toggle, botJid)
    return m.reply(box(toggle ? '💡 تم تفعيل الاقتراح' : '✅ تم إيقاف الاقتراح', [
      toggle
        ? '🟢 سيقترح البوت أوامر مشابهة للأخطاء الإملائية.'
        : '🔴 لن يردّ البوت على الأوامر غير الموجودة.',
      '🌐 محفوظ سحابياً (Supabase)',
    ]))
  }

  // ── 7) لوحة حالة البوت الكاملة ────────────────────────────────
  if (/^(حالة[_\s]?البوت|state|bot[_\s]?state)$/i.test(cmd)) {
    const s = ensureBotState(botJid)
    const list = s.disabledCommands || []
    return m.reply(box('🤖 حالة البوت', [
      `🛠️ وضع الصيانة:    ${s.maintenance ? '🟠 مفعّل' : '🟢 موقوف'}`,
      `🔐 الوضع الخاص:    ${s.privateMode ? '🟣 مفعّل' : '🟢 موقوف'}`,
      `💡 اقتراح الأوامر: ${s.suggestCommands ? '🟢 مفعّل' : '🔴 موقوف'}`,
      `🚫 أوامر معطّلة:    ${list.length}`,
      '',
      ...(list.length ? ['• ' + list.slice(0, 8).join(' • ') + (list.length > 8 ? ' …' : '')] : []),
      '',
      '🌐 كل الإعدادات محفوظة في Supabase',
    ]))
  }
}

handler.help = [
  'ايقاف_الامر <اسم>',
  'تفعيل_الامر <اسم>',
  'الاوامر_المعطلة',
  'وضع_الصيانة تشغيل|ايقاف',
  'وضع_خاص تشغيل|ايقاف',
  'اقتراح_الاوامر تشغيل|ايقاف',
  'حالة_البوت',
]
handler.tags = ['owner']
handler.command = /^(ايقاف[_\s]?الامر|إيقاف[_\s]?الامر|تعطيل[_\s]?الامر|disable[_\s]?cmd|تفعيل[_\s]?الامر|enable[_\s]?cmd|الاوامر[_\s]?المعطلة|قائمة[_\s]?الاوامر[_\s]?المعطلة|disabled[_\s]?cmds|وضع[_\s]?الصيانة|صيانة|maintenance|وضع[_\s]?خاص|الوضع[_\s]?الخاص|private[_\s]?mode|vip[_\s]?only|اقتراح[_\s]?الاوامر|تصحيح[_\s]?الاوامر|suggest[_\s]?cmds|حالة[_\s]?البوت|bot[_\s]?state)$/i
handler.owner = true

export default handler
