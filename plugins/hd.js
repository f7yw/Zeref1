import sharp from 'sharp'
import { deductEnergy, syncEnergy, initEconomy, FEES, MAX_ENERGY } from '../lib/economy.js'

let handler = async (m, { conn, usedPrefix }) => {
  const user = global.db.data.users[m.sender]
  if (user) {
    initEconomy(user)
    syncEnergy(user)
    if (user.energy < FEES.hd) {
      throw `╭────『 ⚡ طاقة ناضبة 』────
│
│ ❌ تحسين الصورة يحتاج *${FEES.hd} ⚡*
│ طاقتك: *${user.energy}/${MAX_ENERGY}*
│
│ 💡 استخدم *${usedPrefix}يومي* أو انتظر الشحن التلقائي
│
╰──────────────────`.trim()
    }
  }

  conn.hdr = conn.hdr || {}
  if (m.sender in conn.hdr) throw '⏳ لا تزال عملية جارية، انتظر حتى تنتهي.'

  const q = m.quoted ? m.quoted : m
  const mime = (q.msg || q).mimetype || q.mediaType || ''
  if (!mime) throw '❌ أرسل أو اقتبس صورة مع الأمر.'
  if (!/image\/(jpe?g|png|webp)/i.test(mime)) throw '❌ الصيغة المدعومة: JPG أو PNG فقط.'

  conn.hdr[m.sender] = true
  if (user) deductEnergy(user, FEES.hd)
  await m.reply(`⚙️ جاري رفع جودة الصورة... ⚡ -${FEES.hd} طاقة\n🔗 ${global.md}`)

  try {
    const img = await downloadMedia(q)
    if (!img || !Buffer.isBuffer(img) || img.length < 100) throw new Error('تعذر تحميل الصورة')

    const meta = await sharp(img).metadata()
    const newW = Math.min((meta.width || 800) * 2, 4000)
    const newH = Math.min((meta.height || 800) * 2, 4000)

    const out = await sharp(img)
      .resize(newW, newH, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
      .sharpen({ sigma: 1.5, m1: 0.8, m2: 0.5 })
      .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
      .toBuffer()

    await conn.sendMessage(m.chat, { image: out, caption: `✅ تم رفع الجودة!\n📐 ${meta.width}×${meta.height} ➜ ${newW}×${newH}\n🔗 ${global.md}` }, { quoted: m })
  } catch (er) {
    console.error('[HD ERROR]', er)
    m.reply('❌ فشل تحسين الجودة، تأكد أن الصورة واضحة وحاول مجدداً.')
  } finally {
    delete conn.hdr[m.sender]
  }
}

handler.help = ['جوده', 'HD']
handler.tags = ['tools', 'ai']
handler.command = /^(جوده|دقه|hd|HD)$/i
handler.register = false
handler.limit = false
export default handler

async function downloadMedia(msg) {
  if (typeof msg.download === 'function') {
    const d = await msg.download()
    if (d) return Buffer.isBuffer(d) ? d : Buffer.from(d)
  }
  if (msg.msg && typeof msg.msg.download === 'function') {
    const d = await msg.msg.download()
    if (d) return Buffer.isBuffer(d) ? d : Buffer.from(d)
  }
  throw new Error('No download method available')
}
