import { isVip } from '../lib/economy.js'
const subjects = {
  رياضيات: ['راجع القانون أولاً', 'حل 5 مسائل متدرجة', 'اكتب الأخطاء المتكررة', 'أعد حل سؤال أخطأت فيه بدون النظر للحل'],
  فيزياء: ['افهم الفكرة بالرسم', 'اكتب المعطيات والمطلوب', 'حدد القانون', 'راجع الوحدات قبل التعويض'],
  كيمياء: ['احفظ التعاريف الأساسية', 'اربط القانون بمثال', 'راجع المعادلات', 'حل سؤالاً قصيراً بعد كل فكرة'],
  احياء: ['حوّل الفقرة إلى مخطط', 'اربط المصطلح بوظيفته', 'راجع الرسومات', 'اختبر نفسك بتعريفات قصيرة'],
  عربي: ['اقرأ النص بصوت منخفض', 'استخرج الفكرة العامة', 'اكتب المفردات الصعبة', 'راجع القواعد بأمثلة'],
  انجليزي: ['احفظ 10 كلمات', 'اكتب جملة لكل كلمة', 'استمع لدقيقة قصيرة', 'راجع قاعدة واحدة فقط']
}

const rules = [
  'لا تذاكر أكثر من 50 دقيقة دون راحة قصيرة.',
  'ابدأ بالمادة الأصعب وأنت نشيط.',
  'اكتب المطلوب قبل فتح الحل.',
  'المراجعة السريعة بعد 24 ساعة تثبت المعلومة.',
  'لا تجمع أكثر من مصدرين لنفس الدرس حتى لا تتشتت.',
  'اختبر نفسك قبل أن تقول إنك فهمت.'
]

