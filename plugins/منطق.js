/**
 * لعبة المنطق والألغاز الذهنية — للثانويين والجامعيين
 */
import { isVip, initEconomy, logTransaction, fmt } from '../lib/economy.js'

const REWARD    = 700
const XP_REWARD = 150
const TIMEOUT   = 60000

const PUZZLES = [
  // ─── منطق رياضي ─────────────────────────────────────────────────────────
  {
    q: '🔢 لديك 3 صناديق مُعلَّمة خطأ: [تفاح]، [برتقال]، [تفاح+برتقال]. تسحب ثمرة واحدة من أي صندوق فقط. كيف تعرف محتوى الجميع؟',
    a: 'اسحب من صندوق تفاح+برتقال، إذا كانت تفاحة → هذا صندوق التفاح، والصندوق المُعلَّم تفاح هو البرتقال، والآخر تفاح+برتقال',
    hint: 'ابدأ بالصندوق المُعلَّم تفاح+برتقال',
    cat: 'منطق'
  },
  {
    q: '🔢 رجل ينظر لصورة ويقول: "أبي هذا الشخص ليس له أخوة وابن هذا الشخص هو ابني". من في الصورة؟',
    a: 'ابنه',
    hint: 'فكر في العلاقة العكسية',
    cat: 'منطق'
  },
  {
    q: '🎯 كم مرة يمكن طي ورقة A4 في نفس الاتجاه يدوياً؟',
    a: '7 مرات',
    hint: 'بعد 7 طيات تصبح سميكة جداً',
    cat: 'منطق'
  },
  {
    q: '⚖️ لديك 12 كرة متماثلة إحداها أثقل أو أخف من الباقي. كم وزن تحتاج لتحديدها بالضبط؟',
    a: '3 مرات',
    hint: 'استخدم الميزان ثلاث مرات فقط',
    cat: 'رياضيات'
  },
  {
    q: '🔢 المتتالية: 1، 1، 2، 3، 5، 8، 13... ما الرقم التالي؟',
    a: '21',
    hint: 'كل رقم = مجموع سابقيه',
    cat: 'رياضيات'
  },
  {
    q: '🎲 إذا رميت قطعة نقود 3 مرات، ما احتمال الحصول على صورة ثلاث مرات؟',
    a: '12.5٪ أو 1/8',
    hint: '(1/2)^3',
    cat: 'احتمالية'
  },
  {
    q: '📐 غرفة مستطيلة مساحتها 24م². إذا زاد الطول بمتر واحد صارت المساحة 28م². ما أبعاد الغرفة؟',
    a: '6×4 متر',
    hint: 'حل معادلة من الدرجة الأولى',
    cat: 'رياضيات'
  },
  {
    q: '🔢 أنا رقم ثلاثي الأرقام. رقم المئات هو ضعف رقم الآحاد. رقم العشرات هو مجموعهما. ما أنا؟',
    a: '231',
    hint: 'مئات=2×آحاد، عشرات=مئات+آحاد',
    cat: 'رياضيات'
  },

  // ─── منطق تقني ──────────────────────────────────────────────────────────
  {
    q: '💻 لديك 1GB من البيانات، كم بايت هذا تقريباً؟',
    a: '1,073,741,824 بايت (أو 10^9 تقريباً)',
    hint: '2^30 بايت',
    cat: 'تقنية'
  },
  {
    q: '🌐 لماذا IPv6 جاء بعد IPv4 مباشرة وليس IPv5؟',
    a: 'IPv5 كان بروتوكولاً تجريبياً للبث المباشر (ST) ولم يُطرح للعموم',
    hint: 'بروتوكول بث تجريبي',
    cat: 'تقنية'
  },
  {
    q: '🔐 إذا رمزت الحرف A=1, B=2, C=3... كيف تحصل على رسالة آمنة؟',
    a: 'تستخدم مفتاح تشفير (Caesar Cipher أو XOR) لتحويل الأرقام',
    hint: 'أبسط أنواع التشفير',
    cat: 'أمن'
  },

  // ─── منطق فلسفي ─────────────────────────────────────────────────────────
  {
    q: '🧠 ما المفارقة التي تقول: "هذه الجملة كاذبة"؟',
    a: 'مفارقة الكذاب (Liar Paradox)',
    hint: 'إذا كانت صادقة فهي كاذبة والعكس',
    cat: 'فلسفة'
  },
  {
    q: '⚓ سفينة ثيسيوس: إذا استُبدلت جميع أجزائها جزءاً جزءاً، هل تظل نفس السفينة؟',
    a: 'هذه مسألة خلافية: إما الهوية بالاستمرارية أو بالتركيب المادي',
    hint: 'فلسفة الهوية',
    cat: 'فلسفة'
  },
  {
    q: '🎭 ما مغالطة الرجل القشّي (Straw Man)?',
    a: 'تحريف موقف الخصم لتسهيل الرد عليه',
    hint: 'مغالطة منطقية شائعة',
    cat: 'منطق'
  },

  // ─── ألغاز علمية ────────────────────────────────────────────────────────
  {
    q: '⚗️ ما يحدث لنقطة غليان الماء على قمة جبل عالٍ مقارنة بسطح البحر؟',
    a: 'تنخفض (أقل من 100°م) بسبب انخفاض الضغط',
    hint: 'العلاقة بين الضغط ودرجة الغليان',
    cat: 'علوم'
  },
  {
    q: '🌍 لماذا السماء زرقاء؟',
    a: 'تشتت رايلي: الضوء الأزرق يتشتت أكثر من الألوان الأخرى في الغلاف الجوي',
    hint: 'تشتت الضوء',
    cat: 'فيزياء'
  },
  {
    q: '🔬 لماذا يتوهج الحديد بالأحمر عند تسخينه لا بألوان أخرى؟',
    a: 'لأن طاقته الحرارية تقابل طول موجي للضوء الأحمر المرئي',
    hint: 'إشعاع الجسم الأسود',
    cat: 'فيزياء'
  },
]

