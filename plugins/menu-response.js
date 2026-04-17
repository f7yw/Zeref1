import { menuSections } from './menu.js'

let handler = async (m, { conn }) => {

  if (!global.menuSessions) return
  const session = global.menuSessions[m.sender]
  if (!session) return

  const choice = m.text.trim()

  if (!menuSections[choice]) return

  const section = menuSections[choice]

  await conn.reply(
    m.chat,
    section.text(session.prefix),
    m
  )

  // حذف الجلسة بعد الاستخدام
  delete global.menuSessions[m.sender]
}

handler.customPrefix = /^[1-6]$/
handler.command = new RegExp

export default handler