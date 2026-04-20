import { fmt, initEconomy, logTransaction } from '../lib/economy.js'

const XP_BONUS = 50
const DIA_CHANCE = 0.05

function normalize(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/\s+/g, '')
    .replace(/[أإآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}]/gu, '')
}

async function answerQuiz(conn, m, entry, answerText) {
  const answer = normalize(entry.question.response)
  const text = normalize(answerText)
  if (!text) return m.reply('✍️ اكتب الإجابة بعد الأمر.\nمثال: .جواب ABCD القاهرة')
  const correct = text === answer || text.includes(answer) || (answer.includes(text) && text.length >= 3)
  if (!correct) return m.reply('❌ إجابة خاطئة، حاول مرة أخرى.')

  clearTimeout(entry.timer)
  delete conn.quiz[m.chat]

  const user = global.db.data.users[m.sender]
  if (user) {
    initEconomy(user)
    user.money += entry.reward
    user.exp += XP_BONUS
    user.totalEarned = (user.totalEarned || 0) + entry.reward
    logTransaction(user, 'earn', entry.reward, `🧠 إجابة صحيحة في السؤال`)
    const gotDia = Math.random() < DIA_CHANCE
    if (gotDia) user.diamond = (user.diamond || 0) + 1
    return conn.reply(
      m.chat,
      `╭────『 ✅ إجابة صحيحة! 』────
│
│ 🎉 أحسنت *@${m.sender.split('@')[0]}*!
│ ❓ السؤال: *${entry.question.question}*
│ ✅ الإجابة: *${entry.question.response}*
│
│ 💰 +${fmt(entry.reward)}
│ ⭐ +${XP_BONUS} XP
${gotDia ? '│ 💎 +1 ماسة\n' : ''}│ 💰 رصيدك: ${fmt(user.money)}
╰──────────────────`.trim(),
      m,
      { mentions: [m.sender] }
    )
  }

  return conn.reply(m.chat, `✅ إجابة صحيحة!\n✔️ *${entry.question.response}*`, m)
}

async function answerMath(conn, m, entry, answerText) {
  const text = String(answerText || '').trim()
  if (!text || isNaN(text)) return m.reply('✍️ اكتب الرقم بعد الأمر.\nمثال: .جواب ABCD 25')
  if (String(parseFloat(text)) !== entry.question.answer && text !== entry.question.answer) return m.reply('❌ إجابة خاطئة، حاول مرة أخرى.')

  clearTimeout(entry.timer)
  delete conn.math[m.chat]

  const user = global.db.data.users[m.sender]
  if (user) {
    initEconomy(user)
    user.money += entry.reward
    user.exp += entry.xpBonus
    user.totalEarned = (user.totalEarned || 0) + entry.reward
    logTransaction(user, 'earn', entry.reward, `🧮 فوز تحدي الرياضيات`)
  }

  return conn.reply(
    m.chat,
    `╭────『 🧮 إجابة صحيحة! 』────
│
│ 🎉 أحسنت *@${m.sender.split('@')[0]}*!
│ ✅ ${entry.question.expr} = *${entry.question.answer}*
│
│ 💰 +${fmt(entry.reward)}
│ ⭐ +${entry.xpBonus} XP
│ 💼 رصيدك: ${user ? fmt(user.money) : '—'}
╰──────────────────`.trim(),
    m,
    { mentions: [m.sender] }
  )
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const quiz = conn.quiz?.[m.chat]
  const math = conn.math?.[m.chat]

  // Allow answering by replying to the question message
  const isQuizReply = m.quoted && quiz?.msg && (
    m.quoted.id === quiz.msg?.key?.id || m.quoted.id === quiz.msg?.id
  )
  const isMathReply = m.quoted && math?.msg && (
    m.quoted.id === math.msg?.key?.id || m.quoted.id === math.msg?.id
  )

  if (!quiz && !math && !isQuizReply && !isMathReply) return m.reply(`لا يوجد سؤال أو تحدي نشط الآن.\nابدأ بسؤال: ${usedPrefix}سوال\nأو تحدي: ${usedPrefix}تحدي`)

  if (/^(الجواب|اظهر_الجواب|اظهر-الجواب)$/i.test(command)) {
    const active = quiz || math
    const questionText = quiz ? active.question.question : active.question.expr
    const answerText = quiz ? active.question.response : active.question.answer
    return m.reply(`╭────『 ✅ جواب السؤال 』────\n│\n│ ❓ السؤال: *${questionText}*\n│ ✅ الجواب: *${answerText}*\n│\n╰──────────────────`)
  }

  const parts = (text || '').trim().split(/\s+/).filter(Boolean)
  let id = ''
  let answer = text || ''

  if (parts.length > 1 && /^[a-z0-9]{4}$/i.test(parts[0])) {
    id = parts.shift().toUpperCase()
    answer = parts.join(' ')
  }

  const active = quiz || math
  if (id && active.id && id !== active.id) return m.reply(`❌ رمز السؤال غير صحيح. استخدم الرمز الموجود في السؤال: *${active.id}*`)
  if (!answer.trim()) return m.reply(`✍️ اكتب الإجابة هكذا:\n${usedPrefix}جواب ${active.id || ''} إجابتك`)

  if (quiz) return answerQuiz(conn, m, quiz, answer)
  return answerMath(conn, m, math, answer)
}

handler.help = ['جواب <رمز> <الإجابة>', 'الجواب']
handler.tags = ['game']
handler.command = /^(جواب|اجابة|إجابة|حل|answer|الجواب|اظهر_الجواب|اظهر-الجواب)$/i
export default handler