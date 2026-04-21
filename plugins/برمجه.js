/**
 * لعبة أسئلة البرمجة والتقنية — للجامعيين وعشاق التكنولوجيا
 */
import { isVip, initEconomy, logTransaction, fmt } from '../lib/economy.js'

const REWARD    = 600
const XP_REWARD = 120
const TIMEOUT   = 40000

const LEVELS = {
  easy: {
    name: '🟢 مبتدئ',
    questions: [
      { q: 'ما معنى HTML؟', a: 'HyperText Markup Language', hint: 'لغة ترميز صفحات الويب' },
      { q: 'ما اختصار CSS؟', a: 'Cascading Style Sheets', hint: 'يُستخدم لتنسيق الصفحات' },
      { q: 'ما معنى API؟', a: 'Application Programming Interface', hint: 'واجهة لربط التطبيقات' },
      { q: 'كم بت في البايت؟', a: '8', hint: 'وحدة قياس البيانات' },
      { q: 'ما رمز التعليق في Python؟', a: '#', hint: 'يكتب قبل السطر' },
      { q: 'ما أداة التحكم بالإصدارات الأشهر؟', a: 'Git', hint: 'مع GitHub' },
      { q: 'ما لغة تصميم قواعد البيانات العلائقية؟', a: 'SQL', hint: 'Structured Query Language' },
      { q: 'ما هيكل LIFO؟', a: 'Stack', hint: 'مثل كومة صحون' },
      { q: 'ما هيكل FIFO؟', a: 'Queue', hint: 'مثل طابور انتظار' },
      { q: 'ما معنى RAM؟', a: 'Random Access Memory', hint: 'ذاكرة عشوائية الوصول' },
    ]
  },
  medium: {
    name: '🟡 متوسط',
    questions: [
      { q: 'ما الفرق بين TCP و UDP؟', a: 'TCP موثوق بتأكيد الاستلام، UDP سريع بلا تأكيد', hint: 'بروتوكولات الشبكة' },
      { q: 'ما تعقيد خوارزمية Binary Search؟', a: 'O(log n)', hint: 'حساب التعقيد الزمني' },
      { q: 'ما معنى OOP؟', a: 'Object Oriented Programming', hint: 'البرمجة الشيئية' },
      { q: 'ما مبدأ DRY في البرمجة؟', a: "Don't Repeat Yourself", hint: 'تجنب تكرار الكود' },
      { q: 'ما هو الـ Primary Key؟', a: 'مفتاح يعرّف الصف تعريفاً فريداً في الجدول', hint: 'في قواعد البيانات' },
      { q: 'ما الفرق بين == و === في JavaScript؟', a: '=== يقارن النوع والقيمة معاً', hint: 'المقارنة الصارمة' },
      { q: 'ما معنى REST في تصميم الـ API؟', a: 'Representational State Transfer', hint: 'نمط تصميم خدمات الويب' },
      { q: 'ما أنواع HTTP methods الرئيسية؟', a: 'GET, POST, PUT, DELETE', hint: 'عمليات CRUD' },
      { q: 'ما معنى NULL Pointer في البرمجة؟', a: 'مؤشر لا يشير لأي عنوان ذاكرة', hint: 'خطأ شائع في C' },
      { q: 'ما الفرق بين Compiler وInterpreter؟', a: 'Compiler يترجم الكل دفعة، Interpreter سطراً سطراً', hint: 'تنفيذ الكود' },
    ]
  },
  hard: {
    name: '🔴 متقدم',
    questions: [
      { q: 'ما هو CAP theorem؟', a: 'Consistency, Availability, Partition Tolerance لا يمكن الثلاثة معاً', hint: 'قواعد البيانات الموزعة' },
      { q: 'ما الفرق بين Docker وVirtual Machine؟', a: 'Docker يشارك kernel الـ OS، VM عنده نظام تشغيل مستقل', hint: 'الحوسبة السحابية' },
      { q: 'ما هو Big O لـ QuickSort في أسوأ الحالات؟', a: 'O(n²)', hint: 'خوارزميات الترتيب' },
      { q: 'ما هو مبدأ SOLID الأول؟', a: 'Single Responsibility Principle', hint: 'تصميم البرمجيات' },
      { q: 'ما هو الـ Deadlock؟', a: 'حالة توقف حيث كل عملية تنتظر مورداً يحجزه الآخر', hint: 'أنظمة التشغيل' },
      { q: 'ما فرق Synchronous وAsynchronous؟', a: 'Sync ينتظر الانتهاء، Async لا ينتظر', hint: 'البرمجة المتزامنة' },
      { q: 'ما هو الـ Hashing في الأمن المعلوماتي؟', a: 'تحويل البيانات لقيمة ثابتة الطول لا يمكن عكسها', hint: 'التشفير' },
      { q: 'ما هو الـ Garbage Collector؟', a: 'آلية تلقائية لتحرير الذاكرة غير المستخدمة', hint: 'إدارة الذاكرة' },
      { q: 'ما هو مفهوم Polymorphism؟', a: 'قدرة الكائنات المختلفة على الاستجابة بطريقة خاصة لنفس الرسالة', hint: 'OOP' },
      { q: 'ما هو الـ Race Condition؟', a: 'خطأ يحدث حين نتيجة البرنامج تعتمد على ترتيب تنفيذ الخيوط', hint: 'البرمجة المتعددة الخيوط' },
    ]
  }
}