function normalize(s) {
  return String(s || '').trim().toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, '').replace(/[أإآا]/g, 'ا')
    .replace(/ة/g, 'ه').replace(/\s+/g, ' ').trim()
}

let handler = async (m, { conn, args, command, usedPrefix }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  conn.logicGame = conn.logicGame || {}

  if (conn.logicGame[m.chat]) {
    const cur = conn.logicGame[m.chat]
    return conn.reply(m.chat,
      `⚠️ يوجد لغز قائم!\n\n🧠 *${cur.puzzle.q}*\n\n💡 تلميح: _${cur.puzzle.hint}_\n\nاكتب إجابتك أو قريباً منها`,
      cur.msg)
  }

  const catFilter = (args[0] || '').trim()
  let pool = PUZZLES
  if (catFilter) {
    pool = PUZZLES.filter(p => normalize(p.cat).includes(normalize(catFilter)))
    if (!pool.length) pool = PUZZLES
  }

  const puzzle = pool[Math.floor(Math.random() * pool.length)]

  const sent = await conn.reply(m.chat,
`╭────『 🧠 تحدي المنطق 』────
│
│ 🏷️ الفئة: *${puzzle.cat}*
│
│ ${puzzle.q}
│
│ 💡 تلميح: _${puzzle.hint}_
│ ⏳ ${TIMEOUT / 1000} ثانية للتفكير
│ 💰 الجائزة: ${fmt(REWARD)}
│ ⭐ XP: +${XP_REWARD}
│
│ 💬 اكتب إجابتك أو أقرب ما تعرفه
╰──────────────────`.trim(), m)

  const id = Date.now()
  conn.logicGame[m.chat] = {
    id, puzzle,
    msgId: sent?.key?.id,
    msg: sent,
    time: setTimeout(async () => {
      if (conn.logicGame[m.chat]?.id === id) {
        await conn.reply(m.chat,
          `⌛ *انتهى الوقت!*\n\n✅ الإجابة:\n*${puzzle.a}*\n\n🏷️ ${puzzle.cat}`,
          conn.logicGame[m.chat].msg)
        delete conn.logicGame[m.chat]
      }
    }, TIMEOUT)
  }
}

handler.all = async function (m) {
  if (!this.logicGame || !this.logicGame[m.chat]) return
  if (m.isBaileys) return

  const entry = this.logicGame[m.chat]
  const rawText = (m.text || '').trim()
  if (!rawText || global.prefix?.test?.(rawText)) return

  const correct = normalize(entry.puzzle.a)
  const given   = normalize(rawText)
  if (!given || given.length < 3) return

  // منطق قبول مرن للإجابات التفصيلية
  const correctWords = correct.split(' ').filter(w => w.length > 3)
  const matchedWords = correctWords.filter(w => given.includes(w))
  const isCorrect = given.includes(correct) ||
    (correct.includes(given) && given.length >= 4) ||
    (correctWords.length > 0 && matchedWords.length >= Math.ceil(correctWords.length * 0.5))

  if (isCorrect) {
    clearTimeout(entry.time)
    delete this.logicGame[m.chat]

    const user = global.db.data.users[m.sender] ||= {}
    initEconomy(user, m.sender)
    user.money = (user.money || 0) + REWARD
    user.exp   = (user.exp   || 0) + XP_REWARD
    user.totalEarned = (user.totalEarned || 0) + REWARD
    logTransaction(user, 'earn', REWARD, `🧠 logic puzzle: ${entry.puzzle.cat}`)
    await global.db.write()

    return this.reply(m.chat,
`╭────『 🏆 صحيح! 』────
│
│ @${m.sender.split('@')[0]} ذهن متقد! 🧠
│ 🏷️ ${entry.puzzle.cat}
│
│ ✅ *${entry.puzzle.a}*
│
│ 💰 +${fmt(REWARD)}
│ ⭐ +${XP_REWARD} XP
│ 💼 رصيدك: ${fmt(user.money)}
╰──────────────────`.trim(), m, { mentions: [m.sender] })
  }

  const isDirect = m.quoted && entry.msgId && m.quoted.id === entry.msgId
  if (isDirect) {
    await this.reply(m.chat, `❌ ليست هي!\n💡 تلميح: _${entry.puzzle.hint}_\n\n💬 فكر أكثر وحاول مجدداً`, m)
  }
}

handler.help = ['منطق', 'لغز_منطقي']
handler.tags = ['game']
handler.command = /^(منطق|لغز_منطقي|تفكير|brain)$/i
export default handler
