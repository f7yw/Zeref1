import { fmt, initEconomy, logTransaction , isVip} from '../lib/economy.js'
import { displayPhone } from '../lib/jidUtils.js'

const TIMEOUT = 30000
const LEVELS = [
  { ops: ['+', '-'],           range: 20,  reward: [80,  150], label: 'سهل 🟢'   },
  { ops: ['+', '-', '*'],      range: 50,  reward: [150, 280], label: 'متوسط 🟡' },
  { ops: ['+', '-', '*'],      range: 100, reward: [280, 450], label: 'صعب 🔴'   },
  { ops: ['+', '-', '*', '/'], range: 200, reward: [450, 700], label: 'خبير 🔥'  },
]
const makeId = () => Math.random().toString(36).slice(2, 6).toUpperCase()

function buildQ(lvl) {
  const { ops, range } = lvl
  const op = ops[Math.floor(Math.random() * ops.length)]
  let a = Math.floor(Math.random() * range) + 1
  let b = Math.floor(Math.random() * range) + 1
  if (op === '/') {
    b = Math.floor(Math.random() * 9) + 2
    a = b * (Math.floor(Math.random() * 10) + 2)
  }
  if (op === '-' && b > a) [a, b] = [b, a]
  // حساب آمن بدون eval — يمنع أي حقن
  const compute = (x, y, o) => o === '+' ? x + y : o === '-' ? x - y : o === '*' ? x * y : x / y
  const answer = compute(a, b, op)
  return { expr: `${a} ${op} ${b}`, answer: String(answer) }
}

function giveReward(m, entry) {
  const user = global.db.data.users[m.sender]
  if (user) {
    initEconomy(user, m.sender)
    user.money += entry.reward
    user.exp   += entry.xpBonus
    user.totalEarned = (user.totalEarned || 0) + entry.reward
    logTransaction(user, 'earn', entry.reward, `🧮 فوز تحدي الرياضيات`)
  }
  return user
}

let handler = async (m, { conn, args, usedPrefix }) => {
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return displayPhone(jid) } }
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  conn.math = conn.math || {}
  const chatId = m.chat

  if (chatId in conn.math) {
    await conn.reply(m.chat, '❗ هناك تحدٍّ نشط الآن، ردّ على رسالة السؤال بالإجابة!', conn.math[chatId].msg)
    return false
  }

  const lvlIdx  = Math.min(3, Math.max(0, parseInt(args[0]) - 1 || 0))
  const lvl     = LEVELS[lvlIdx]
  const q       = buildQ(lvl)
  const id      = makeId()
  const reward  = Math.floor(Math.random() * (lvl.reward[1] - lvl.reward[0] + 1)) + lvl.reward[0]
  const xpBonus = [30, 60, 100, 180][lvlIdx]

  const caption =
`╭────『 🧮 تحدي الرياضيات 』────
│
│ *المستوى: ${lvl.label}*
│
│ 🔢 ما ناتج:
│ *${q.expr} = ?*
│
│ ⏱️ الوقت: ${TIMEOUT / 1000} ثانية
│ 💰 الجائزة: ${fmt(reward)}
│ ⭐ XP: +${xpBonus}
│
│ 💡 *ردّ على هذه الرسالة بالرقم مباشرة*
╰──────────────────`.trim()

  const sent = await conn.reply(m.chat, caption, m)

  conn.math[chatId] = {
    msg: sent,
    id,
    question: q,
    reward,
    xpBonus,
    timer: setTimeout(async () => {
      if (conn.math[chatId]) {
        await conn.reply(
          m.chat,
          `╭────『 ⌛ انتهى الوقت! 』────\n│\n│ ✅ الإجابة: *${q.answer}*\n│\n│ ${q.expr} = *${q.answer}*\n│\n╰──────────────────`.trim(),
          conn.math[chatId].msg
        )
        delete conn.math[chatId]
      }
    }, TIMEOUT)
  }
}

// ── Answer detection: runs on every message ──────────────────────────────────
handler.all = async function (m) {
  const chatId = m.chat
  if (!this.math || !(chatId in this.math)) return
  if (m.isBaileys) return

  const entry = this.math[chatId]
  const rawText = (m.text || '').trim()
  if (!rawText) return

  const isReplyToQuestion = m.quoted && entry.msg && (
    m.quoted.id === entry.msg?.key?.id ||
    m.quoted.id === entry.msg?.id
  )

  // Accept: a reply to the question msg, OR a bare number sent in the chat
  const isBareNumber = /^\-?\d+(\.\d+)?$/.test(rawText)
  if (!isReplyToQuestion && !isBareNumber) return

  // Validate the answer
  const answerMatch =
    String(parseFloat(rawText)) === entry.question.answer ||
    rawText === entry.question.answer

  if (!answerMatch) {
    // Only send "wrong" feedback on direct replies — avoid spam for bare numbers
    if (isReplyToQuestion) {
      await this.reply(m.chat, `❌ إجابة خاطئة، حاول مرة أخرى.`, m)
    }
    return
  }

  clearTimeout(entry.timer)
  delete this.math[chatId]

  const user = giveReward(m, entry)
  let name = await this.getName(m.sender)

  await this.reply(
    m.chat,
    `╭────『 🧮 إجابة صحيحة! 』────
│
│ 🎉 أحسنت *@${displayPhone(m.sender)}* (${name})!
│ ✅ ${entry.question.expr} = *${entry.question.answer}*
│
│ 💰 +${fmt(entry.reward)}
│ ⭐ +${entry.xpBonus} XP
│ 💼 رصيدك: ${user ? fmt(user.money) : '—'}
╰──────────────────`.trim(),
    m, { mentions: [m.sender] }
  )
}

handler.help    = ['تحدي', 'رياضيات']
handler.tags    = ['game']
handler.command = /^(تحدي|رياضيات|math|حساب_بوت)$/i
export default handler
