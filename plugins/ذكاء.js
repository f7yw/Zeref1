import { isVip, deductEnergy, syncEnergy, initEconomy, FEES, MAX_ENERGY } from '../lib/economy.js'
import { initUser } from '../lib/userInit.js'

let handler = async (m, { conn, command, text, usedPrefix }) => {
  const vip       = isVip(m.sender)
  const vipStatus = vip ? '💎 مميز' : '❌ عادي'
  const getName   = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }

  const target  = m.mentionedJid?.[0] || m.quoted?.sender || m.sender
  const subject = (text || '').trim() || (await getName(target).catch(() => target.split('@')[0]))

  // طاقة (يتجاوزها المميز/المطور)
  const user = global.db.data.users[m.sender] || (global.db.data.users[m.sender] = {})
  initUser(user, m.pushName, m.sender)
  initEconomy(user)
  syncEnergy(user)
  const COST = FEES?.ai || 5
  if (!vip) {
    if ((user.energy || 0) < COST) {
      return m.reply(`⚡ الطاقة غير كافية لتشغيل التحليل الذكي.\nمطلوب: ${COST} ⚡  |  لديك: ${user.energy || 0}/${MAX_ENERGY}\nاستخدم *${usedPrefix}يومي* أو انتظر الشحن.`)
    }
    deductEnergy(user, COST)
  }

  await conn.sendMessage(m.chat, { react: { text: '🧠', key: m.key } }).catch(() => {})

  const apiKey = (process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '').trim()

  // — تحليل احتياطي عشوائي لو لم تتوفر مفاتيح AI —
  if (!apiKey) {
    const pct = Math.floor(40 + Math.random() * 60)
    return m.reply(`╭────『 🧠 نسبة الذكاء 』────\n│\n│ 👤 *${subject}*\n│ 💡 *${pct}%* من 100%\n│\n│ ⚠️ تحليل تقريبي (لم يُهيَّأ مفتاح AI)\n╰──────────────────`)
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://replit.com',
        'X-Title': 'Zeref Bot - IQ Analyzer'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
`أنت محلل نفسي وعقلي عربي ساخر بأسلوب لطيف. اعطِ تقييماً وهمياً مرحاً لذكاء شخص باسم/وصف يقدمه المستخدم.
أعد الجواب بصيغة JSON فقط:
{"pct": رقم 0-100, "verdict": "حكم بكلمة أو كلمتين", "analysis": "تحليل عربي مختصر 2-3 أسطر", "tip": "نصيحة قصيرة"}`
          },
          { role: 'user', content: `حلّل ذكاء: ${subject}` }
        ],
        temperature: 0.85,
        response_format: { type: 'json_object' }
      })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`)
    let parsed
    try { parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}') } catch { parsed = {} }
    const pct      = Math.max(0, Math.min(100, parseInt(parsed.pct) || Math.floor(Math.random() * 100)))
    const verdict  = parsed.verdict  || (pct >= 80 ? 'عبقري' : pct >= 60 ? 'ذكي' : pct >= 40 ? 'متوسط' : pct >= 20 ? 'بطيء' : 'باكا')
    const analysis = parsed.analysis || 'لا تحليل متاح حالياً.'
    const tip      = parsed.tip      || 'اقرأ كتاباً اليوم 📚'
    const bar      = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10))

    const out =
`╭────『 🧠 تحليل الذكاء AI 』────
│
│ 👤 *الموضوع:* ${subject}
│ 💡 *النسبة:* ${pct}%
│ ${bar}
│ 🏷️ *التقييم:* ${verdict}
│
│ 📝 *تحليل:*
│ ${analysis.replace(/\n/g, '\n│ ')}
│
│ 💬 *نصيحة:* ${tip}
│
│ 👤 العضوية: ${vipStatus}${vip ? '' : `  |  ⚡ ${user.energy}/${MAX_ENERGY}`}
╰──────────────────`.trim()

    await m.reply(out, null, { mentions: [target] })
  } catch (e) {
    const pct = Math.floor(40 + Math.random() * 60)
    await m.reply(`╭────『 🧠 نسبة الذكاء 』────\n│\n│ 👤 *${subject}*\n│ 💡 *${pct}%*\n│\n│ ⚠️ تعذّر التحليل الذكي: ${e?.message || 'خطأ'}\n╰──────────────────`)
  }
}

handler.help    = ['ذكاء [@شخص/وصف]']
handler.tags    = ['ai', 'fun']
handler.command = /^(ذكاء|iq|تحليل_ذكاء)$/i

export default handler
