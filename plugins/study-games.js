import { initEconomy, logTransaction, fmt , isVip} from '../lib/economy.js'

const words = ['جامعة', 'مدرسة', 'رياضيات', 'فيزياء', 'كيمياء', 'اختبار', 'مراجعة', 'محاضرة', 'واجب', 'تلخيص']

function shuffle(word) {
  return word.split('').sort(() => Math.random() - 0.5).join('')
}

function mathQuestion() {
  const a = Math.floor(Math.random() * 20) + 1
  const b = Math.floor(Math.random() * 20) + 1
  const ops = [
    ['+', a + b],
    ['-', a - b],
    ['×', a * b],
  ]
  const [op, ans] = ops[Math.floor(Math.random() * ops.length)]
  return { q: `${a} ${op} ${b}`, ans: String(ans) }
}

function applyReward(m) {
  const user = global.db.data.users[m.sender] || (global.db.data.users[m.sender] = {})
  initEconomy(user)
  user.exp         = (user.exp   || 0) + 25
  user.money       = (user.money || 0) + 20
  user.totalEarned = (user.totalEarned || 0) + 20
  logTransaction(user, 'earn', 20, '📚 فوز لعبة تعليمية')
  return user
}

let handler = async (m, { conn, command }) => {
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  const vipStatus = isVip(m.sender) ? '💎 مميز' : '❌ عادي'
  conn.studyGames = conn.studyGames || {}

  // ── كلمة / رتب ─────────────────────────────────────────────────────────────
  if (/^(كلمة|رتب)$/i.test(command)) {
    const answer = words[Math.floor(Math.random() * words.length)]
    const sent = await m.reply(`رتب الكلمة:\n*${shuffle(answer)}*\n\n💡 *ردّ على هذه الرسالة بالكلمة المرتبة*\n👤 العضوية: ${vipStatus}`)
    conn.studyGames[m.chat] = { type: 'word', answer, msg: sent }
    return
  }

  // ── سرعة / حساب_سريع ────────────────────────────────────────────────────────
  if (/^(سرعة|حساب_سريع)$/i.test(command)) {
    const game = mathQuestion()
    const sent = await m.reply(`أجب بسرعة:\n*${game.q} = ؟*\n\n💡 *ردّ على هذه الرسالة بالجواب*\n👤 العضوية: ${vipStatus}`)
    conn.studyGames[m.chat] = { type: 'math', answer: game.ans, msg: sent }
    return
  }

  // ── ذاكرة ──────────────────────────────────────────────────────────────────
  if (/^(ذاكرة)$/i.test(command)) {
    const seq = Array.from({ length: 5 }, () => Math.floor(Math.random() * 9) + 1).join('')
    const sent = await m.reply(`احفظ الرقم خلال 10 ثواني:\n*${seq}*\n\n💡 *ردّ على هذه الرسالة بالرقم*\n👤 العضوية: ${vipStatus}`)
    conn.studyGames[m.chat] = { type: 'memory', answer: seq, msg: sent }
    return
  }

  // ── حل (explicit command fallback) ─────────────────────────────────────────
  if (/^(حل)$/i.test(command)) {
    const game = conn.studyGames?.[m.chat]
    if (!game) return m.reply('لا توجد لعبة تعليمية نشطة. جرّب .كلمة أو .سرعة\n👤 العضوية: ' + vipStatus)
    const answer = (m.text || '').replace(/^[./#!]?\s*حل\s*/i, '').trim()
    if (!answer) return m.reply('اكتب الإجابة بعد الأمر. مثال: .حل كيمياء\n👤 العضوية: ' + vipStatus)
    if (answer !== game.answer) return m.reply(`❌ غير صحيح. حاول مرة أخرى.\n👤 العضوية: ${vipStatus}`)
    delete conn.studyGames[m.chat]
    const user = applyReward(m)
    return m.reply(`✅ صحيح! حصلت على *25 XP* و *${fmt(20)}*\n💰 رصيدك: ${fmt(user.money)}\n👤 العضوية: ${vipStatus}`)
  }
}

// ── Reply-based answer detection: runs on every message ──────────────────────
handler.all = async function (m) {
  if (!this.studyGames) return
  const game = this.studyGames[m.chat]
  if (!game) return
  if (m.isBaileys) return

  const rawText = (m.text || '').trim()
  if (!rawText) return
  if (/^[./#!]/.test(rawText)) return   // ignore command messages
  if (global.prefix?.test?.(rawText)) return

  // قبول: رد مباشر على رسالة السؤال، أو نص عادي في نفس المحادثة
  const isReply = m.quoted && game.msg && (
    m.quoted.id === game.msg?.key?.id ||
    m.quoted.id === game.msg?.id
  )
  if (!isReply && m.quoted) return   // إذا رد على رسالة أخرى غير السؤال، تجاهل

  if (rawText !== game.answer) {
    return this.reply(m.chat, `❌ غير صحيح، حاول مرة أخرى.`, m)
  }

  delete this.studyGames[m.chat]
  const user = applyReward(m)

  await this.reply(
    m.chat,
`✅ *إجابة صحيحة!*

🎉 أحسنت @${m.sender.split('@')[0]}!

│ ⭐ +25 XP
│ 💰 +${fmt(20)}
│ 💼 رصيدك: ${fmt(user.money)}`.trim(),
    m, { mentions: [m.sender] }
  )
}

handler.help    = ['كلمة', 'سرعة', 'ذاكرة', 'حل']
handler.tags    = ['game', 'study']
handler.command = /^(كلمة|رتب|سرعة|حساب_سريع|ذاكرة|حل)$/i
export default handler
