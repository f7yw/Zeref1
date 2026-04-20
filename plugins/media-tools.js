import { syncEnergy, FEES, initEconomy, logTransaction } from '../lib/economy.js'
import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'

// ─── Check if yt-dlp is available ────────────────────────────────────────────
function hasYtdlp() {
  try { execSync('yt-dlp --version', { stdio: 'ignore' }); return true } catch { return false }
}

// ─── Extract best info from URL ──────────────────────────────────────────────
async function fetchMediaInfo(url) {
  const yt = await import('yt-search').then(m => m.default).catch(() => null)
  if (!yt) return null
  const r = await yt(url).catch(() => null)
  return r?.videos?.[0] || null
}

let handler = async (m, { conn, usedPrefix, command, text, args }) => {
  const user = global.db.data.users[m.sender]
  if (!user) return m.reply('❌ أرسل أي أمر أولاً لتسجيل حسابك.')
  initEconomy(user)

  // ── معلومات_رابط / link_info ─────────────────────────────────────────────
  if (/^(معلومات_رابط|معلومات-رابط|link_info|info_link)$/i.test(command)) {
    if (!text || !/^https?:\/\//i.test(text))
      return m.reply(`❌ أرسل رابطاً صحيحاً:\n${usedPrefix}معلومات_رابط https://...`)

    const isYT    = /youtube\.com|youtu\.be/i.test(text)
    const isIG    = /instagram\.com/i.test(text)
    const isFB    = /facebook\.com|fb\.watch/i.test(text)
    const isTwit  = /twitter\.com|x\.com/i.test(text)
    const isTT    = /tiktok\.com/i.test(text)

    let platform = '🌐 رابط عام'
    if (isYT)   platform = '📺 يوتيوب'
    if (isIG)   platform = '📸 إنستاغرام'
    if (isFB)   platform = '📘 فيسبوك'
    if (isTwit) platform = '🐦 تويتر/X'
    if (isTT)   platform = '🎵 تيك توك'

    const safe = /(login|verify|gift|free|password|token|t\.co|bit\.ly)/i.test(text)
      ? '⚠️ يحتاج حذر' : '✅ يبدو آمناً'

    return m.reply(`
╭────『 🔗 معلومات الرابط 』────
│
│ 🌍 المنصة:   ${platform}
│ 🛡️ الفحص:   ${safe}
│ 📎 الرابط:   ${text.slice(0, 60)}${text.length > 60 ? '…' : ''}
│
│ ─── أوامر التحميل ───
│ ${usedPrefix}تحميل_صوت  <رابط>  ← تحميل صوت
│ ${usedPrefix}تحميل_فيديو <رابط> ← تحميل فيديو
│
╰──────────────────`.trim())
  }

  // ── تحميل_صوت / extract_audio ────────────────────────────────────────────
  if (/^(تحميل_صوت|استخراج_صوت|extract_audio)$/i.test(command)) {
    const url = args[0] || text
    if (!url || !/^https?:\/\//i.test(url))
      return m.reply(`❌ مثال:\n${usedPrefix}تحميل_صوت https://youtu.be/xxx`)

    const energy = syncEnergy(user)
    if (energy < FEES.ai && !user.infiniteResources)
      return m.reply(`❌ طاقتك غير كافية (${energy}⚡). الحد الأدنى: ${FEES.ai}⚡`)

    await m.reply('⏳ جاري البحث عن الصوت...')

    // Try using lib/ytdlp.js if available
    try {
      const ytdlp = await import('../lib/ytdlp.js').then(m => m.default || m).catch(() => null)
      if (ytdlp?.downloadAudio) {
        const result = await ytdlp.downloadAudio(url)
        if (result) {
          if (!user.infiniteResources) {
            user.energy = Math.max(0, (user.energy || 0) - FEES.ai)
            user.lastEnergyRegen = Date.now()
          }
          logTransaction(user, 'spend', 0, '🎵 استخراج صوت')
          return conn.sendMessage(m.chat, { audio: result, mimetype: 'audio/mpeg', ptt: false }, { quoted: m })
        }
      }
    } catch (_) {}

    // Fallback: use y2mate or similar via lib/y2mate.js
    try {
      const y2 = await import('../lib/y2mate.js').then(m => m.default || m).catch(() => null)
      if (y2) {
        const dl = await y2(url, 'mp3')
        if (dl?.link) {
          if (!user.infiniteResources) {
            user.energy = Math.max(0, (user.energy || 0) - FEES.ai)
          }
          logTransaction(user, 'spend', 0, '🎵 استخراج صوت')
          return conn.sendMessage(m.chat, { audio: { url: dl.link }, mimetype: 'audio/mpeg' }, { quoted: m })
        }
      }
    } catch (_) {}

    return m.reply('❌ لم أتمكن من تحميل الصوت. يدعم روابط يوتيوب بشكل أساسي.\n💡 جرب: ' + usedPrefix + 'اغنيه صوت <اسم>')
  }

  // ── تحميل_فيديو / extract_video ──────────────────────────────────────────
  if (/^(تحميل_فيديو|استخراج_فيديو|extract_video|extract_image)$/i.test(command)) {
    const url = args[0] || text
    if (!url || !/^https?:\/\//i.test(url))
      return m.reply(`❌ مثال:\n${usedPrefix}تحميل_فيديو https://youtu.be/xxx`)

    const energy = syncEnergy(user)
    if (energy < FEES.hd && !user.infiniteResources)
      return m.reply(`❌ طاقتك غير كافية (${energy}⚡). الحد الأدنى: ${FEES.hd}⚡`)

    await m.reply('⏳ جاري تجهيز الفيديو...')

    try {
      const ytdlp = await import('../lib/ytdlp.js').then(m => m.default || m).catch(() => null)
      if (ytdlp?.downloadVideo) {
        const result = await ytdlp.downloadVideo(url)
        if (result) {
          if (!user.infiniteResources) {
            user.energy = Math.max(0, (user.energy || 0) - FEES.hd)
          }
          logTransaction(user, 'spend', 0, '🎬 تحميل فيديو')
          return conn.sendMessage(m.chat, { video: result, mimetype: 'video/mp4' }, { quoted: m })
        }
      }
    } catch (_) {}

    return m.reply('❌ لم أتمكن من تحميل الفيديو.\n💡 جرب: ' + usedPrefix + 'فيديو <اسم على يوتيوب>')
  }

  // ── OCR / نص_صورة ────────────────────────────────────────────────────────
  if (/^(ocr|نص_صورة|استخراج_نص|copy_text)$/i.test(command)) {
    const quoted = m.quoted
    if (!quoted?.mimetype?.startsWith('image'))
      return m.reply(`❌ أرسل صورة ثم رُد عليها بـ:\n${usedPrefix}ocr`)

    await m.reply('⏳ جاري قراءة النص من الصورة...')

    try {
      const Tesseract = await import('tesseract.js').catch(() => null)
      if (!Tesseract) throw new Error('tesseract not installed')

      const buffer = await quoted.download()
      const { data: { text: ocrText } } = await Tesseract.default.recognize(buffer, 'ara+eng')
      const clean = (ocrText || '').trim()

      if (!clean) return m.reply('⚠️ لم أجد أي نص في الصورة.')

      const energy = syncEnergy(user)
      if (!user.infiniteResources && energy >= FEES.ai) {
        user.energy = Math.max(0, (user.energy || 0) - FEES.ai)
      }

      return m.reply(`╭────『 📝 نص الصورة 』────\n│\n${clean.split('\n').map(l => '│ ' + l).join('\n')}\n│\n╰──────────────────`)
    } catch (e) {
      return m.reply(`❌ خاصية OCR تحتاج مكتبة tesseract.js\n💡 يمكن إضافتها لاحقاً.\nالخطأ: ${e.message}`)
    }
  }

  // ── تحويل_صيغة / convert_format ──────────────────────────────────────────
  if (/^(تحويل_صيغة|تحويل-صيغة|convert_format)$/i.test(command)) {
    const quoted = m.quoted
    if (!quoted) return m.reply(`❌ رُد على ملف أو صورة أو فيديو:\n${usedPrefix}تحويل_صيغة`)

    const mime = quoted.mimetype || ''
    if (mime.startsWith('image')) {
      await m.reply('⏳ جاري التحويل إلى ملصق...')
      try {
        const buf = await quoted.download()
        await conn.sendMessage(m.chat, { sticker: buf }, { quoted: m })
      } catch (e) {
        return m.reply('❌ فشل التحويل: ' + e.message)
      }
    } else if (mime.startsWith('video') || mime === 'image/gif') {
      await m.reply('⏳ جاري التحويل إلى ملصق متحرك...')
      try {
        const buf = await quoted.download()
        const { toAudio } = await import('../lib/converter.js')
        const audio = await toAudio(buf, 'mp4')
        await conn.sendMessage(m.chat, { audio, mimetype: 'audio/mp4', ptt: false }, { quoted: m })
      } catch (e) {
        return m.reply('❌ فشل التحويل: ' + e.message)
      }
    } else {
      return m.reply('❌ الصيغة غير مدعومة حالياً. مدعوم: صورة → ملصق، فيديو → صوت.')
    }
  }

  // ── بحث_صورة / search_image ──────────────────────────────────────────────
  if (/^(بحث_صورة|search_image|صورة_بحث)$/i.test(command)) {
    if (!text) return m.reply(`❌ مثال:\n${usedPrefix}بحث_صورة قطة`)
    await m.reply('⏳ جاري البحث عن الصورة...')

    try {
      const got = await import('node-fetch').then(m => m.default).catch(() => null)
      if (!got) throw new Error('node-fetch not available')

      const q = encodeURIComponent(text)
      const url = `https://source.unsplash.com/800x600/?${q}`
      const res = await got(url, { redirect: 'follow' })
      if (!res.ok) throw new Error('لم يتم إيجاد صورة')

      const buf = Buffer.from(await res.arrayBuffer())
      await conn.sendMessage(m.chat, { image: buf, caption: `🔍 نتيجة بحث: ${text}` }, { quoted: m })
    } catch (e) {
      return m.reply(`❌ البحث عن الصورة فشل: ${e.message}\n💡 جرب: ${usedPrefix}بنترست ${text}`)
    }
  }
}

handler.help    = ['معلومات_رابط', 'تحميل_صوت', 'تحميل_فيديو', 'ocr', 'تحويل_صيغة', 'بحث_صورة']
handler.tags    = ['media']
handler.command = /^(معلومات_رابط|معلومات-رابط|link_info|info_link|تحميل_صوت|استخراج_صوت|extract_audio|تحميل_فيديو|استخراج_فيديو|extract_video|extract_image|ocr|نص_صورة|استخراج_نص|copy_text|تحويل_صيغة|تحويل-صيغة|convert_format|بحث_صورة|search_image|صورة_بحث)$/i

export default handler
