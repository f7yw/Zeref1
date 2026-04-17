import { menuSections, sections } from './menu.js'

let handler = async (m, { conn }) => {

  const session = global.menuSessions?.[m.sender] || { prefix: '.' }

  const map = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9', '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9' }
  const choice = m.text.trim().replace(/[٠-٩۰-۹]/g, d => map[d] || d)

  let section = menuSections[choice]
  if (!section) {
    section = Object.values(menuSections).find(item => item.title === choice)
  }
  if (!section && sections[choice]) {
    section = { text: sections[choice].text }
  }
  if (!section) return

  await conn.reply(
    m.chat,
    section.text(session.prefix),
    m
  )

  // حذف الجلسة بعد الاستخدام
  if (global.menuSessions?.[m.sender]) delete global.menuSessions[m.sender]
}

handler.customPrefix = /^(10|[1-9]|١٠|[١-٩]|📖 القرآن الكريم|🤖 الذكاء الاصطناعي|🎮 الألعاب|😄 ترفيه|🛠️ الأدوات|💰 الاقتصاد|📊 المعلومات|👥 إدارة القروب|👑 أوامر المالك|📜 كل الأوامر)$/
handler.command = new RegExp

export default handler