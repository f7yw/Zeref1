import FormData from 'form-data'
import sharp from 'sharp'
import { deductEnergy, syncEnergy, initEconomy, FEES, MAX_ENERGY , isVip} from '../lib/economy.js'

let handler = async (m, { conn, usedPrefix }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
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
  if (!/image\/(jpe?g|png)/i.test(mime)) throw '❌ الصيغة المدعومة: JPG أو PNG فقط.'

  conn.hdr[m.sender] = true

  if (user) deductEnergy(user, FEES.hd)

  await m.reply(`⚙️ جاري رفع جودة الصورة... ⚡ -${FEES.hd} طاقة\n👤 العضوية: ${vipStatus}`)

  try {
    const img = await downloadMedia(q)
    if (!img || !Buffer.isBuffer(img) || img.length < 100) {
      throw new Error('تعذر تحميل الصورة بشكل صحيح')
    }

    let out
    try {
      out = await processing(img, 'enhance')
      if (!isImageBuffer(out)) throw new Error('API returned non-image buffer')
    } catch (apiError) {
      console.error('[HD API ERROR]', apiError)
      out = await localEnhance(img)
      if (!isImageBuffer(out)) throw new Error('Local enhancement failed')
    }

    await conn.sendMessage(
      m.chat,
      {
        image: out,
        caption: '✅ تم رفع الجودة!'
      },
      { quoted: m }
    )
  } catch (er) {
    console.error('[HD ERROR]', er)
    m.reply('❌ فشل تحسين الجودة، حاول مجدداً.\n👤 العضوية: ' + vipStatus)
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

function isImageBuffer(buf) {
  if (!buf || !Buffer.isBuffer(buf) || buf.length < 4) return false
  const b0 = buf[0], b1 = buf[1], b2 = buf[2], b3 = buf[3]

  const isJpeg = b0 === 0xff && b1 === 0xd8
  const isPng = b0 === 0x89 && b1 === 0x50 && b2 === 0x4e && b3 === 0x47

  return isJpeg || isPng
}

async function downloadMedia(msg) {
  if (typeof msg.download === 'function') {
    const data = await msg.download()
    if (data) return Buffer.isBuffer(data) ? data : Buffer.from(data)
  }

  if (msg.msg && typeof msg.msg.download === 'function') {
    const data = await msg.msg.download()
    if (data) return Buffer.isBuffer(data) ? data : Buffer.from(data)
  }

  if (msg.downloadMediaMessage) {
    const data = await msg.downloadMediaMessage()
    if (data) return Buffer.isBuffer(data) ? data : Buffer.from(data)
  }

  throw new Error('No download method available for media')
}

async function localEnhance(buffer) {
  const img = sharp(buffer, { failOn: 'none' })
  const meta = await img.metadata()

  const w = meta.width || 800
  const h = meta.height || 600

  return await sharp(buffer, { failOn: 'none' })
    .resize(Math.min(w * 2, 4096), Math.min(h * 2, 4096), { fit: 'inside' })
    .modulate({ brightness: 1.05, saturation: 1.1 })
    .sharpen({ sigma: 1.2 })
    .jpeg({ quality: 92, progressive: false })
    .toBuffer()
}

async function processing(urlPath, method) {
  return new Promise((resolve, reject) => {
    const methods = ['enhance', 'recolor', 'dehaze']
    if (!methods.includes(method)) method = methods[0]

    const form = new FormData()
    const scheme = `https://inferenceengine.vyro.ai/${method}`

    form.append('model_version', 1, {
      'Content-Transfer-Encoding': 'binary',
      contentType: 'multipart/form-data; charset=utf-8'
    })

    form.append('image', Buffer.from(urlPath), {
      filename: 'enhance_image_body.jpg',
      contentType: 'image/jpeg'
    })

    form.submit(
      {
        url: scheme,
        host: 'inferenceengine.vyro.ai',
        path: `/${method}`,
        protocol: 'https:',
        headers: {
          'User-Agent': 'okhttp/4.9.3',
          Connection: 'Keep-Alive',
          'Accept-Encoding': 'gzip'
        }
      },
      (err, res) => {
        if (err) return reject(err)

        const data = []

        res.on('data', chunk => data.push(chunk))

        res.on('end', () => {
          const buffer = Buffer.concat(data)

          if (!buffer || buffer.length < 100) {
            return reject(new Error('Empty response from API'))
          }

          if (buffer.length >= 2) {
            const asText = buffer.toString('utf8').trim()

            if (
              asText.startsWith('<!') ||
              asText.startsWith('{') ||
              asText.startsWith('[') ||
              asText.toLowerCase().includes('error') ||
              asText.toLowerCase().includes('blocked') ||
              asText.toLowerCase().includes('rate') ||
              asText.toLowerCase().includes('forbidden') ||
              asText.toLowerCase().includes('unauthorized') ||
              asText.toLowerCase().includes('not supported') ||
              asText.toLowerCase().includes('method not allowed')
            ) {
              return reject(new Error(asText.slice(0, 300)))
            }
          }

          resolve(buffer)
        })

        res.on('error', reject)
      }
    )
  })
}
