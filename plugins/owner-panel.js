/**
 * لوحة التحكم الكاملة للمطور
 * إدارة المستخدمين / الاقتصاد / قاعدة البيانات
 */
import { logTransaction, initEconomy, isVip, MAX_ENERGY } from '../lib/economy.js'

const DAY  = 24 * 60 * 60 * 1000
const YEAR = 365 * DAY

function resolveJid(m, text) {
  let jid = m.mentionedJid?.[0] || m.quoted?.sender
  if (!jid && text) {
    const cleaned = text.replace(/[^0-9]/g, '')
    if (cleaned.length >= 7) jid = cleaned + '@s.whatsapp.net'
  }
  if (!jid) return null
  // ابحث عن المفتاح الفعلي للمستخدم في القاعدة (سواء @lid أو @s.whatsapp.net)
  const users = global.db?.data?.users || {}
  if (users[jid]) return jid
  // جرّب التبديل بين الصيغتين
  if (jid.endsWith('@lid')) {
    const phoneJid = global.lidPhoneMap?.[jid]
    if (phoneJid && users[phoneJid]) return phoneJid
    if (phoneJid) return phoneJid
  }
  if (jid.endsWith('@s.whatsapp.net') && global.lidPhoneMap) {
    const num = jid.split('@')[0]
    for (const [lid, phone] of Object.entries(global.lidPhoneMap)) {
      if (phone === jid && users[lid]) return lid
      if (phone?.split('@')[0] === num && users[lid]) return lid
    }
  }
  return jid
}

function getUser(jid) {
  if (!jid) return null
  global.db.data.users[jid] ||= {}
  initEconomy(global.db.data.users[jid])
  return global.db.data.users[jid]
}

function numStr(n) { return Number(n || 0).toLocaleString('en') }

function fmtDate(ts) {
  if (!ts || ts <= 0) return '—'
  if (ts - Date.now() >= YEAR * 5) return '♾️ دائم'
  return new Date(ts).toISOString().slice(0, 10)
}

function fmtRemaining(ts) {
  if (!ts || ts <= 0) return '—'
  const diff = ts - Date.now()
  if (diff <= 0) return '⚠️ منتهي'
  if (diff >= YEAR * 5) return '♾️'
  const d = Math.ceil(diff / DAY)
  if (d >= 365) return `${Math.floor(d/365)}س ${Math.floor((d%365)/30)}ش`
  if (d >= 30)  return `${Math.floor(d/30)} شهر`
  return `${d} يوم`
}

