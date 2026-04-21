import { xpRange } from '../lib/levelling.js'
import { deductEnergy, syncEnergy, initEconomy, FEES, MAX_ENERGY, isVip, fmt, fmtEnergy, getRole } from '../lib/economy.js'
import { initUser } from '../lib/userInit.js'
import { typingDelay } from '../lib/presence.js'

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  if (!text) throw `*يرجى إدخال نص*\n\n*مثال: ${usedPrefix + command} كيف حالك؟*`

  const who = m.mentionedJid?.[0] || m.quoted?.sender || m.sender
  const isSelf = who === m.sender
  const user = global.db.data.users[who] || (global.db.data.users[who] = {})

  initUser(user, isSelf ? m.pushName : undefined, who)

  await typingDelay(conn, m.chat, 800)

  initEconomy(user)
  syncEnergy(user)

  const vip = isVip(who)

  if (!vip) {
    const currentEnergy = user.energy || 0

    if (currentEnergy < FEES.ai) {
      throw `╭────『 ⚡ طاقة ناضبة 』────
│
│ ❌ الذكاء الاصطناعي يحتاج *${FEES.ai} ⚡*
│ طاقتك: *${currentEnergy}/${MAX_ENERGY}*
│
│ 💡 استخدم *${usedPrefix}يومي* أو انتظر الشحن التلقائي
│
╰──────────────────`.trim()
    }

    deductEnergy(user, FEES.ai)
  }

  await conn.sendMessage(m.chat, { react: { text: '🤖', key: m.key } })

  try {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY

    if (!apiKey || apiKey.trim() === '') {
      throw new Error('لم يتم العثور على مفتاح API في إعدادات Replit (Secrets). يرجى إضافة OPENROUTER_API_KEY.')
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
        'HTTP-Referer': 'https://replit.com',
        'X-Title': 'Zeref Bot'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'أنت مساعد ذكي يُدعى زيريف (Zeref). أنت ودود ومفيد وتتحدث باللغة العربية بأسلوب واضح وعميق ومليء بالمشاعر. كن مختصراً وواضحاً.'
          },
          { role: 'user', content: text }
        ],
        temperature: 0.7
      })
    })

    const data = await response.json()

    if (!response.ok) {
      if (response.status === 404 || data.error?.message?.includes('No endpoints')) {
        return await tryFallbackModel(m, text, apiKey, user, vip)
      }
      const errorMsg = data?.error?.message || `HTTP Error ${response.status}`
      throw new Error(errorMsg)
    }

    const result = data.choices?.[0]?.message?.content || 'لم أتمكن من توليد رد.'
    const energyLeft = user?.energy ?? MAX_ENERGY

    await m.reply(
      `${vip ? '💎 *VIP*\n' : ''}${result}\n\n⚡ *طاقتك المتبقية:* ${energyLeft}/${MAX_ENERGY}\n👤 العضوية: ${vipStatus}`
    )
  } catch (e) {
    console.error('AI ERROR:', e)
    throw `*❌ حدث خطأ أثناء معالجة طلبك*\n\n${e.message || String(e)}`
  }
}

async function tryFallbackModel(m, text, apiKey, user, vip = false) {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
        'HTTP-Referer': 'https://replit.com'
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat:free',
        messages: [
          { role: 'system', content: 'أنت مساعد ذكي يُدعى زيريف (Zeref). تحدث بالعربية بوضوح.' },
          { role: 'user', content: text }
        ]
      })
    })

    const data = await response.json()
    const result = data.choices?.[0]?.message?.content || 'لم أتمكن من توليد رد.'

    await m.reply(
      `${vip ? '💎 *VIP*\n' : ''}${result}\n\n⚡ *طاقتك المتبقية:* ${user?.energy ?? MAX_ENERGY}/${MAX_ENERGY}\n👤 العضوية: ${vipStatus}`
    )
  } catch (e) {
    throw new Error('جميع النماذج المجانية غير متاحة حالياً. يرجى المحاولة لاحقاً.')
  }
}

handler.help = ['ai', 'بوت', 'شادو']
handler.tags = ['tools', 'ai']
handler.command = /^(ai|بوت|شادو|\.)$/i

export default handler