import translate from '@vitalets/google-translate-api'
import { deductEnergy, syncEnergy, initEconomy, isVip, FEES, MAX_ENERGY } from '../lib/economy.js'
import { typingDelay } from '../lib/presence.js'

const defaultLang = 'ar'

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const user = global.db.data.users[m.sender]
  const vip = isVip(m.sender)

  if (user && !vip) {
    initEconomy(user)
    syncEnergy(user)
    if (user.energy < FEES.translate) {
      throw `╭────『 ⚡ طاقة ناضبة 』────\n│\n│ ❌ الترجمة تحتاج *${FEES.translate} ⚡*\n│ طاقتك: *${user.energy}/${MAX_ENERGY}*\n│\n│ 💡 استخدم *${usedPrefix}يومي* أو انتظر الشحن\n│\n╰──────────────────`.trim()
    }
    deductEnergy(user, FEES.translate, m.sender)
  }

  const usageMsg = `*مثال:*\n${usedPrefix}${command} en مرحبا كيف حالك\n${usedPrefix}${command} ar Hello world\n\n*رموز اللغات:*\nar عربي │ en إنجليزي │ fr فرنسي\ntr تركي │ es إسباني │ de ألماني`

  let lang = args[0]
  let text = args.slice(1).join(' ')

  if (!lang) throw usageMsg
  if (lang.length !== 2) { lang = defaultLang; text = args.join(' ') }
  if (!text && m.quoted?.text) text = m.quoted.text
  if (!text) throw usageMsg

  await typingDelay(conn, m.chat, 800)

  try {
    const result = await translate.default(text, { to: lang })
    await m.reply(
      `╭────『 🌍 الترجمة 』────\n│\n│ 🔤 *النص:* ${text.slice(0, 200)}\n│\n│ 🌐 *الترجمة [${lang}]:*\n│ ${result.text}\n│\n╰──────────────────`.trim()
    )
  } catch (e) {
    console.error('[TR ERROR]', e)
    throw `❌ فشل الترجمة — تأكد من رمز اللغة\n${usageMsg}`
  }
}

handler.help = ['ترجم en النص']
handler.tags = ['tools']
handler.command = /^(ترجم|ترجمه|translate|tr)$/i
export default handler
