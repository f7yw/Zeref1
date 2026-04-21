import { isVip } from '../lib/economy.js'
import axios from 'axios'

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  if (!text) throw `*مثال: ${usedPrefix}${command} أزهار طبيعية*`

  await m.reply(global.wait)

  const images = await searchImages(text)
  if (!images.length) throw '❌ لم يتم العثور على صور، جرب كلمة أخرى'

  const count = Math.min(images.length, 4)
  let sent = 0

  for (let i = 0; i < count; i++) {
    try {
      await conn.sendMessage(m.chat, {
        image: { url: images[i] },
        caption: i === 0 ? `🖼️ *نتائج البحث عن: ${text}*\n🔍 ${count} صور\n🔗 ${global.md}` : ''
      }, { quoted: i === 0 ? m : undefined })
      sent++
      await new Promise(r => setTimeout(r, 600))
    } catch (_) {}
  }

  if (!sent) throw '❌ تعذر تحميل الصور، جرب لاحقاً'
}

handler.help = ['بنترست <بحث>']
handler.tags = ['media']
handler.command = /^(بنترست|pinterest|صور)$/i

export default handler

async function searchImages(query) {
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

  try {
    // Step 1: get DuckDuckGo VQD token
    const init = await axios.get('https://duckduckgo.com/', {
      params: { q: `${query} pinterest`, ia: 'images' },
      headers: { 'User-Agent': ua },
      timeout: 10000
    })
    const vqd = (init.data.match(/vqd=["']?([\d-]+)["']?/) || init.data.match(/vqd=([\d-]+)&/))?.[1]
    if (!vqd) throw new Error('no vqd')

    // Step 2: fetch image results
    const res = await axios.get('https://duckduckgo.com/i.js', {
      params: { q: `${query} pinterest`, vqd, o: 'json', p: '1', f: ',,,,,', l: 'us-en' },
      headers: { 'User-Agent': ua, 'Referer': 'https://duckduckgo.com/' },
      timeout: 10000
    })
    return (res.data.results || []).slice(0, 8).map(r => r.image).filter(Boolean)
  } catch {
    // Fallback: Bing image search
    const { data } = await axios.get('https://www.bing.com/images/search', {
      params: { q: `${query} pinterest`, form: 'HDRSC2', first: 1, count: 10, qft: '' },
      headers: { 'User-Agent': ua },
      timeout: 10000
    })
    const matches = [...data.matchAll(/murl&quot;:&quot;(https?:\/\/[^&"]+?)&quot;/g)]
    return matches.slice(0, 8).map(m => m[1]).filter(Boolean)
  }
}
