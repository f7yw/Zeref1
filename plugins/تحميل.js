import playdl from 'play-dl'
import yts from 'yt-search'
import fs from 'fs'
import { pipeline } from 'stream'
import { promisify } from 'util'
import os from 'os'

const streamPipeline = promisify(pipeline)

let handler = async (m, { conn, command, text, args, usedPrefix }) => {
  if (!text) throw `*مثال:*\n${usedPrefix}${command} https://youtu.be/xxxx\n${usedPrefix}${command} Billie Eilish`

  await m.reply(global.wait)

  let url = text.trim()
  let title = text

  // If not a URL, search YouTube
  if (!/^https?:\/\//i.test(url)) {
    const search = await yts(text)
    if (!search?.videos?.length) throw '❌ لم يتم العثور على نتائج'
    const vid = search.videos[0]
    url = vid.url
    title = vid.title
    await conn.sendMessage(m.chat, {
      image: { url: vid.thumbnail },
      caption: `🎬 *${title}*\n⏱️ ${vid.timestamp} │ 👁️ ${vid.views}\n📅 ${vid.ago}\n🔗 ${url}`
    }, { quoted: m })
  }

  const validated = await playdl.yt_validate(url)
  if (validated !== 'video') throw '❌ رابط غير صحيح أو غير مدعوم'

  const info = await playdl.video_basic_info(url)
  title = info.video_details.title || title
  const duration = info.video_details.durationInSec || 0

  if (duration > 600) throw '❌ مدة الفيديو تتجاوز 10 دقائق، جرب مقطعاً أقصر'

  const stream = await playdl.stream(url, { quality: 1 })
  const safeTitle = title.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_').slice(0, 50)
  const filePath = `${os.tmpdir()}/${safeTitle}_${Date.now()}.mp4`

  await streamPipeline(stream.stream, fs.createWriteStream(filePath))

  await conn.sendMessage(m.chat, {
    video: { url: filePath },
    caption: `🎬 *${title}*\n🔗 ${global.md}`,
    mimetype: 'video/mp4',
    fileName: `${safeTitle}.mp4`
  }, { quoted: m })

  fs.unlink(filePath, () => {})
}

handler.help = ['فيديو <رابط أو اسم>']
handler.tags = ['downloader']
handler.command = /^(فيديو|video|dl|تحميل)$/i
handler.exp = 0

export default handler
