import { isVip } from '../lib/economy.js'
import fs from 'fs'
import path from 'path'

let handler = async (m, { conn }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  // Owner check
  const isOwner = global.owner.some(entry => {
    const jid = Array.isArray(entry) ? entry[0] : entry
    return jid.split('@')[0] === m.sender.split('@')[0]
  })
  
  if (!isOwner) return m.reply('*『 الميزه دي للمطور بس!』*')

  const tmpDir = './tmp'
  if (!fs.existsSync(tmpDir)) {
    return m.reply('*❌ مجلد الملفات المؤقتة غير موجود!*')
  }

  const extensions = ['.mp3', '.opus', '.mp4', '.jpg', '.webp', '.bin', '.png']
  let deletedCount = 0
  let totalSize = 0

  const files = fs.readdirSync(tmpDir)
  for (const file of files) {
    const ext = path.extname(file).toLowerCase()
    if (extensions.includes(ext)) {
      const filePath = path.join(tmpDir, file)
      try {
        const stats = fs.statSync(filePath)
        totalSize += stats.size
        fs.unlinkSync(filePath)
        deletedCount++
      } catch (e) {
        console.error(`Failed to delete ${file}:`, e)
      }
    }
  }

  const sizeFreed = (totalSize / 1024 / 1024).toFixed(2)

  const response = `╭────『 🧹 تنظيف الملفات المؤقتة 』────
│
│ ✅ تم حذف: ${deletedCount} ملف
│ 💾 المساحة المحررة: ${sizeFreed} MB
│ 📁 المجلد: ./tmp
│
╰──────────────────`

  await m.reply(response)
}

handler.help = ['تنظيف', 'cleanup', 'حذف_مؤقت']
handler.tags = ['owner']
handler.command = /^(تنظيف|cleanup|حذف_مؤقت)$/i
handler.rowner = true

export default handler
