import fs from 'fs'
import { fmt, initEconomy } from '../lib/economy.js'

const TIMEOUT   = 60000    // 60 seconds
const COIN_MIN  = 150
const COIN_MAX  = 400
const XP_BONUS  = 50
const DIA_CHANCE = 0.05    // 5% chance for a diamond on correct answer
const makeId = () => Math.random().toString(36).slice(2, 6).toUpperCase()

let handler = async (m, { conn, usedPrefix }) => {
  conn.quiz = conn.quiz || {}
  const chatId = m.chat

  // Already active question?
  if (chatId in conn.quiz) {
    await conn.reply(m.chat, `❗ *هناك سؤال لم تتم الإجابة عليه بعد!*`, conn.quiz[chatId].msg)
    return false
  }

  const baseQ = JSON.parse(fs.readFileSync('./src/game/acertijo.json'))
  const itQ   = JSON.parse(fs.readFileSync('./src/game/it_questions.json'))
  const questions = [...baseQ, ...itQ]
  const q = questions[Math.floor(Math.random() * questions.length)]
  const id = makeId()
  const reward = Math.floor(Math.random() * (COIN_MAX - COIN_MIN + 1)) + COIN_MIN

  const caption =
`╭────『 🧠 سؤال SHADOW 』────
│
│ *❓ ${q.question}*
│
│ ⏱️ الوقت: ${TIMEOUT / 1000} ثانية
│ 💰 الجائزة: ${fmt(reward)}
│ ⭐ XP: +${XP_BONUS}
│
│ 💡 للإجابة اكتب:
│ *${usedPrefix}جواب ${id} إجابتك*
│ ويمكنك الرد على رسالة السؤال بالإجابة مباشرة.
╰──────────────────`.trim()

  const sent = await conn.reply(m.chat, caption, m)

  conn.quiz[chatId] = {
    msg: sent,
    id,
    question: q,
    reward,
    timer: setTimeout(async () => {
      if (conn.quiz[chatId]) {
        await conn.reply(
          m.chat,
          `╭────『 ⌛ انتهى الوقت! 』────\n│\n│ ✅ الإجابة الصحيحة:\n│ *${q.response}*\n│\n│ 😢 لم يُجب أحد في الوقت المحدد.\n│\n╰──────────────────`.trim(),
          conn.quiz[chatId].msg
        )
        delete conn.quiz[chatId]
      }
    }, TIMEOUT)
  }
}

// ── Answer detection (runs on every message) ────────────────────────────────
handler.all = async function (m) {
  const chatId = m.chat
  if (!this.quiz || !(chatId in this.quiz)) return
  if (m.isBaileys) return

  const entry  = this.quiz[chatId]
  const answer = (entry.question.response || '').trim().toLowerCase()
  const text   = (m.text || '').trim().toLowerCase()

  if (!text || text === answer.slice(0, 1)) return  // too short / noise

  // Similarity check — accept if starts the same or exact
  const normalize = s => s.replace(/\s+/g, '').replace(/[أإآا]/g, 'ا').replace(/ة/g, 'ه')
  const correct = normalize(text) === normalize(answer) ||
                  normalize(text).includes(normalize(answer)) ||
                  normalize(answer).includes(normalize(text)) && text.length >= 3

  if (!correct) return

  clearTimeout(entry.timer)
  delete this.quiz[chatId]

  const user = global.db.data.users[m.sender]
  if (user) {
    initEconomy(user)
    user.money += entry.reward
    user.exp   += XP_BONUS
    user.totalEarned = (user.totalEarned || 0) + entry.reward
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
${gotDia ? '│ 💎 +1 ماسة نادرة بالحظ!\n' : ''}│
│ 💰 رصيدك: ${fmt(user.money)}
╰──────────────────`.trim(),
      m, { mentions: [m.sender] }
    )
  } else {
    await this.reply(m.chat, `✅ إجابة صحيحة!\n✔️ *${entry.question.response}*`, m)
  }
}

handler.help    = ['سوال', 'quiz']
handler.tags    = ['game']
handler.command = /^(سوال|quiz|سؤال|اسأل)$/i
export default handler
