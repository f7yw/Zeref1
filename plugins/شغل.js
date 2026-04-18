import yts from 'yt-search'
import fs from 'fs'
import { downloadAudio, searchYouTube } from '../lib/ytdlp.js'
import { recordingDelay } from '../lib/presence.js'

var handler = async (m, { conn, command, text, usedPrefix }) => {
  if (!text) throw `*مثال: ${usedPrefix}${command} اية الكرسي*`

  await m.reply(global.wait)
  await recordingDelay(conn, m.chat, 1500)

  let url, videoInfo

  // Check if it's a URL or a search query
  if (/^https?:\/\//i.test(text.trim())) {
    url = text.trim()
  } else {
    const results = await searchYouTube(text, 1)
    if (!results.length) throw '*❌ لم يتم العثور على نتائج*'
    videoInfo = results[0]
    url = videoInfo.url || `https://www.youtube.com/watch?v=${videoInfo.id}`
  }

  // Fallback: use yts for thumbnail/display info
  if (!videoInfo) {
    try {
      const s = await yts({ videoId: url.match(/[?&]v=([^&]+)/)?.[1] || url.split('/').pop() })
      if (s) videoInfo = s
    } catch (_) {}
  }

  const { filePath, title, thumbnail, webpage_url, views } = await downloadAudio(url, { maxDuration: 600 })

  const caption = `*❖───┊ ♪ يوتيوب ♪ ┊───❖*

  ❏ *العنوان:* ${title}
  ❒ *الرابط:* ${webpage_url || url}`

  // Send thumbnail first if available
  if (thumbnail) {
    try {
      await conn.sendMessage(m.chat, { image: { url: thumbnail }, caption }, { quoted: m })
    } catch (_) {
      await m.reply(caption)
    }
  } else {
    await m.reply(caption)
  }

  // Send audio
  await conn.sendMessage(m.chat, {
    audio: { url: filePath },
    mimetype: 'audio/mpeg',
    fileName: `${title.slice(0, 80)}.mp3`,
    ptt: false
  }, { quoted: m })

  fs.unlink(filePath, () => {})
}

handler.help = ['شغل <اسم الأغنية أو رابط>']
handler.tags = ['downloader']
handler.command = /^شغل$/i
handler.exp = 0

export default handler
