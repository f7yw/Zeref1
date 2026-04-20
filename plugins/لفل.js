import { canLevelUp, xpRange } from '../lib/levelling.js'
import { levelup }             from '../lib/canvas.js'
import { initEconomy }         from '../lib/economy.js'
import { initUser }            from '../lib/userInit.js'

const ROLES = [
  [100, '👑 أسطورة'],
  [75,  '💎 الترا'],
  [50,  '🔥 خبير'],
  [30,  '⚡ متقدم'],
  [15,  '🌟 متوسط'],
  [5,   '🪙 مبتدئ'],
  [0,   '🌱 جديد'],
]

function getRole(level) {
  for (const [min, label] of ROLES) {
    if ((level || 0) >= min) return label
  }
  return '🌱 جديد'
}

let handler = async (m, { conn }) => {
  let user = global.db.data.users[m.sender]
  if (!user) return m.reply('❌ أرسل أي أمر أولاً لتسجيل حسابك.')
  initUser(user, m.pushName)
  initEconomy(user)

  let name = m.pushName || m.sender.split('@')[0]
  try { name = (await conn.getName(m.sender)) || name } catch (_) {}

  if (!canLevelUp(user.level, user.exp, global.multiplier)) {
    let { min, xp, max } = xpRange(user.level, global.multiplier)
    throw `
┌───⊷ 📊 المستوى
▢ الاسم    : ${name}
▢ المستوى  : ${user.level}
▢ التقدم   : ${user.exp - min}/${xp} XP
▢ الخبرة   : ${xp} XP
▢ الماس    : ${user.diamond || 0} 💎
▢ رتبتك    : ${getRole(user.level)}
└──────────────

تحتاج ${max - user.exp} XP لرفع مستواك`.trim()
  }

  let before = user.level * 1
  while (canLevelUp(user.level, user.exp, global.multiplier)) user.level++

  if (before !== user.level) {
    const diaBonusEvery = 5
    const diaEarned = Math.floor(user.level / diaBonusEvery) - Math.floor(before / diaBonusEvery)
    if (diaEarned > 0) {
      user.diamond = (user.diamond || 0) + diaEarned
    }

    let teks = `🎊 عاش يحب ${name} وصل للمستوى:`
    let str = `
┌─⊷ 🎊 ارتفاع المستوى!
▢ المستوى السابق : ${before}
▢ المستوى الحالي : ${user.level}
▢ رتبتك الآن     : ${getRole(user.level)}
${diaEarned > 0 ? `▢ 💎 ماس مكتسب  : +${diaEarned}\n` : ''}└──────────────

كلما تفاعلت مع البوت ارتفع مستواك 🚀`.trim()
    try {
      const img = await levelup(teks, user.level)
      conn.sendFile(m.chat, img, 'levelup.png', str, m)
    } catch (_) {
      m.reply(str)
    }
  }
}

handler.help    = ['levelup', 'لفل', 'مستواي']
handler.tags    = ['xp']
handler.command = /^(لفل|lvl|levelup|مستواي)$/i
export default handler