// ─────────────────────────────────────────────────────────────────────────────
let handler = async (m, { conn, command, args, text }) => {
  const cmd = command.toLowerCase().trim()

  // ── عرض مستخدم ────────────────────────────────────────────────────────────
  if (/^(عرض_مستخدم|userinfo|يوزر)$/.test(cmd)) {
    const jid = resolveJid(m, text)
    if (!jid) return m.reply('❌ حدد مستخدماً: .عرض_مستخدم @منشن')
    const u   = getUser(jid)
    const num = jid.split('@')[0]
    const vip = isVip(jid)
    return m.reply(
`╭────『 👤 بيانات المستخدم 』────
│ 📱 الرقم: +${num}
│ 📛 الاسم: ${u.name || '—'}
│ 👑 العضوية: ${vip ? '💎 مميز' : '❌ عادي'}
│ 🏆 المستوى: ${u.level || 0}
│ ⭐ الخبرة: ${numStr(u.exp)}
│ 💰 المحفظة: ${numStr(u.money)} 🪙
│ 🏦 البنك: ${numStr(u.bank)} 🪙
│ 💎 الماس: ${u.diamond || 0}
│ ⚡ الطاقة: ${u.energy ?? MAX_ENERGY}/${MAX_ENERGY}
│ 📊 الرسائل: ${u.messageCount || 0}
│ 🚫 محظور: ${u.banned ? 'نعم ⛔' : 'لا ✅'}
│ 📅 VIP حتى: ${fmtDate(u.premiumTime)}
│ ⏳ المتبقي: ${fmtRemaining(u.premiumTime)}
╰──────────────────`.trim()
    )
  }

  // ── قائمة المستخدمين ──────────────────────────────────────────────────────
  if (/^(قائمة_المستخدمين|allusers)$/.test(cmd)) {
    const users = Object.entries(global.db.data.users || {})
    if (!users.length) return m.reply('ℹ️ لا يوجد مستخدمون في قاعدة البيانات.')
    const now = Date.now()
    const lines = users.slice(0, 40).map(([jid, u]) => {
      const num    = jid.split('@')[0]
      const vip    = u.premium || (u.premiumTime > now) ? ' 💎' : ''
      const banned = u.banned ? ' ⛔' : ''
      return `• +${num}${vip}${banned} | لفل:${u.level || 0} 🪙${numStr(u.money)}`
    })
    return m.reply(
      `╭────『 👥 المستخدمون (${users.length}) 』────\n│\n│ ${lines.join('\n│ ')}\n│\n╰──────────────────` +
      (users.length > 40 ? `\n\n⚠️ يُعرض أول 40 من ${users.length}` : '')
    )
  }

  // ── إضافة مال ─────────────────────────────────────────────────────────────
  if (/^(اضافة_مال|addmoney)$/.test(cmd)) {
    const parts = (text || '').trim().split(/\s+/)
    const jid   = resolveJid(m, parts[0]) || resolveJid(m, text)
    const amount = parseInt(parts.find(p => /^\d+$/.test(p)))
    if (!jid || isNaN(amount) || amount <= 0) return m.reply('❌ الاستخدام:\n.اضافة_مال @منشن 1000')
    const u = getUser(jid)
    u.money = (u.money || 0) + amount
    logTransaction(u, 'earn', amount, '⚙️ منحة من المطور')
    await global.db.write()
    return conn.sendMessage(m.chat,
      { text: `✅ تمت إضافة *${numStr(amount)}* 🪙 لـ @${jid.split('@')[0]}\n💰 الرصيد: ${numStr(u.money)} 🪙`, mentions: [jid] },
      { quoted: m })
  }

  // ── تعديل مال (تعيين مباشر) ──────────────────────────────────────────────
  if (/^(تعديل_مال|setmoney)$/.test(cmd)) {
    const parts = (text || '').trim().split(/\s+/)
    const jid   = resolveJid(m, parts[0]) || resolveJid(m, text)
    const amount = parseInt(parts.find(p => /^-?\d+$/.test(p)))
    if (!jid || isNaN(amount)) return m.reply('❌ الاستخدام:\n.تعديل_مال @منشن 5000')
    const u   = getUser(jid)
    const old = u.money || 0
    u.money   = Math.max(0, amount)
    logTransaction(u, amount >= old ? 'earn' : 'spend', Math.abs(amount - old), '⚙️ تعديل يدوي')
    await global.db.write()
    return conn.sendMessage(m.chat,
      { text: `✅ تعديل محفظة @${jid.split('@')[0]}\n${numStr(old)} ← ${numStr(u.money)} 🪙`, mentions: [jid] },
      { quoted: m })
  }

  // ── إضافة بنك ─────────────────────────────────────────────────────────────
  if (/^(اضافة_بنك|addbank)$/.test(cmd)) {
    const parts = (text || '').trim().split(/\s+/)
    const jid   = resolveJid(m, parts[0]) || resolveJid(m, text)
    const amount = parseInt(parts.find(p => /^\d+$/.test(p)))
    if (!jid || isNaN(amount) || amount <= 0) return m.reply('❌ الاستخدام:\n.اضافة_بنك @منشن 1000')
    const u = getUser(jid)
    u.bank = (u.bank || 0) + amount
    logTransaction(u, 'earn', amount, '⚙️ إيداع بنكي')
    await global.db.write()
    return conn.sendMessage(m.chat,
      { text: `✅ إضافة *${numStr(amount)}* 🪙 لبنك @${jid.split('@')[0]}\n🏦 البنك: ${numStr(u.bank)} 🪙`, mentions: [jid] },
      { quoted: m })
  }

  // ── إضافة ماس ─────────────────────────────────────────────────────────────
  if (/^(اضافة_ماس|adddiamond)$/.test(cmd)) {
    const parts = (text || '').trim().split(/\s+/)
    const jid   = resolveJid(m, parts[0]) || resolveJid(m, text)
    const amount = parseInt(parts.find(p => /^\d+$/.test(p)))
    if (!jid || isNaN(amount) || amount <= 0) return m.reply('❌ الاستخدام:\n.اضافة_ماس @منشن 10')
    const u = getUser(jid)
    u.diamond = (u.diamond || 0) + amount
    await global.db.write()
    return conn.sendMessage(m.chat,
      { text: `✅ إضافة *${amount}* 💎 لـ @${jid.split('@')[0]}\n💎 إجمالي: ${u.diamond}`, mentions: [jid] },
      { quoted: m })
  }

  // ── تعديل مستوى ──────────────────────────────────────────────────────────
  if (/^(تعديل_مستوى|setlevel)$/.test(cmd)) {
    const parts = (text || '').trim().split(/\s+/)
    const jid   = resolveJid(m, parts[0]) || resolveJid(m, text)
    const level = parseInt(parts.find(p => /^\d+$/.test(p)))
    if (!jid || isNaN(level)) return m.reply('❌ الاستخدام:\n.تعديل_مستوى @منشن 10')
    const u = getUser(jid)
    u.level = Math.max(0, level)
    await global.db.write()
    return conn.sendMessage(m.chat,
      { text: `✅ مستوى @${jid.split('@')[0]} → *${u.level}* 🏆`, mentions: [jid] },
      { quoted: m })
  }

  // ── إعادة ضبط مستخدم ─────────────────────────────────────────────────────
  if (/^(اعادة_ضبط|resetuser)$/.test(cmd)) {
    const jid = resolveJid(m, text)
    if (!jid) return m.reply('❌ حدد مستخدماً:\n.اعادة_ضبط @منشن')
    const num      = jid.split('@')[0]
    const wasPrem  = global.db.data.users[jid]?.premium
    const wasLevel = global.db.data.users[jid]?.level || 0
    global.db.data.users[jid] = {}
    initEconomy(global.db.data.users[jid])
    // أزل من قائمة prems
    global.prems = (global.prems || []).filter(n => n.replace(/\D/g,'') !== num)
    await global.db.write()
    return m.reply(
      `✅ تمت إعادة ضبط *+${num}*\n` +
      `📊 المستوى كان: ${wasLevel}` +
      (wasPrem ? '\n⚠️ تحذير: كان مميزاً — تم إزالة VIP أيضاً.' : '')
    )
  }

  // ── حذف مستخدم نهائياً ───────────────────────────────────────────────────
  if (/^(حذف_مستخدم|deleteuser)$/.test(cmd)) {
    const jid = resolveJid(m, text)
    if (!jid) return m.reply('❌ حدد مستخدماً:\n.حذف_مستخدم @منشن')
    const existed = !!global.db.data.users[jid]
    delete global.db.data.users[jid]
    global.prems = (global.prems || []).filter(n => n.replace(/\D/g,'') !== jid.split('@')[0])
    await global.db.write()
    return m.reply(existed
      ? `✅ تم حذف *+${jid.split('@')[0]}* من قاعدة البيانات نهائياً.`
      : `ℹ️ المستخدم *+${jid.split('@')[0]}* غير موجود أصلاً.`
    )
  }

  // ── مسح كل المستخدمين ────────────────────────────────────────────────────
  if (/^(مسح_المستخدمين|clearusers)$/.test(cmd)) {
    const confirm = (text || '').trim()
    if (confirm !== 'تأكيد') {
      return m.reply(
`⚠️ *تحذير: سيتم حذف بيانات جميع المستخدمين!*

لتأكيد الحذف:
.مسح_المستخدمين تأكيد`)
    }
    const count = Object.keys(global.db.data.users || {}).length
    global.db.data.users = {}
    global.prems = []
    await global.db.write()
    return m.reply(`✅ تم مسح *${count}* مستخدم من قاعدة البيانات.`)
  }

  // ── حالة السحاب ──────────────────────────────────────────────────────────
  if (/^(حالة_السحاب|cloudstatus|سحاب)$/.test(cmd)) {
    const users  = Object.keys(global.db.data.users  || {}).length
    const chats  = Object.keys(global.db.data.chats  || {}).length
    const prems  = Object.values(global.db.data.users || {}).filter(u => u?.premiumTime > Date.now()).length
    const banned = Object.values(global.db.data.users || {}).filter(u => u?.banned).length
    const mem    = process.memoryUsage()
    const mbUsed = (mem.heapUsed  / 1024 / 1024).toFixed(1)
    const mbRss  = (mem.rss       / 1024 / 1024).toFixed(1)
    const uptime = Math.floor(process.uptime())
    const h   = Math.floor(uptime / 3600)
    const min = Math.floor((uptime % 3600) / 60)
    const sec = uptime % 60
    const supaUrl = (process.env.SUPABASE_URL || '').replace('https://', '').split('.')[0]
    const supaConn = supaUrl ? `✅ ${supaUrl}.supabase` : '⚠️ غير مكوّن'
    return m.reply(
`╭────『 ☁️ حالة السحاب 』────
│
│ 🗄️ Supabase: ${supaConn}
│ 🗺️ LID Map: ${Object.keys(global.lidPhoneMap || {}).length} رقم
│
│ ─── البيانات ───
│ 👥 المستخدمون: ${users}
│ 💬 المحادثات: ${chats}
│ 👑 المميزون: ${prems}
│ 🚫 المحظورون: ${banned}
│
│ ─── الذاكرة ───
│ 🧠 RSS: ${mbRss} MB
│ 📦 Heap: ${mbUsed} MB
│ ⏱️ التشغيل: ${h}س ${min}د ${sec}ث
│ 📌 Node: ${process.version}
╰──────────────────`.trim()
    )
  }

  // ── مزامنة السحاب ─────────────────────────────────────────────────────────
  if (/^(مزامنة_السحاب|synccloud|sync)$/.test(cmd)) {
    await m.reply('⏳ جاري الحفظ إلى Supabase...')
    try {
      await global.db.write()
      return m.reply('✅ تمت المزامنة بنجاح!')
    } catch (e) {
      return m.reply(`❌ فشل: ${e.message}`)
    }
  }

  // ── قاعدة البيانات (إحصائيات) ────────────────────────────────────────────
  if (/^(قاعدة_البيانات|dbstats|احصاء)$/.test(cmd)) {
    const users  = Object.values(global.db.data.users  || {})
    const chats  = Object.values(global.db.data.chats  || {})
    const now    = Date.now()
    const active = users.filter(u => u?.lastSeen > now - 7 * DAY).length
    const totalMoney = users.reduce((a, u) => a + (u.money || 0), 0)
    const totalBank  = users.reduce((a, u) => a + (u.bank  || 0), 0)
    const groups = Object.keys(global.db.data.chats || {}).filter(j => j.endsWith('@g.us')).length
    const botSettings = global.db.data.botSettings || {}
    return m.reply(
`╭────『 📊 قاعدة البيانات 』────
│
│ ─── المستخدمون ───
│ 👥 الكلي: ${users.length}
│ 🟢 نشطون (7 أيام): ${active}
│ 👑 مميزون: ${users.filter(u => u?.premiumTime > now).length}
│ 🚫 محظورون: ${users.filter(u => u?.banned).length}
│
│ ─── الاقتصاد ───
│ 💰 إجمالي المحافظ: ${numStr(totalMoney)} 🪙
│ 🏦 إجمالي البنوك: ${numStr(totalBank)} 🪙
│
│ ─── المحادثات ───
│ 💬 الكلي: ${chats.length}
│ 📱 القروبات: ${groups}
│ ⛔ مُعطَّل فيها: ${chats.filter(c => c?.botOff).length}
│
│ ─── إعدادات البوت ───
│ 📵 رفض المكالمات: ${botSettings.rejectCalls ? '✅' : '❌'}
│ 🟢 حضور دائم: ${botSettings.alwaysOnline ? '✅' : '❌'}
╰──────────────────`.trim()
    )
  }

  // ── تعطيل/تفعيل البوت في المجموعة ───────────────────────────────────────
  if (/^(تعطيل_بوت|botoff)$/.test(cmd)) {
    if (!m.isGroup) return m.reply('❌ هذا الأمر للمجموعات فقط.')
    global.db.data.chats[m.chat] ||= {}
    global.db.data.chats[m.chat].botOff = true
    await global.db.write()
    return m.reply('⛔ تم تعطيل البوت في هذه المجموعة.\nالمطور فقط يمكنه الأوامر.')
  }

  if (/^(تفعيل_بوت|boton)$/.test(cmd)) {
    if (!m.isGroup) return m.reply('❌ هذا الأمر للمجموعات فقط.')
    global.db.data.chats[m.chat] ||= {}
    global.db.data.chats[m.chat].botOff = false
    await global.db.write()
    return m.reply('✅ تم تفعيل البوت في هذه المجموعة.')
  }

  // ── لوحة التحكم الرئيسية ─────────────────────────────────────────────────
  if (/^(لوحة_التحكم|panel|لوحة)$/.test(cmd)) {
    return m.reply(
`╭────『 ⚙️ لوحة تحكم المطور 』────
│
│ ─── 👤 المستخدمون ───
│ .عرض_مستخدم @منشن
│   ← كامل بيانات المستخدم
│ .قائمة_المستخدمين
│   ← قائمة بكل المستخدمين
│ .اعادة_ضبط @منشن
│   ← تصفير بيانات مستخدم
│ .حذف_مستخدم @منشن
│   ← حذف نهائي من DB
│ .مسح_المستخدمين تأكيد
│   ← ⚠️ حذف الكل
│
│ ─── 💰 الاقتصاد ───
│ .اضافة_مال @منشن 1000
│ .تعديل_مال @منشن 5000
│ .اضافة_بنك @منشن 1000
│ .اضافة_ماس @منشن 10
│ .تعديل_مستوى @منشن 5
│
│ ─── ☁️ قاعدة البيانات ───
│ .حالة_السحاب
│ .مزامنة_السحاب
│ .قاعدة_البيانات
│
│ ─── 🤖 تحكم البوت ───
│ .تعطيل_بوت / .تفعيل_بوت
│ .تحكم_البوت  ← لوحة bot-control
│ .إعادة_تشغيل
│
╰──────────────────`.trim()
    )
  }
}

handler.help = [
  'لوحة_التحكم', 'عرض_مستخدم', 'قائمة_المستخدمين',
  'اضافة_مال', 'اضافة_بنك', 'اضافة_ماس', 'تعديل_مال', 'تعديل_مستوى',
  'اعادة_ضبط', 'حذف_مستخدم', 'مسح_المستخدمين',
  'حالة_السحاب', 'مزامنة_السحاب', 'قاعدة_البيانات',
  'تعطيل_بوت', 'تفعيل_بوت'
]
handler.tags   = ['owner']
handler.rowner = true
handler.command = /^(لوحة_التحكم|panel|لوحة|عرض_مستخدم|userinfo|يوزر|تعديل_مال|setmoney|اضافة_مال|addmoney|اضافة_بنك|addbank|اضافة_ماس|adddiamond|تعديل_مستوى|setlevel|اعادة_ضبط|resetuser|حذف_مستخدم|deleteuser|مسح_المستخدمين|clearusers|قائمة_المستخدمين|allusers|حالة_السحاب|cloudstatus|سحاب|مزامنة_السحاب|synccloud|sync|قاعدة_البيانات|dbstats|احصاء|تعطيل_بوت|botoff|تفعيل_بوت|boton)$/i

export default handler
