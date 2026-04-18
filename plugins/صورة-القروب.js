import { downloadContentFromMessage } from '@whiskeysockets/baileys'
import { Readable } from 'stream'

async function streamToBuffer(stream) {
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks)
}

let handler = async (m, { conn, usedPrefix, command }) => {
  if (!m.isGroup) throw '❌ هذا الأمر للمجموعات فقط.'

  if (/^(صورة_القروب|صورة-القروب|getpp|getgpp)$/i.test(command)) {
    try {
      const ppUrl = await conn.profilePictureUrl(m.chat, 'image')
      await conn.sendMessage(m.chat, {
        image: { url: ppUrl },
        caption: '🖼️ صورة المجموعة الحالية'
      }, { quoted: m })
    } catch {
      throw '❌ المجموعة لا تملك صورة، أو لا توجد صلاحية لعرضها.'
    }
    return
  }

  if (/^(تغيير_صورة_القروب|تغيير-صورة-القروب|setgpp|صورة_جروب)$/i.test(command)) {
    const isAdmin = m.isAdmin
    const isBotAdmin = m.isBotAdmin
    if (!isAdmin) throw '❌ هذا الأمر للمشرفين فقط.'
    if (!isBotAdmin) throw '❌ البوت يحتاج صلاحية مشرف لتغيير صورة المجموعة.'

    const quoted = m.quoted
    let imgBuffer = null

    if (quoted?.mimetype?.startsWith('image')) {
      try {
        const stream = await downloadContentFromMessage(quoted.message?.imageMessage, 'image')
        imgBuffer = await streamToBuffer(stream)
      } catch (_) {}
    } else if (m.mimetype?.startsWith('image')) {
      try {
        const stream = await downloadContentFromMessage(m.message?.imageMessage, 'image')
        imgBuffer = await streamToBuffer(stream)
      } catch (_) {}
    }

    if (!imgBuffer) throw `📸 أرسل أو رد على صورة مع الأمر *${usedPrefix}${command}* لتغيير صورة المجموعة.`

    await conn.updateProfilePicture(m.chat, imgBuffer)
    return m.reply('✅ تم تغيير صورة المجموعة بنجاح.')
  }
}

handler.help = ['صورة_القروب', 'تغيير_صورة_القروب']
handler.tags = ['group']
handler.command = /^(صورة_القروب|صورة-القروب|getpp|getgpp|تغيير_صورة_القروب|تغيير-صورة-القروب|setgpp|صورة_جروب)$/i
handler.group = true
export default handler
