import translate from '@vitalets/google-translate-api'
import { deductEnergy, syncEnergy, initEconomy, FEES, MAX_ENERGY } from '../lib/economy.js'

const defaultLang = 'ar'
const tld = 'cn'

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

  let err = `مثال:\n.ترجم en مرحبا\n.ترجم ar hello world`.trim()
  let lang = args[0]
  let text = args.slice(1).join(' ')

  if ((args[0] || '').length !== 2) {
    lang = defaultLang
    text = args.join(' ')
  }
  if (!text && m.quoted && m.quoted.text) text = m.quoted.text
  if (!text) throw err

  try {
    const result = await translate(text, { to: lang, tld })
    await m.reply(
      `╭────『 🌍 الترجمة 』────\n│\n│ 🔤 *من:* ${text}\n│\n│ 🌐 *إلى [${lang}]:*\n│ ${result.text}\n│\n│ ⚡ -${FEES.translate} طاقة\n╰──────────────────`.trim()
    )
  } catch (e) {
    throw '❌ فشل الترجمة، تأكد من رمز اللغة.\nمثال: ar, en, fr, tr, es'
  }
}

handler.help    = []
handler.tags    = ['tools']
handler.command = /^$/
handler.disabled = true
export default handler
