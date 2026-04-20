import translate from '@vitalets/google-translate-api'
import { typingDelay } from '../lib/presence.js'

const defaultLang = 'ar'

const LANG_MAP = {
  ar: 'عربي', en: 'إنجليزي', fr: 'فرنسي', tr: 'تركي',
  es: 'إسباني', de: 'ألماني', zh: 'صيني', ru: 'روسي',
  ja: 'ياباني', ko: 'كوري', it: 'إيطالي', pt: 'برتغالي',
  fa: 'فارسي', hi: 'هندي', ur: 'أردو', id: 'إندونيسي',
  nl: 'هولندي', sv: 'سويدي', pl: 'بولندي', th: 'تايلاندي'
}

const VALID_LANGS = new Set(Object.keys(LANG_MAP))

let handler = async (m, { conn, args, usedPrefix, command }) => {
  // Redirect if user mistakenly used this command for auto-translate toggle
  const firstArg = (args[0] || '').trim().toLowerCase()
  if (firstArg === 'تشغيل' || firstArg === 'ايقاف' || firstArg === 'إيقاف' || firstArg === 'on' || firstArg === 'off') {
    return m.reply(
      `💡 للمترجم التلقائي استخدم:\n` +
      `• *${usedPrefix}مترجم تشغيل ar* ← تفعيل (ترجمة لعربي)\n` +
      `• *${usedPrefix}مترجم ايقاف* ← إيقاف\n\n` +
      `📌 الأمر الحالي *${usedPrefix}${command}* للترجمة الفورية فقط.`
    )
  }

  const usageMsg =
`╭────『 🌍 الترجمة 』────
│
│ 📌 *الاستخدام:*
│ ${usedPrefix}${command} en مرحبا كيف حالك
│ ${usedPrefix}${command} ar Hello world
│ (أو رد على رسالة + ${usedPrefix}${command} en)
│
│ 🌐 *رموز اللغات:*
│ ar عربي │ en إنجليزي │ fr فرنسي
│ tr تركي │ es إسباني │ de ألماني
│ zh صيني │ ru روسي │ ja ياباني
│ ko كوري │ it إيطالي │ pt برتغالي
│ fa فارسي │ hi هندي │ ur أردو
╰──────────────────`.trim()

  let lang = defaultLang
  let text = ''

  const first = (args[0] || '').trim().toLowerCase()

  if (VALID_LANGS.has(first)) {
    lang = first
    text = args.slice(1).join(' ').trim()
  } else {
    text = args.join(' ').trim()
  }

  if (!text && m.quoted?.text) text = m.quoted.text.trim()
  if (!text) throw usageMsg

  await typingDelay(conn, m.chat, 1000)

  try {
    const result = await translate(text, { to: lang })
    const langName = LANG_MAP[lang] || lang

    await m.reply(
      `╭────『 🌍 الترجمة 』────
│
│ 🔤 *النص:*
│ ${text.slice(0, 300)}
│
│ 🌐 *الترجمة إلى ${langName}:*
│ ${result.text}
│
╰──────────────────`.trim()
    )
  } catch (e) {
    console.error('[TR ERROR]', e?.message || e)
    throw `❌ فشل الترجمة، حاول مرة أخرى لاحقاً`
  }
}

handler.help = ['ترجم en النص']
handler.tags = ['tools']
handler.command = /^(ترجم|ترجمه|ترجمة|translate|tr)$/i
export default handler