function normalize(s) {
  return String(s || '').trim().toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, '').replace(/[أإآا]/g, 'ا')
    .replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim()
}

let handler = async (m, { conn, args, command, usedPrefix }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  conn.codeQuiz = conn.codeQuiz || {}

  if (conn.codeQuiz[m.chat]) {
    const cur = conn.codeQuiz[m.chat]
    return conn.reply(m.chat,
      `⚠️ يوجد سؤال قائم!\n\n❓ *${cur.item.q}*\n💡 تلميح: _${cur.item.hint}_\n\nاكتب إجابتك مباشرة`,
      cur.msg)
  }

  const sub = (args[0] || '').trim().toLowerCase()
  let pool, levelName

  if (sub === 'صعب' || sub === 'متقدم') {
    pool = LEVELS.hard.questions; levelName = LEVELS.hard.name
  } else if (sub === 'متوسط') {
    pool = LEVELS.medium.questions; levelName = LEVELS.medium.name
  } else if (sub === 'سهل' || sub === 'مبتدئ') {
    pool = LEVELS.easy.questions; levelName = LEVELS.easy.name
  } else {
    // اختار مستوى عشوائي
    const lvls = Object.values(LEVELS)
    const picked = lvls[Math.floor(Math.random() * lvls.length)]
    pool = picked.questions; levelName = picked.name
  }

  const item = pool[Math.floor(Math.random() * pool.length)]

  const sent = await conn.reply(m.chat,
`╭────『 💻 تحدي البرمجة 』────
│
│ ${levelName}
│
│ ❓ *${item.q}*
│
│ 💡 تلميح: _${item.hint}_
│ ⏳ ${TIMEOUT / 1000} ثانية
│ 💰 الجائزة: ${fmt(REWARD)}
│ ⭐ XP: +${XP_REWARD}
│
│ 💬 اكتب إجابتك مباشرة
╰──────────────────`.trim(), m)

  const id = Date.now()
  conn.codeQuiz[m.chat] = {
    id, item, levelName,
    msgId: sent?.key?.id,
    msg: sent,
    time: setTimeout(async () => {
      if (conn.codeQuiz[m.chat]?.id === id) {
        await conn.reply(m.chat,
          `⌛ *انتهى الوقت!*\n\n✅ الإجابة: *${item.a}*\n\n💡 ${item.hint}`,
          conn.codeQuiz[m.chat].msg)
        delete conn.codeQuiz[m.chat]
      }
    }, TIMEOUT)
  }
}

handler.all = async function (m) {
  if (!this.codeQuiz || !this.codeQuiz[m.chat]) return
  if (m.isBaileys) return

  const entry = this.codeQuiz[m.chat]
  const rawText = (m.text || '').trim()
  if (!rawText || global.prefix?.test?.(rawText)) return

  const correct = normalize(entry.item.a)
  const given   = normalize(rawText)
  if (!given || given.length < 1) return

  // قبول الإجابة الجزئية للأسئلة التقنية
  const isCorrect = given === correct ||
    given.includes(correct) ||
    (correct.includes(given) && given.length >= 3) ||
    correct.split(' ').some(word => word.length > 3 && given.includes(normalize(word)))

  if (isCorrect) {
    clearTimeout(entry.time)
    delete this.codeQuiz[m.chat]

    const user = global.db.data.users[m.sender] ||= {}
    initEconomy(user, m.sender)
    user.money = (user.money || 0) + REWARD
    user.exp   = (user.exp   || 0) + XP_REWARD
    user.totalEarned = (user.totalEarned || 0) + REWARD
    logTransaction(user, 'earn', REWARD, `💻 code quiz: ${entry.item.q.slice(0, 20)}`)
    await global.db.write()

    return this.reply(m.chat,
`╭────『 🏆 إجابة صحيحة! 』────
│
│ @${m.sender.split('@')[0]} عبقري! 🎉
│ ${entry.levelName}
│
│ ✅ *${entry.item.a}*
│
│ 💰 +${fmt(REWARD)}
│ ⭐ +${XP_REWARD} XP
│ 💼 رصيدك: ${fmt(user.money)}
╰──────────────────`.trim(), m, { mentions: [m.sender] })
  }

  const isDirect = m.quoted && entry.msgId && m.quoted.id === entry.msgId
  if (isDirect) {
    await this.reply(m.chat, `❌ إجابة خاطئة!\n💡 تلميح: _${entry.item.hint}_`, m)
  }
}

handler.help = ['برمجه', 'تقنية', 'كود']
handler.tags = ['game']
handler.command = /^(برمجه|برمجة|كود_سؤال|تحدي_برمجة|تقنية)$/i
export default handler
