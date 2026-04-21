import { isVip } from '../lib/economy.js'
import os from 'os'
import { readdirSync } from 'fs'

function clockString(ms) {
  let d = isNaN(ms) ? '--' : Math.floor(ms / 86400000)
  let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000) % 24
  let m2 = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
  let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
  return `${d}ي ${h}س ${m2}د ${s}ث`
}

function fmtBytes(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

let handler = async (m, { conn }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  const _uptime = process.uptime() * 1000
  const uptime = clockString(_uptime)
  const taguser = '@' + m.sender.split('@')[0]

  const totalUsers = Object.keys(global.db?.data?.users || {}).length
  const totalChats = Object.keys(global.db?.data?.chats || {}).length
  const premUsers = Object.values(global.db?.data?.users || {}).filter(u => u?.premium === true || (u?.premiumTime || 0) > Date.now()).length
  const blockedUsers = (global.db?.data?.settings?.[conn?.user?.jid]?.blockedList || []).length

  let pluginCount = 0
  try {
    pluginCount = readdirSync('./plugins').filter(f => f.endsWith('.js')).length
  } catch (_) {}

  const memUsage = process.memoryUsage()
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  const cpuLoad = os.loadavg()[0].toFixed(2)

  const stats = global.db?.data?.stats || {}
  const totalCmds = Object.values(stats).reduce((a, s) => a + (s.total || 0), 0)

  const str = `╭──────『 🤖 *SHADOW Bot* 』──────
│
│ 👋 مرحبًا ${taguser}
│
│ ─── حالة البوت ───
│ 🟢 الحالة: *نشط ✅*
│ ⏱️ وقت التشغيل: *${uptime}*
│ 📦 الإصدار: *Node ${process.version}*
│
│ ─── الأداء ───
│ 🧠 الذاكرة المستخدمة: *${fmtBytes(memUsage.rss)}*
│ 💾 ذاكرة النظام: *${fmtBytes(usedMem)} / ${fmtBytes(totalMem)}*
│ ⚙️ حمل المعالج: *${cpuLoad}*
│ 🖥️ النظام: *${os.platform()} ${os.arch()}*
│
│ ─── قاعدة البيانات ───
│ 👥 المستخدمون: *${totalUsers}*
│ 💬 المحادثات: *${totalChats}*
│ 👑 المميزون: *${premUsers}*
│ 🚫 المحظورون: *${blockedUsers}*
│ ⚡ أوامر منفذة: *${totalCmds}*
│
│ ─── البوت ───
│ 🔌 الإضافات: *${pluginCount} بلاغين*
│ 👑 المطور: *彡ℤ𝕖𝕣𝕖𝕗*
│ 📞 تواصل: wa.me/${global.nomorown}
│ 🔗 GitHub: ${global.md}
│
╰──────────────────────`.trim()

  await m.reply(str)
}

handler.help = ['الضعوم', 'دعم', 'وقت']
handler.tags = ['main']
handler.command = /^(الدعم|وقت|الضعوم|حالة_البوت2|botstatus2)$/i
export default handler
