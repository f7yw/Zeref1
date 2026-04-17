import { menuSections, sections } from './menu.js'

let handler = async (m, { conn }) => {

  if (!global.menuSessions) return
  const session = global.menuSessions[m.sender]
  if (!session) return

  const choice = m.text.trim()

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
  delete global.menuSessions[m.sender]
}

handler.customPrefix = /^(10|[1-9]|📖 القرآن الكريم|🤖 الذكاء الاصطناعي|🎮 الألعاب|😄 ترفيه|🛠️ الأدوات|💰 الاقتصاد|📊 المعلومات|👥 إدارة القروب|👑 أوامر المالك|📜 كل الأوامر)$/
handler.command = new RegExp

export default handler