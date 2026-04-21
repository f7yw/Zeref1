import { isVip } from '../lib/economy.js'
import yts from 'yt-search'
import fs from 'fs'
import { downloadAudio, searchYouTube } from '../lib/ytdlp.js'
import { recordingDelay } from '../lib/presence.js'

var handler = async (m, { conn, command, text, usedPrefix }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  if (!text) throw `*مثال: ${usedPrefix}${command} اية الكرسي*`

  await m.reply(global.wait)
  await recordingDelay(conn, m.chat, 1500)

  let url, videoInfo

  // Check if it's a URL or a search query
  if (/^https?:\/\//i.test(text.trim())) {
    url = text.trim()
  } else {
    try {
      const results = await searchYouTube(text, 1)
      if (results.length) {
        videoInfo = results[0]
        url = videoInfo.url || (videoInfo.id ? `https://www.youtube.com/watch?v=${videoInfo.id}` : null)
      }
    } catch (e) {
      console.error('yt-dlp search failed:', e)
    }

    // Fallback to yts for searching if yt-dlp search failed or returned nothing
    if (!url) {
      try {
        const s = await yts(text)
        if (s.videos.length) {
          videoInfo = s.videos[0]
          url = videoInfo.url
        }
      } catch (e) {
        console.error('yt-search failed:', e)
      }
    }
  }

  if (!url) throw '*❌ لم يتم العثور على نتائج للبحث*'

  // Get video info for display if not already fetched
  if (!videoInfo) {
    try {
      const s = await yts({ videoId: url.match(/[?&]v=([^&]+)/)?.[1] || url.split('/').pop() })
      if (s) videoInfo = s
    } catch (_) {}
  }

  try {
    const { filePath, title, thumbnail, webpage_url } = await downloadAudio(url, { maxDuration: 600 })

    const caption = `╭────『 🎵 يوتيوب ♪ ┊───❖
│
│ ❏ *العنوان:* ${title}
│ ❒ *الرابط:* ${webpage_url || url}
│
╰──────────────────`

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

    // Clean up
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, () => {})
    }
  } catch (e) {
    console.error('Download failed:', e)
    
    // Fallback logic: if download fails, provide the link and a clear message
    let fallbackMsg = `╭────『 ⚠️ خطأ في التحميل 』────
│
│ ❌ عذراً، فشل تحميل الصوت مباشرة.
│ 📝 السبب: ${e.message.includes('دقيقة') ? e.message : 'مشكلة في الخادم أو حظر من يوتيوب'}
│ 🔗 يمكنك الاستماع عبر الرابط:
│ ${url}
│
╰──────────────────`
    
    // If we don't have videoInfo yet, try to get it one last time for the fallback
    if (!videoInfo) {
      try {
        const s = await yts(text)
        if (s.videos.length) videoInfo = s.videos[0]
      } catch (_) {}
    }

    await m.reply(fallbackMsg)
  }
}

handler.help = ['شغل <اسم الأغنية أو رابط>']
handler.tags = ['downloader']
handler.command = /^شغل$/i
handler.exp = 0

export default handler
