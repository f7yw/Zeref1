/**
 * أوامر إضافية للمالك/المطور:
 *   .بنق / .ping             ← قياس زمن استجابة البوت
 *   .احصائيات_شاملة          ← تقرير شامل (وقت تشغيل، ذاكرة، قروبات، مستخدمون، رسائل)
 *   .مغادرة_قروب [jid]       ← يغادر البوت قروباً محدداً (افتراضياً القروب الحالي)
 *   .قائمة_المحظورين_عام    ← كل المحظورين (bans + blocks مدموجة)
 *   .تنفيذ_جس [code]         ← تنفيذ JS مباشر (eval) — للمالك فقط
 */

import os from 'os'

let handler = async (m, { conn, command, text, isOwner }) => {
  const c = String(command || '').toLowerCase().trim()
  if (!isOwner) return m.reply('🚫 هذا الأمر للمطور فقط.')

  // ───── ping ─────
  if (/^(بنق|ping|سرعة_البوت|بنج)$/i.test(c)) {
    const start = Date.now()
    const sent = await conn.sendMessage(m.chat, { text: '🏓 جاري القياس...' }, { quoted: m })
    const latency = Date.now() - start
    const uptime = process.uptime()
    const h = Math.floor(uptime/3600), mi = Math.floor((uptime%3600)/60), se = Math.floor(uptime%60)
    return conn.sendMessage(m.chat, {
      text:
`🏓 *Pong!*

⚡ زمن الاستجابة: *${latency} مللي ثانية*
⏱️ وقت التشغيل: *${h}س ${mi}د ${se}ث*
🧠 الذاكرة: *${(process.memoryUsage().rss/1024/1024).toFixed(1)} MB*`,
      edit: sent.key
    })
  }

  // ───── احصائيات شاملة ─────
  if (/^(احصائيات_شاملة|إحصائيات_شاملة|تقرير_شامل|botreport|fullstats)$/i.test(c)) {
    const uptime = process.uptime()
    const h = Math.floor(uptime/3600), mi = Math.floor((uptime%3600)/60)
    const mem = process.memoryUsage()
    const users = Object.keys(global.db.data.users || {}).length
    const chats = Object.keys(global.db.data.chats || {}).length
    const groups = Object.values(global.db.data.chats || {}).filter(c => c?.isGroup !== false).length
    let liveGroups = 0
    try { liveGroups = Object.keys(await conn.groupFetchAllParticipating()).length } catch {}
    const plugins = Object.values(global.plugins || {}).filter(Boolean).length
    const prems = (global.prems || []).length
    return m.reply(
`╭━━━『 📊 *تقرير البوت الشامل* 』━━━╮

│ 🤖 *البوت:* ${global.botname || 'ZEREF'}
│ ⏱️ *وقت التشغيل:* ${h}س ${mi}د
│
│ ─── 💾 *الذاكرة* ───
│ • RSS:        ${(mem.rss/1024/1024).toFixed(1)} MB
│ • Heap Used:  ${(mem.heapUsed/1024/1024).toFixed(1)} MB
│ • Heap Total: ${(mem.heapTotal/1024/1024).toFixed(1)} MB
│
│ ─── 🖥️ *النظام* ───
│ • Node:    ${process.version}
│ • Platform: ${process.platform} (${process.arch})
│ • CPU:     ${os.cpus()[0]?.model || '—'}
│ • Cores:   ${os.cpus().length}
│ • Uptime:  ${(os.uptime()/3600).toFixed(1)} ساعة
│
│ ─── 📈 *قاعدة البيانات* ───
│ • مستخدمون: *${users}*
│ • محادثات:  *${chats}*
│ • قروبات (DB):   *${groups}*
│ • قروبات (مباشرة): *${liveGroups}*
│ • مميزون:   *${prems}*
│
│ ─── 🔌 *الملحقات* ───
│ • محمّلة: *${plugins}* plugin
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`)
  }

  // ───── مغادرة قروب ─────
  if (/^(مغادرة_قروب|leavegroup|leave_chat|اخرج_من_قروب)$/i.test(c)) {
    const jid = String(text || '').trim() || m.chat
    if (!jid.endsWith('@g.us')) return m.reply('❌ JID غير صالح. استخدم: `.مغادرة_قروب <jid>`')
    try {
      await m.reply(`👋 جارٍ مغادرة القروب: ${jid}`)
      await conn.groupLeave(jid)
    } catch (e) {
      m.reply(`❌ تعذّرت المغادرة: ${e?.message || e}`)
    }
    return
  }

  // ───── قائمة المحظورين عام ─────
  if (/^(قائمة_المحظورين_عام|كل_المحظورين|allbans|fullbans)$/i.test(c)) {
    const banned = Object.entries(global.db.data.users || {})
      .filter(([_, u]) => u?.banned === true).map(([j]) => j)
    let blocked = []
    try { blocked = await conn.fetchBlocklist() } catch {}
    return m.reply(
`🚫 *قائمة المحظورين الشاملة*

📋 *محظورون من البوت:* ${banned.length}
${banned.slice(0,30).map((j,i)=>`${i+1}. ${j.split('@')[0]}`).join('\n') || '— لا أحد —'}
${banned.length>30?`\n...و ${banned.length-30} آخر`:''}

🛑 *مبلوكون من واتساب:* ${blocked.length}
${blocked.slice(0,30).map((j,i)=>`${i+1}. ${String(j).split('@')[0]}`).join('\n') || '— لا أحد —'}
${blocked.length>30?`\n...و ${blocked.length-30} آخر`:''}`)
  }

  // ───── eval تم إزالته أمنياً (Level 2) ─────
  // كان يسمح بتنفيذ JS عشوائي على الخادم. أُزيل لمنع أي مخاطر RCE.
}

handler.help    = ['بنق','احصائيات_شاملة','مغادرة_قروب [jid]','قائمة_المحظورين_عام']
handler.tags    = ['owner']
handler.command = /^(بنق|بنج|ping|سرعة_البوت|احصائيات_شاملة|إحصائيات_شاملة|تقرير_شامل|botreport|fullstats|مغادرة_قروب|leavegroup|leave_chat|اخرج_من_قروب|قائمة_المحظورين_عام|كل_المحظورين|allbans|fullbans)$/i
handler.owner   = true

export default handler
