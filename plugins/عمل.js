import { deductEnergy, syncEnergy, fmt, initEconomy, msToHuman, MAX_ENERGY, isVip } from '../lib/economy.js'

const WORK_COOLDOWN = 30 * 60 * 1000  // 30 minutes
const ENERGY_COST   = 10
const COIN_MIN      = 100
const COIN_MAX      = 350

const jobs = [
  { icon: '⚔️', text: 'اشتركت في مباراة بطولية وفزت بجائزة المنافسة' },
  { icon: '🛠️', text: 'صنعت أسلحة أسطورية وبعتها في السوق السوداء' },
  { icon: '🌊', text: 'غصت في الأعماق وأخرجت كنزاً مخفياً' },
  { icon: '🧪', text: 'طورت جرعة سحرية وبعتها للتجار' },
  { icon: '🚀', text: 'أتممت مهمة فضائية خطيرة وعُدت سالماً بغنائم' },
  { icon: '🏺', text: 'اكتشفت مدينة أثرية وبعت قطعها للمتاحف' },
  { icon: '🎯', text: 'أنجزت مهمة تجسس سرية بنجاح تام' },
  { icon: '🌿', text: 'وجدت عشباً نادراً وبعته لخبراء الطب' },
  { icon: '🐉', text: 'روضت تنيناً برياً وبعت خدماته للمملكة' },
  { icon: '📡', text: 'اخترقت نظاماً مشفراً واسترجعت بيانات ثمينة' },
  { icon: '🏇', text: 'فزت في سباق التنانين وحصلت على جائزة البطولة' },
  { icon: '🎭', text: 'أدّيت عرضاً مبهراً أمام الملك وحصلت على مكافأة' },
  { icon: '⚗️', text: 'حوّلت المعادن العادية إلى ذهب في مختبرك السري' },
  { icon: '🌌', text: 'اكتشفت كوكباً جديداً وباعته لوكالة الفضاء' },
  { icon: '🔮', text: 'تنبأت بالمستقبل لزعيم قبيلة وحصلت على مكافأته' },
  { icon: '🎪', text: 'نظّمت مهرجاناً ضخماً وجنيت أرباحاً طائلة' },
  { icon: '🦅', text: 'دربت عقاباً ملكياً وبعته لأمير الصيد' },
  { icon: '⛏️', text: 'عملت في مناجم الذهب واكتشفت وريداً خاماً نادراً' },
]

const handler = async (m, { usedPrefix }) => {
  const user = global.db.data.users[m.sender]
  if (!user) return m.reply('❌ أرسل أي أمر أولاً لتسجيل حسابك.')
  initEconomy(user)
  syncEnergy(user)

  const vip  = isVip(m.sender)
  const now  = Date.now()
  const last = user.lastWork || user.lastwork || 0
  const rem  = WORK_COOLDOWN - (now - last)

  if (rem > 0 && !vip) {
    return m.reply(
      `╭────『 ⏳ يحتاج راحة! 』────\n│\n│ ⚔️ جسمك يحتاج استراحة أيها المغامر!\n│ ⏰ العودة بعد: *${msToHuman(rem)}*\n│ ⚡ طاقتك: ${user.energy}/${MAX_ENERGY}\n│\n╰──────────────────`.trim()
    )
  }

  if (!vip && user.energy < ENERGY_COST) {
    return m.reply(
      `╭────『 ⚡ طاقة ناضبة 』────\n│\n│ ❌ تحتاج *${ENERGY_COST} ⚡* للعمل\n│ طاقتك الحالية: *${user.energy}/${MAX_ENERGY}*\n│\n│ 💡 احصل على طاقة بـ *${usedPrefix}يومي*\n│ أو انتظر التعبئة التلقائية (+1 كل 3 دق)\n│\n╰──────────────────`.trim()
    )
  }

  const job   = jobs[Math.floor(Math.random() * jobs.length)]
  const coins = Math.floor(Math.random() * (COIN_MAX - COIN_MIN + 1)) + COIN_MIN
  const xp    = Math.floor(Math.random() * 80) + 20

  deductEnergy(user, ENERGY_COST, m.sender)
  user.money    += coins
  user.exp      += xp
  user.lastWork  = now
  user.lastwork  = now
  user.totalEarned = (user.totalEarned || 0) + coins

  await m.reply(
`╭────『 ${job.icon} نتيجة العمل 』────
│
│ ${job.text}
│
│ ─── المكافآت ───
│ 💰 +${fmt(coins)}
│ ⭐ +${xp} XP
│ ⚡ -${ENERGY_COST} طاقة
│
│ 💼 رصيدك الآن: ${fmt(user.money)}
│ ⚡ طاقتك: ${user.energy}/${MAX_ENERGY}
│ ⏰ العودة بعد: 30 دقيقة
│
╰──────────────────`.trim()
  )
}

handler.help    = ['عمل', 'work']
handler.tags    = ['economy']
handler.command = /^(عمل|work|اعمل)$/i
handler.fail    = null
export default handler
