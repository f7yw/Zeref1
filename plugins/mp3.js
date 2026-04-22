import { isVip } from '../lib/economy.js'
import yts from 'yt-search'
import fs from 'fs'
import { downloadAudio, searchYouTube } from '../lib/ytdlp.js'
import { recordingDelay } from '../lib/presence.js'

let handler = async (m, { conn, args, command, usedPrefix, text }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  if (!text) throw `*مثال:* ${usedPrefix}${command} بيلي\n👤 العضوية: ${vipStatus}`

  await m.reply(global.wait || '⏳ جاري التحميل...')
  await recordingDelay(conn, m.chat, 1500)

  let url, info
  if (/^https?:\/\//i.test(text.trim())) {
    url = text.trim()
  } else {
    try {
      const results = await searchYouTube(text, 1)
      if (results?.length) {
        info = results[0]
        url = info.url || (info.id ? `https://www.youtube.com/watch?v=${info.id}` : null)
      }
    } catch (_) {}
    if (!url) {
      try {
        const s = await yts(text)
        if (s.videos.length) { info = s.videos[0]; url = info.url }
      } catch (_) {}
    }
  }

  if (!url) throw '❌ لم يتم العثور على نتائج.'

  try {
    const { filePath, title, thumbnail, webpage_url } = await downloadAudio(url, { maxDuration: 600 })
    const caption = `╭────『 🎵 أغنية 』────\n│\n│ ❏ *العنوان:* ${title}\n│ 🔗 ${webpage_url || url}\n│\n╰──────────────────`
    if (thumbnail) {
      try { await conn.sendMessage(m.chat, { image: { url: thumbnail }, caption }, { quoted: m }) }
      catch { await m.reply(caption) }
    } else { await m.reply(caption) }

    await conn.sendMessage(m.chat, {
      audio: { url: filePath },
      mimetype: 'audio/mpeg',
      fileName: `${title.slice(0, 80)}.mp3`,
      ptt: false
    }, { quoted: m })
    if (fs.existsSync(filePath)) fs.unlink(filePath, () => {})
  } catch (e) {
    await m.reply(`❌ فشل التحميل: ${e?.message || 'خطأ'}\n🔗 الرابط: ${url}`)
  }
}
handler.help = ['اغنيه <اسم/رابط>']
handler.tags = ['downloader']
handler.command = /^(mp3|اغنيه|اغنية|تحميل_صوت|موسيقى|موسيقا|song)$/i
export default handler
