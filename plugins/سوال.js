import fs from 'fs'
import { fmt, initEconomy, logTransaction , isVip} from '../lib/economy.js'

const TIMEOUT   = 60000
const COIN_MIN  = 150
const COIN_MAX  = 400
const XP_BONUS  = 50
const DIA_CHANCE = 0.05

function normalize(s) {
  return String(s || '').trim().toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/\s+/g, '')
    .replace(/[أإآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}]/gu, '')
}

let handler = async (m, { conn, command, usedPrefix }) => {
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  const vipStatus = isVip(m.sender) ? '💎 مميز' : '❌ عادي'
  conn.quiz = conn.quiz || {}
  const chatId = m.chat

  if (chatId in conn.quiz) {
    await conn.reply(m.chat, `❗ *هناك سؤال لم تتم الإجابة عليه بعد!*\n👤 العضوية: ${vipStatus}`, conn.quiz[chatId].msg)
    return
  }

  let file = 'acertijo.json'
  let title = 'سؤال ذكاء'
  
  if (command === 'رياضه') { file = 'رياضه.json'; title = 'سؤال رياضي' }
  if (command === 'تجميع') { file = 'qoran3.json'; title = 'تجميع كلمات' }
  if (command === 'تفكيك') { file = 'qoran4.json'; title = 'تفكيك كلمات' }

  let questions = []
  try {
    questions = JSON.parse(fs.readFileSync(`./src/game/${file}`))
    if (command === 'سوال' || command === 'quiz') {
      const itQ = JSON.parse(fs.readFileSync('./src/game/it_questions.json'))
      questions = [...questions, ...itQ]
    }
  } catch (e) {
    console.error('Failed to load questions:', e)
    throw '*❌ حدث خطأ في تحميل الأسئلة*'
  }

  const q = questions[Math.floor(Math.random() * questions.length)]
  const reward = Math.floor(Math.random() * (COIN_MAX - COIN_MIN + 1)) + COIN_MIN

  const caption =
`╭────『 🧠 ${title} 』────
│
│ *❓ ${q.question}*
│
│ ⏱️ الوقت: ${TIMEOUT / 1000} ثانية
│ 💰 الجائزة: ${fmt(reward)}
│ ⭐ XP: +${XP_BONUS}
│
│ 💡 *ردّ على هذه الرسالة فقط للإجابة*
╰──────────────────`.trim()

  const sent = await conn.reply(m.chat, caption, m)

  conn.quiz[chatId] = {
    msg: sent,
    msgId: sent?.key?.id,
    question: q,
    reward,
    timer: setTimeout(async () => {
      if (conn.quiz[chatId]) {
        await conn.reply(
          m.chat,
          `╭────『 ⌛ انتهى الوقت! 』────
│
│ ✅ الإجابة الصحيحة:
│ *${q.response}*
│
│ 😢 لم يُجب أحد.
╰──────────────────`.trim(),
          conn.quiz[chatId].msg
        )
        delete conn.quiz[chatId]
      }
    }, TIMEOUT)
  }
}

handler.all = async function (m) {
  const chatId = m.chat
  if (!this.quiz || !(chatId in this.quiz)) return
  if (m.isBaileys) return

  const rawText = (m.text || '').trim()
  if (!rawText) return
  // تجاهل الأوامر
  if (global.prefix?.test?.(rawText)) return

  const entry = this.quiz[chatId]
  // اقبل reply مباشرة للسؤال، أو أي نص عادي في نفس الشات
  const isReplyToQuestion = m.quoted && entry.msgId && m.quoted.id === entry.msgId
  const isPlainAnswer = !m.quoted || !rawText.startsWith('.')
  if (!isReplyToQuestion && !isPlainAnswer) return

  const answer = normalize(entry.question.response)
  const text   = normalize(rawText)
  if (!text) return

  const correct = text === answer || text.includes(answer) || (answer.includes(text) && text.length >= 3)

  if (!correct) {
    await this.reply(m.chat, '❌ إجابة خاطئة، حاول مرة أخرى.', m)
    return
  }

  clearTimeout(entry.timer)
  delete this.quiz[chatId]

  const user = global.db.data.users[m.sender] || (global.db.data.users[m.sender] = {})
  initEconomy(user, m.sender)
  user.money = (user.money || 0) + entry.reward
  user.exp   = (user.exp || 0) + XP_BONUS
  user.totalEarned = (user.totalEarned || 0) + entry.reward
  logTransaction(user, 'earn', entry.reward, `🧠 إجابة صحيحة في ${entry.question.question.slice(0, 20)}...`)

  const gotDia = Math.random() < DIA_CHANCE
  if (gotDia) user.diamond = (user.diamond || 0) + 1

  await this.reply(
    m.chat,
`╭────『 ✅ إجابة صحيحة! 』────
│
│ 🎉 أحسنت *@${m.sender.split('@')[0]}*!
│
│ ✅ الإجابة: *${entry.question.response}*
│
│ ─── المكافآت ───
│ 💰 +${fmt(entry.reward)}
│ ⭐ +${XP_BONUS} XP
${gotDia ? '│ 💎 +1 ماسة!\n' : ''}│
│ 💰 رصيدك: ${fmt(user.money)}
╰──────────────────`.trim(),
    m,
    { mentions: [m.sender] }
  )
}

handler.help = ['سوال', 'رياضه', 'تجميع', 'تفكيك']
handler.tags = ['game']
handler.command = /^(سوال|quiz|سؤال|اسأل|رياضه|تجميع|تفكيك)$/i

export default handler
