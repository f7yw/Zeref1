import fs from 'fs'
import { fmt, initEconomy, logTransaction , isVip} from '../lib/economy.js'

const TIMEOUT = 60000
const POIN = 500
const XP_BONUS = 100

function normalize(s) {
  return String(s || '').trim().toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/\s+/g, '')
    .replace(/[أإآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}]/gu, '')
}

let handler = async (m, { conn, usedPrefix }) => {
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  conn.tekateki = conn.tekateki || {}
  const id = m.chat
  if (id in conn.tekateki) {
    await conn.reply(m.chat, '❗ هناك علم لم تتم الإجابة عليه بعد، ردّ على رسالة السؤال بالإجابة!', conn.tekateki[id].msg)
    return
  }

  let questions = []
  try {
    questions = JSON.parse(fs.readFileSync('./src/game/علم.json'))
  } catch (e) {
    console.error('Failed to load flag questions:', e)
    throw '*❌ حدث خطأ في تحميل الأعلام*'
  }

  const q = questions[Math.floor(Math.random() * questions.length)]
  const reward = POIN

  const caption =
`╭────『 🚩 تخمين العلم 』────
│
│ *❓ ما اسم هذا العلم؟*
│
│ 🚩 العلم: ${q.question}
│
│ ⏱️ الوقت: ${TIMEOUT / 1000} ثانية
│ 💰 الجائزة: ${fmt(reward)}
│ ⭐ XP: +${XP_BONUS}
│
│ 💡 *ردّ على هذه الرسالة بالإجابة*
╰──────────────────`.trim()

  const sent = await conn.reply(m.chat, caption, m)

  conn.tekateki[id] = {
    msg: sent,
    msgId: sent?.key?.id,
    question: q,
    reward,
    timer: setTimeout(async () => {
      if (conn.tekateki[id]) {
        await conn.reply(
          m.chat,
          `╭────『 ⌛ انتهى الوقت! 』────
│
│ ✅ الإجابة الصحيحة:
│ *${q.response}*
│
│ 😢 لم يُجب أحد.
╰──────────────────`.trim(),
          conn.tekateki[id].msg
        )
        delete conn.tekateki[id]
      }
    }, TIMEOUT)
  }
}

handler.all = async function (m) {
  const id = m.chat
  if (!this.tekateki || !(id in this.tekateki)) return
  if (m.isBaileys) return

  const rawText = (m.text || '').trim()
  if (!rawText) return
  if (global.prefix?.test?.(rawText)) return

  const entry = this.tekateki[id]
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
  delete this.tekateki[id]

  const user = global.db.data.users[m.sender] || (global.db.data.users[m.sender] = {})
  initEconomy(user, m.sender)
  user.money = (user.money || 0) + entry.reward
  user.exp   = (user.exp || 0) + XP_BONUS
  user.totalEarned = (user.totalEarned || 0) + entry.reward
  logTransaction(user, 'earn', entry.reward, `🚩 تخمين علم ${entry.question.response}`)

  let name = await this.getName(m.sender)

  await this.reply(
    m.chat,
`╭────『 ✅ إجابة صحيحة! 』────
│
│ 🎉 أحسنت *@${m.sender.split('@')[0]}* (${name})!
│
│ ✅ الإجابة: *${entry.question.response}*
│
│ ─── المكافآت ───
│ 💰 +${fmt(entry.reward)}
│ ⭐ +${XP_BONUS} XP
│
│ 💰 رصيدك: ${fmt(user.money)}
╰──────────────────`.trim(),
    m,
    { mentions: [m.sender] }
  )
}

handler.help = ['علم']
handler.tags = ['game']
handler.command = /^(علم|flags|tekateki)$/i

export default handler
