/**
 * لوحة التحكم الكاملة للمالك
 * أوامر الإضافة والتعديل والحذف من البوت مباشرة
 * للمطور: 967778088098 فقط
 */
import { logTransaction, initEconomy, isVip, MAX_ENERGY } from '../lib/economy.js'

const resolveJid = (m, text) => {
  let jid = m.mentionedJid?.[0] || m.quoted?.sender
  if (!jid && text) {
    const cleaned = text.replace(/[^0-9]/g, '')
    if (cleaned.length >= 7) jid = cleaned + '@s.whatsapp.net'
  }
  if (jid?.endsWith('@lid') && global.lidPhoneMap?.[jid]) {
    jid = global.lidPhoneMap[jid]
  }
  return jid
}

const getUser = (jid) => {
  if (!jid) return null
  global.db.data.users[jid] ||= {}
  initEconomy(global.db.data.users[jid])
  return global.db.data.users[jid]
}

const numStr = (n) => Number(n || 0).toLocaleString('en')

let handler = async (m, { conn, command, args, text, isROwner }) => {
  if (!isROwner) return m.reply('❌ هذا الأمر للمطور فقط.')

  const cmd = command.toLowerCase()

  // ─────────────────────────────────────────────
  // .عرض_مستخدم @منشن | رقم
  // ─────────────────────────────────────────────
  if (/^(عرض_مستخدم|userinfo|يوزر)$/.test(cmd)) {
    const jid = resolveJid(m, text)
    if (!jid) return m.reply('❌ حدد مستخدماً بالمنشن أو الرد أو رقم الهاتف.')
    const u = getUser(jid)
    const num = jid.split('@')[0]
    const vip = isVip(jid)
    return m.reply(
`╭────『 👤 بيانات المستخدم 』────
│ 📱 الرقم: +${num}
│ 📛 الاسم: ${u.name || '—'}
│ 💎 العضوية: ${vip ? '💎 مميز' : '❌ عادي'}
│ 🏆 المستوى: ${u.level || 0}
│ ⭐ الخبرة: ${u.exp || 0}
│ 💰 المحفظة: ${numStr(u.money)} 🪙
│ 🏦 البنك: ${numStr(u.bank)} 🪙
│ 💎 الماس: ${u.diamond || 0}
│ ⚡ الطاقة: ${u.energy ?? MAX_ENERGY}/${MAX_ENERGY}
│ 📊 الرسائل: ${u.messageCount || 0}
│ 🚫 محظور: ${u.banned ? 'نعم ⛔' : 'لا ✅'}
│ 📅 مميز حتى: ${u.premiumTime > Date.now() ? new Date(u.premiumTime).toLocaleDateString('ar') : '—'}
╰──────────────────`.trim()
    )
  }

  // ─────────────────────────────────────────────
  // .تعديل_مال @منشن 5000
  // ─────────────────────────────────────────────
  if (/^(تعديل_مال|setmoney)$/.test(cmd)) {
    const parts = text?.trim().split(/\s+/)
    const jid = resolveJid(m, parts?.[0])
    const amount = parseInt(parts?.find(p => /^-?\d+$/.test(p)))
    if (!jid || isNaN(amount)) return m.reply('❌ الاستخدام: .تعديل_مال @منشن 5000')
    const u = getUser(jid)
    const old = u.money || 0
    u.money = Math.max(0, amount)
    logTransaction(u, amount >= old ? 'earn' : 'spend', Math.abs(amount - old), '⚙️ تعديل يدوي من المطور')
    await global.db.write()
    return m.reply(`✅ تم تعديل محفظة *+${jid.split('@')[0]}*\nمن ${numStr(old)} → ${numStr(u.money)} 🪙`)
  }

  // ─────────────────────────────────────────────
  // .اضافة_مال @منشن 1000
  // ─────────────────────────────────────────────
  if (/^(اضافة_مال|addmoney)$/.test(cmd)) {
    const parts = text?.trim().split(/\s+/)
    const jid = resolveJid(m, parts?.[0])
    const amount = parseInt(parts?.find(p => /^-?\d+$/.test(p)))
    if (!jid || isNaN(amount) || amount <= 0) return m.reply('❌ الاستخدام: .اضافة_مال @منشن 1000')
    const u = getUser(jid)
    u.money = (u.money || 0) + amount
    logTransaction(u, 'earn', amount, '⚙️ منحة من المطور')
    await global.db.write()
    return m.reply(`✅ تم إضافة *${numStr(amount)}* 🪙 لـ *+${jid.split('@')[0]}*\nالرصيد الجديد: ${numStr(u.money)} 🪙`)
  }

  // ─────────────────────────────────────────────
  // .اضافة_بنك @منشن 1000
  // ─────────────────────────────────────────────
  if (/^(اضافة_بنك|addbank)$/.test(cmd)) {
    const parts = text?.trim().split(/\s+/)
    const jid = resolveJid(m, parts?.[0])
    const amount = parseInt(parts?.find(p => /^-?\d+$/.test(p)))
    if (!jid || isNaN(amount) || amount <= 0) return m.reply('❌ الاستخدام: .اضافة_بنك @منشن 1000')
    const u = getUser(jid)
    u.bank = (u.bank || 0) + amount
    logTransaction(u, 'earn', amount, '⚙️ إيداع بنكي من المطور')
    await global.db.write()
    return m.reply(`✅ تم إضافة *${numStr(amount)}* 🪙 لبنك *+${jid.split('@')[0]}*\nرصيد البنك: ${numStr(u.bank)} 🪙`)
  }

  // ─────────────────────────────────────────────
  // .اضافة_ماس @منشن 10
  // ─────────────────────────────────────────────
  if (/^(اضافة_ماس|adddiamond)$/.test(cmd)) {
    const parts = text?.trim().split(/\s+/)
    const jid = resolveJid(m, parts?.[0])
    const amount = parseInt(parts?.find(p => /^-?\d+$/.test(p)))
    if (!jid || isNaN(amount) || amount <= 0) return m.reply('❌ الاستخدام: .اضافة_ماس @منشن 10')
    const u = getUser(jid)
    u.diamond = (u.diamond || 0) + amount
    await global.db.write()
    return m.reply(`✅ تم إضافة *${amount}* 💎 لـ *+${jid.split('@')[0]}*\nإجمالي الماس: ${u.diamond} 💎`)
  }

  // ─────────────────────────────────────────────
  // .تعديل_مستوى @منشن 10
  // ─────────────────────────────────────────────
  if (/^(تعديل_مستوى|setlevel)$/.test(cmd)) {
    const parts = text?.trim().split(/\s+/)
    const jid = resolveJid(m, parts?.[0])
    const level = parseInt(parts?.find(p => /^\d+$/.test(p)))
    if (!jid || isNaN(level)) return m.reply('❌ الاستخدام: .تعديل_مستوى @منشن 10')
    const u = getUser(jid)
    u.level = Math.max(0, level)
    await global.db.write()
    return m.reply(`✅ تم تعديل مستوى *+${jid.split('@')[0]}* إلى *${u.level}* 🏆`)
  }

  // ─────────────────────────────────────────────
  // .اعادة_ضبط @منشن
  // ─────────────────────────────────────────────
  if (/^(اعادة_ضبط|resetuser)$/.test(cmd)) {
    const jid = resolveJid(m, text)
    if (!jid) return m.reply('❌ حدد مستخدماً.')
    const num = jid.split('@')[0]
    const wasPrem = global.db.data.users[jid]?.premium
    global.db.data.users[jid] = {}
    initEconomy(global.db.data.users[jid])
    await global.db.write()
    return m.reply(`✅ تمت إعادة ضبط بيانات *+${num}* بالكامل.${wasPrem ? '\n⚠️ ملاحظة: كان مميزاً.' : ''}`)
  }

  // ─────────────────────────────────────────────
  // .حذف_مستخدم @منشن
  // ─────────────────────────────────────────────
  if (/^(حذف_مستخدم|deleteuser)$/.test(cmd)) {
    const jid = resolveJid(m, text)
    if (!jid) return m.reply('❌ حدد مستخدماً.')
    const existed = !!global.db.data.users[jid]
    delete global.db.data.users[jid]
    await global.db.write()
    return m.reply(existed
      ? `✅ تم حذف بيانات *+${jid.split('@')[0]}* من قاعدة البيانات.`
      : `ℹ️ المستخدم *+${jid.split('@')[0]}* غير موجود في قاعدة البيانات.`
    )
  }

  // ─────────────────────────────────────────────
  // .حذف_بريم @منشن
  // ─────────────────────────────────────────────
  if (/^(حذف_بريم|removeprem)$/.test(cmd)) {
    const jid = resolveJid(m, text)
    if (!jid) return m.reply('❌ حدد مستخدماً.')
    const num = jid.split('@')[0]
    global.prems = (global.prems || []).filter(n => String(n).replace(/\D/g, '') !== num)
    const u = global.db.data.users[jid]
    if (u) {
      u.premium = false
      u.premiumTime = 0
      u.infiniteResources = false
    }
    await global.db.write()
    return m.reply(`✅ تم إلغاء اشتراك *+${num}* من VIP.`)
  }

  // ─────────────────────────────────────────────
  // .قائمة_المستخدمين
  // ─────────────────────────────────────────────
  if (/^(قائمة_المستخدمين|allusers)$/.test(cmd)) {
    const users = Object.entries(global.db.data.users || {})
    if (!users.length) return m.reply('ℹ️ لا يوجد مستخدمون في قاعدة البيانات.')
    const lines = users.slice(0, 30).map(([jid, u]) => {
      const num = jid.split('@')[0]
      const vip = u.premium || (u.premiumTime > Date.now()) ? '💎' : ''
      const banned = u.banned ? '⛔' : ''
      return `• +${num} ${vip}${banned} | لفل:${u.level || 0} | 🪙${numStr(u.money)}`
    })
    const total = users.length
    return m.reply(`╭────『 👥 المستخدمون (${total}) 』────\n│\n│ ${lines.join('\n│ ')}\n│\n╰──────────────────${total > 30 ? `\n\n⚠️ يُعرض أول 30 مستخدم من ${total}` : ''}`)
  }

  // ─────────────────────────────────────────────
  // .حالة_السحاب
  // ─────────────────────────────────────────────
  if (/^(حالة_السحاب|cloudstatus|سحاب)$/.test(cmd)) {
    const db = global.db
    const hasClient = !!db?.client
    const users = Object.keys(db?.data?.users || {}).length
    const chats = Object.keys(db?.data?.chats || {}).length
    const prems = Object.values(db?.data?.users || {}).filter(u => u?.premium || u?.premiumTime > Date.now()).length
    const mem = process.memoryUsage()
    const mbUsed = (mem.heapUsed / 1024 / 1024).toFixed(1)
    const mbTotal = (mem.heapTotal / 1024 / 1024).toFixed(1)
    const uptime = Math.floor(process.uptime())
    const h = Math.floor(uptime / 3600)
    const min = Math.floor((uptime % 3600) / 60)
    const sec = uptime % 60
    const supaUrl = process.env.SUPABASE_URL || ''
    const connected = supaUrl ? `✅ متصل (${supaUrl.split('.')[0].replace('https://', '')}.supabase)` : '⚠️ غير مكوّن'
    return m.reply(
`╭────『 ☁️ حالة السحاب 』────
│
│ 🗄️ Supabase: ${connected}
│ 🔄 آخر مزامنة: الآن
│
│ ─── البيانات ───
│ 👥 المستخدمون: ${users}
│ 💬 المحادثات: ${chats}
│ 👑 المميزون: ${prems}
│
│ ─── الأداء ───
│ 🧠 الذاكرة: ${mbUsed}/${mbTotal} MB
│ ⏱️ وقت التشغيل: ${h}س ${min}د ${sec}ث
│ 📦 Node: ${process.version}
│
│ ─── LID Map ───
│ 🗺️ مسجّل: ${Object.keys(global.lidPhoneMap || {}).length} رقم
╰──────────────────`.trim()
    )
  }

  // ─────────────────────────────────────────────
  // .مزامنة_السحاب — إجبار الحفظ الفوري
  // ─────────────────────────────────────────────
  if (/^(مزامنة_السحاب|synccloud|sync)$/.test(cmd)) {
    await m.reply('⏳ جاري المزامنة مع Supabase...')
    try {
      await global.db.write()
      return m.reply('✅ تمت المزامنة بنجاح إلى Supabase!')
    } catch (e) {
      return m.reply(`❌ فشل المزامنة: ${e.message}`)
    }
  }

  // ─────────────────────────────────────────────
  // .تعطيل_بوت / .تفعيل_بوت في المجموعة
  // ─────────────────────────────────────────────
  if (/^(تعطيل_بوت|botoff)$/.test(cmd)) {
    if (!m.isGroup) return m.reply('❌ هذا الأمر للمجموعات فقط.')
    global.db.data.chats[m.chat] ||= {}
    global.db.data.chats[m.chat].botOff = true
    await global.db.write()
    return m.reply('✅ تم تعطيل البوت في هذه المجموعة. فقط المطور يمكنه استخدام الأوامر.')
  }

  if (/^(تفعيل_بوت|boton)$/.test(cmd)) {
    if (!m.isGroup) return m.reply('❌ هذا الأمر للمجموعات فقط.')
    global.db.data.chats[m.chat] ||= {}
    global.db.data.chats[m.chat].botOff = false
    await global.db.write()
    return m.reply('✅ تم تفعيل البوت في هذه المجموعة.')
  }

  // ─────────────────────────────────────────────
  // .لوحة_التحكم — عرض كل أوامر الإدارة
  // ─────────────────────────────────────────────
  if (/^(لوحة_التحكم|panel|لوحة)$/.test(cmd)) {
    return m.reply(
`╭────『 ⚙️ لوحة التحكم 』────
│
│ ─── 👤 بيانات المستخدمين ───
│ .عرض_مستخدم @منشن
│   عرض كامل بيانات أي مستخدم
│
│ .قائمة_المستخدمين
│   قائمة بجميع المستخدمين
│
│ ─── 💰 تعديل الاقتصاد ───
│ .اضافة_مال @منشن 1000
│ .اضافة_بنك @منشن 1000
│ .اضافة_ماس @منشن 10
│ .تعديل_مال @منشن 5000  (تعيين مباشر)
│ .تعديل_مستوى @منشن 5
│
│ ─── 👑 إدارة العضوية ───
│ .addprem @منشن      (إضافة مميز)
│ .حذف_بريم @منشن    (إلغاء VIP)
│
│ ─── 🗑️ مسح البيانات ───
│ .اعادة_ضبط @منشن   (صفر بيانات مستخدم)
│ .حذف_مستخدم @منشن  (حذف كامل)
│ .مسح_المستخدمين تأكيد
│ .مسح_الكل تأكيد
│
│ ─── ☁️ إدارة السحاب ───
│ .حالة_السحاب       (Supabase + ذاكرة)
│ .مزامنة_السحاب     (حفظ فوري)
│ .قاعدة_البيانات    (إحصاء البيانات)
│
│ ─── 🤖 تحكم البوت ───
│ .تعطيل_بوت        (يوقف البوت في المجموعة)
│ .تفعيل_بوت        (يشغل البوت في المجموعة)
│ .إعادة            (إعادة تشغيل البوت)
│
╰──────────────────`.trim()
    )
  }
}

handler.help = ['لوحة_التحكم', 'عرض_مستخدم', 'اضافة_مال', 'اضافة_بنك', 'اضافة_ماس', 'تعديل_مستوى', 'حذف_بريم', 'حذف_مستخدم', 'مزامنة_السحاب', 'حالة_السحاب', 'قائمة_المستخدمين']
handler.tags = ['owner']
handler.command = /^(لوحة_التحكم|panel|لوحة|عرض_مستخدم|userinfo|يوزر|تعديل_مال|setmoney|اضافة_مال|addmoney|اضافة_بنك|addbank|اضافة_ماس|adddiamond|تعديل_مستوى|setlevel|اعادة_ضبط|resetuser|حذف_مستخدم|deleteuser|حذف_بريم|removeprem|قائمة_المستخدمين|allusers|حالة_السحاب|cloudstatus|سحاب|مزامنة_السحاب|synccloud|sync|تعطيل_بوت|botoff|تفعيل_بوت|boton)$/i
handler.rowner = true

export default handler
