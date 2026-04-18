import translate from '@vitalets/google-translate-api'
import { deductEnergy, syncEnergy, initEconomy, FEES, MAX_ENERGY } from '../lib/economy.js'

const defaultLang = 'ar'

let handler = async (m, { args, usedPrefix, command }) => {
  const user = global.db.data.users[m.sender]
  if (user) {
    initEconomy(user)
    syncEnergy(user)
    if (user.energy < FEES.translate) {
      throw `╭────『 ⚡ طاقة ناضبة 』────\n│\n│ ❌ الترجمة تحتاج *${FEES.translate} ⚡*\n│ طاقتك: *${user.energy}/${MAX_ENERGY}*\n│\n│ 💡 استخدم *${usedPrefix}يومي* أو انتظر الشحن\n│\n╰──────────────────`.trim()
    }
    deductEnergy(user, FEES.translate)
  }

  const usageMsg = `*مثال الاستخدام:*\n${usedPrefix}${command} en مرحبا كيف حالك\n${usedPrefix}${command} ar Hello world\n${usedPrefix}${command} fr مرحبا\n\n*رموز اللغات الشائعة:*\nar عربي │ en إنجليزي │ fr فرنسي\ntr تركي │ es إسباني │ de ألماني\nru روسي │ zh صيني │ ja ياباني`

  let lang = args[0]
  let text = args.slice(1).join(' ')

  if (!lang) throw usageMsg
  if (lang.length !== 2) {
    lang = defaultLang
    text = args.join(' ')
  }
  if (!text && m.quoted && m.quoted.text) text = m.quoted.text
  if (!text) throw usageMsg

  try {
    const result = await translate.default(text, { to: lang })
    await m.reply(
      `╭────『 🌍 الترجمة 』────\n│\n│ 🔤 *النص:* ${text.slice(0, 200)}\n│\n│ 🌐 *الترجمة [${lang}]:*\n│ ${result.text}\n│\n│ 🔗 ${global.md}\n╰──────────────────`.trim()
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
