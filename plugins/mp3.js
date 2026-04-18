import fs from 'fs'
import { downloadAudio, searchYouTube } from '../lib/ytdlp.js'
import { recordingDelay } from '../lib/presence.js'

let handler = async (m, { conn, command, text, usedPrefix }) => {
  if (!text) throw `*مثال: ${usedPrefix}${command} شكراً حبيبي عمرو دياب*`

  await m.reply(global.wait)
  await recordingDelay(conn, m.chat, 2000)

  let url
  if (/^https?:\/\//i.test(text.trim())) {
    url = text.trim()
  } else {
    const results = await searchYouTube(text, 1)
    if (!results.length) throw '❌ لم يتم العثور على نتائج، جرب كلمات مختلفة'
    url = results[0].url || `https://www.youtube.com/watch?v=${results[0].id}`
  }

  const { filePath, title, thumbnail, duration } = await downloadAudio(url, { maxDuration: 900 })

  const mins = Math.floor(duration / 60)
  const secs = duration % 60
  const timeStr = duration ? `${mins}:${String(secs).padStart(2, '0')}` : ''

  // Send as audio file
  await conn.sendMessage(m.chat, {
    audio: { url: filePath },
    mimetype: 'audio/mpeg',
    fileName: `${title.slice(0, 80)}.mp3`,
    ptt: false
  }, { quoted: m })

  // Brief caption reply
  await m.reply(`🎵 *${title}*${timeStr ? `\n⏱️ ${timeStr}` : ''}`)

  fs.unlink(filePath, () => {})
}

handler.help = ['mp3 <اسم الأغنية أو رابط>']
handler.tags = ['downloader']
handler.command = /^(mp3|اغنيه|اغنية|اغنيه صوت|تحميل صوت|موسيقى|موسيقا)$/i
handler.exp = 0

export default handler