function pick(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function clean(text = '') {
  return text.replace(/\s+/g, ' ').trim()
}

function summarize(text) {
  const sentences = text.split(/[.!؟\n]+/).map(clean).filter(Boolean)
  const important = sentences
    .sort((a, b) => b.length - a.length)
    .slice(0, 5)
    .map((s, i) => `${i + 1}. ${s}`)
  return important.length ? important.join('\n') : 'أرسل نصاً أطول لكي ألخصه.'
}

function flashcards(text) {
  const parts = text.split(/[.!؟\n،]+/).map(clean).filter(Boolean).slice(0, 8)
  if (!parts.length) return 'أرسل نقاطاً أو فقرة لأحولها إلى بطاقات.'
  return parts.map((p, i) => `س${i + 1}: ما الفكرة الأساسية؟\nج${i + 1}: ${p}`).join('\n\n')
}

function plan(subject = 'عام', days = 7) {
  days = Math.max(1, Math.min(30, Number(days) || 7))
  const base = subjects[subject] || ['مراجعة', 'تلخيص', 'حل أسئلة', 'اختبار ذاتي']
  let out = [`خطة دراسة ${subject} لمدة ${days} أيام:`]
  for (let i = 1; i <= days; i++) {
    out.push(`${i}. ${base[(i - 1) % base.length]} + 20 دقيقة مراجعة`)
  }
  return out.join('\n')
}

function gpa(text) {
  const nums = text.match(/\d+(\.\d+)?/g)?.map(Number) || []
  if (!nums.length) return 'اكتب درجاتك هكذا:\n.معدلي 90 85 77 96'
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length
  let grade = avg >= 90 ? 'ممتاز' : avg >= 80 ? 'جيد جداً' : avg >= 70 ? 'جيد' : avg >= 60 ? 'مقبول' : 'تحتاج خطة إنقاذ'
  return `معدلك التقريبي: ${avg.toFixed(2)}%\nالتقدير: ${grade}`
}

function quiz(subject = 'عام') {
  const bank = {
    رياضيات: ['ما ناتج 12 × 8؟', 'ما محيط مربع طول ضلعه 5؟', 'إذا كان x + 4 = 10 فما قيمة x؟'],
    فيزياء: ['ما وحدة قياس القوة؟', 'ما العلاقة بين السرعة والزمن والمسافة؟', 'ما اسم مقاومة تغير الحركة؟'],
    كيمياء: ['ما رمز الماء الكيميائي؟', 'ما الجسيم سالب الشحنة؟', 'ما الرقم الهيدروجيني للمادة المتعادلة تقريباً؟'],
    عام: ['اكتب أهم فكرة تعلمتها اليوم.', 'ما الشيء الذي ستراجعه بعد ساعة؟', 'حوّل الدرس إلى 3 نقاط مختصرة.']
  }
  return `اختبار سريع:\n${pick(bank[subject] || bank.عام)}\n\nأجب لنفسك، ثم استخدم .بطاقات لتحويل ملاحظاتك لأسئلة.`
}

let handler = async (m, { text, command, usedPrefix }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  const [first, second, ...rest] = clean(text).split(' ')
  if (/^(تعلم|دراسة|study)$/i.test(command)) {
    return m.reply(`
*🎓 قسم التعلم*

${usedPrefix}خطة رياضيات 7
${usedPrefix}تلخيص النص
${usedPrefix}بطاقات النص
${usedPrefix}اختبرني فيزياء
${usedPrefix}معدلي 90 85 77
${usedPrefix}قاعدة
${usedPrefix}بومودورو
${usedPrefix}مصادر
${usedPrefix}جدول
`.trim())
  }
  if (/^(خطة|خطة_دراسة|studyplan)$/i.test(command)) return m.reply(plan(first, second))
  if (/^(تلخيص|لخص|summary)$/i.test(command)) return m.reply(`*ملخص سريع:*\n${summarize(text)}\n👤 العضوية: ${vipStatus}`)
  if (/^(بطاقات|فلاش|flashcards)$/i.test(command)) return m.reply(`*بطاقات مراجعة:*\n${flashcards(text)}\n👤 العضوية: ${vipStatus}`)
  if (/^(اختبرني|اختبار_سريع|quizme)$/i.test(command)) return m.reply(quiz(first))
  if (/^(معدلي|نسبتي|gpa)$/i.test(command)) return m.reply(gpa(text))
  if (/^(قاعدة|قانون_دراسة|studyrule)$/i.test(command)) return m.reply(`قاعدة مفيدة:\n${pick(rules)}\n👤 العضوية: ${vipStatus}`)
  if (/^(بومودورو|pomodoro)$/i.test(command)) return m.reply('ابدأ الآن: 25 دقيقة تركيز + 5 دقائق راحة. كررها 4 مرات ثم خذ راحة 20 دقيقة.')
  if (/^(مصادر|مصادر_دراسة)$/i.test(command)) return m.reply('مصادر نافعة:\n1. كتاب المدرسة أو ملزمة الجامعة\n2. قناة شرح واحدة فقط\n3. بنك أسئلة أو اختبارات سابقة\n4. دفتر أخطاء تراجعه يومياً')
  if (/^(جدول|جدول_دراسة)$/i.test(command)) return m.reply('جدول يومي مختصر:\n1. 20د مراجعة قديمة\n2. 40د درس جديد\n3. 30د حل أسئلة\n4. 10د تلخيص\n5. 5د تحديد واجب الغد')
}

handler.help = ['تعلم', 'خطة', 'تلخيص', 'بطاقات', 'اختبرني', 'معدلي', 'قاعدة', 'بومودورو', 'مصادر', 'جدول']
handler.tags = ['study']
handler.command = /^(تعلم|دراسة|study|خطة|خطة_دراسة|studyplan|تلخيص|لخص|summary|بطاقات|فلاش|flashcards|اختبرني|اختبار_سريع|quizme|معدلي|نسبتي|gpa|قاعدة|قانون_دراسة|studyrule|بومودورو|pomodoro|مصادر|مصادر_دراسة|جدول|جدول_دراسة)$/i

export default handler