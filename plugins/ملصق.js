import { isVip } from '../lib/economy.js'
import { sticker } from '../lib/sticker.js'
import { typingDelay, recordingDelay } from '../lib/presence.js'

const BOT_PACK = 'SHADOW Bot'
const BOT_AUTH = 'Zeref | t.me/ZerefBot'

let handler = async (m, { conn, usedPrefix, command }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  const isReverse = /^(صوره|صورة|فك_ملصق|فك-ملصق|unsticker|toimage)$/i.test(command)

  try {
    if (isReverse) {
      // Sticker → image
      const quoted = m.quoted || m
      const mime = (quoted.msg || quoted)?.mimetype || ''
      if (!mime.includes('webp')) throw '❌ الرجاء الرد على ملصق (sticker)'
      
      await typingDelay(conn, m.chat, 800)
      const buf = await quoted.download()
      if (!buf) throw '❌ تعذر تحميل الملصق'
      
      const { default: sharp } = await import('sharp')
      const png = await sharp(buf).png().toBuffer()
      
      await conn.sendMessage(m.chat, { image: png, caption: '🖼️ تم تحويل الملصق لصورة' }, { quoted: m })
      return
    }

    // Image / video → sticker
    const quoted = m.quoted || m
    const mime = (quoted.msg || quoted)?.mimetype || ''
    const isImg = /image\/(jpeg|jpg|png|gif|webp)/.test(mime)
    const isVid = /video\//.test(mime) || mime === 'image/gif'
    const isStk = mime.includes('webp')

    if (!isImg && !isVid && !isStk) {
      throw `╭────『 📌 الملصق 』────
│
│ *الاستخدام:*
│ — رد على صورة + ${usedPrefix}ملصق
│   ⟵ تحويل صورة لملصق ثابت
│
│ — رد على فيديو (≤3 ثواني) + ${usedPrefix}ملصق
│   ⟵ تحويل فيديو لملصق متحرك
│
│ — رد على ملصق + ${usedPrefix}صوره
│   ⟵ تحويل ملصق لصورة
│
╰──────────────────`.trim()
    }

    if (isVid) {
      await recordingDelay(conn, m.chat, 1200)
    } else {
      await typingDelay(conn, m.chat, 800)
    }

    const buf = await quoted.download()
    if (!buf) throw '❌ تعذر تحميل الوسائط'

    const stiker = await sticker(buf, false, BOT_PACK, BOT_AUTH)
    if (!stiker) throw '❌ فشل تحويل الوسائط لملصق'

    await conn.sendMessage(m.chat, { sticker: stiker }, { quoted: m })

  } catch (e) {
    console.error('[STICKER ERR]', e)
    const errMsg = typeof e === 'string' ? e : '❌ حدث خطأ أثناء معالجة الملصق'
    await m.reply(errMsg)
  }
}

handler.help = ['ملصق', 'صوره']
handler.tags = ['tools']
handler.command = /^(ملصق|ملصقات|sticker|stickerر|صوره|صورة|فك_ملصق|فك-ملصق|unsticker|toimage)$/i
handler.exp = 5
handler.limit = false

export default handler
