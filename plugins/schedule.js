/**
 * 📅 جدول المحاضرات والاختبارات
 * ────────────────────────────────────────────────────────────
 *  يخزّن المحاضرات/الاختبارات في DB ويرسل تذكيراً قبلها بفترة محددة
 *  (افتراضياً 15 دقيقة). يدعم:
 *    • تذكير في القروب الذي أُضيفت فيه + إعادة بثّ في قروبات أخرى.
 *    • نص رسالة تذكير قابل للتخصيص بالكامل لكل عنصر.
 *    • تكرار يومي/أسبوعي/مرّة واحدة.
 *    • صنفان: محاضرة (lecture) أو اختبار (exam).
 *
 *  ─── الأوامر ─────────────────────────────────────────────────
 *   .محاضرة اضافة <اسم>|<HH:MM>|<أيام>|<مدة الإنذار بالدقائق>|<النص>
 *      أمثلة الأيام:
 *         يومي   = كل يوم
 *         سبت,اثنين,اربعاء  (مفصول بفواصل)
 *         2026-04-25  (تاريخ مرّة واحدة)
 *      مثال:
 *      .محاضرة اضافة الفقه|08:00|سبت,اثنين|15|📚 محاضرة الفقه بعد ربع ساعة!
 *
 *   .اختبار اضافة <اسم>|<HH:MM>|<YYYY-MM-DD>|<مدة الإنذار>|<النص>
 *      .اختبار اضافة نهائي رياضيات|10:00|2026-05-12|60|⚠️ اختبار الرياضيات بعد ساعة
 *
 *   .جدولي                ← عرض جدولي في القروب الحالي
 *   .جدول_كامل            ← (مطور) كل العناصر في كل القروبات
 *   .حذف_محاضرة <رقم>     ← حذف عنصر بالرقم من جدولك
 *   .بث_للقروبات <رقم> <جلب رابط1,رابط2 / ids>
 *      يربط محاضرة/اختبار ببثٍّ تلقائي إلى قروبات أخرى
 *      (الأرقام = أرقام JID للقروب أو أسماء قروبات معروفة).
 *   .قروباتي               ← يعرض JIDs لكل القروبات التي البوت فيها
 *   .تشغيل_جدول | .ايقاف_جدول
 *
 *  ملاحظة: كل عنصر يُجدوَل عبر node-schedule مع id فريد ويُعاد جدولته
 *  تلقائياً بعد إعادة تشغيل البوت.
 */

import schedule from 'node-schedule'
import { DateTime } from 'luxon'

const TZ = 'Asia/Riyadh'
const DAYS_AR = {
  'احد': 0, 'الأحد': 0, 'اﻷحد': 0,
  'اثنين': 1, 'الاثنين': 1,
  'ثلاثاء': 2, 'الثلاثاء': 2,
  'اربعاء': 3, 'الأربعاء': 3, 'اربع': 3,
  'خميس': 4, 'الخميس': 4,
  'جمعة': 5, 'الجمعة': 5, 'جمعه': 5,
  'سبت': 6, 'السبت': 6,
}

function db() {
  global.db.data.schedule ??= { items: [], enabled: true, nextId: 1 }
  return global.db.data.schedule
}

function fmtItem(it, idx) {
  const kind = it.kind === 'exam' ? '📝 اختبار' : '📚 محاضرة'
  const days = it.daysOfWeek?.length ? `أيام: ${it.daysOfWeek.map(d => Object.keys(DAYS_AR).find(k => DAYS_AR[k] === d) || d).join(',')}`
              : it.date ? `تاريخ: ${it.date}` : 'يومي'
  const lead = `إنذار قبل: ${it.leadMinutes}د`
  const broadcast = it.broadcastTo?.length ? ` 📡 يُبثّ لـ ${it.broadcastTo.length} قروب` : ''
  return `*${idx}.* ${kind}  ⏰ ${it.time}\n   • ${it.name}\n   • ${days} · ${lead}${broadcast}`
}

function parseDays(spec) {
  spec = (spec || '').trim()
  if (!spec || spec === 'يومي' || /^daily$/i.test(spec)) return { daysOfWeek: [0, 1, 2, 3, 4, 5, 6], date: null }
  if (/^\d{4}-\d{2}-\d{2}$/.test(spec)) return { daysOfWeek: null, date: spec }
  const tokens = spec.split(/[,،\s]+/).filter(Boolean)
  const days = []
  for (const t of tokens) {
    const k = t.trim()
    if (DAYS_AR[k] !== undefined) days.push(DAYS_AR[k])
    else if (/^\d$/.test(k)) days.push(Number(k))
  }
  return days.length ? { daysOfWeek: days, date: null } : null
}

// ── Scheduler ─────────────────────────────────────────────────────────────
const JOBS = new Map() // id → schedule.Job

function cancelJob(id) {
  const j = JOBS.get(id)
  if (j) { try { j.cancel() } catch {} ; JOBS.delete(id) }
}

function scheduleItem(item) {
  cancelJob(item.id)
  if (!db().enabled) return
  const [hh, mm] = String(item.time).split(':').map(Number)
  if (Number.isNaN(hh) || Number.isNaN(mm)) return

  // وقت الإنذار = وقت العنصر - leadMinutes
  let alertHour = hh, alertMin = mm - (item.leadMinutes || 15)
  while (alertMin < 0) { alertMin += 60; alertHour -= 1 }
  while (alertHour < 0) { alertHour += 24 }

  let when
  if (item.date) {
    // مرّة واحدة في تاريخ محدّد
    const dt = DateTime.fromISO(`${item.date}T${String(alertHour).padStart(2,'0')}:${String(alertMin).padStart(2,'0')}:00`, { zone: TZ })
    if (!dt.isValid || dt.toMillis() < Date.now()) return
    when = dt.toJSDate()
  } else {
    const rule = new schedule.RecurrenceRule()
    rule.tz = TZ
    rule.hour = alertHour
    rule.minute = alertMin
    if (item.daysOfWeek?.length) rule.dayOfWeek = item.daysOfWeek
    when = rule
  }

  const job = schedule.scheduleJob(item.id, when, async () => {
    await dispatchItem(item)
    if (item.date) cancelJob(item.id)
  })
  if (job) JOBS.set(item.id, job)
}

async function dispatchItem(item) {
  const conn = global.conn
  if (!conn) return
  const targets = new Set([item.chat, ...(item.broadcastTo || [])])
  const tag = item.kind === 'exam' ? '📝 *تذكير اختبار*' : '📚 *تذكير محاضرة*'
  const body = item.message || `${tag}\n\n*${item.name}*\n⏰ يبدأ الساعة ${item.time}`
  for (const jid of targets) {
    try { await conn.sendMessage(jid, { text: `${tag}\n\n${body}` }) } catch {}
  }
}

export function loadAndScheduleAll(conn) {
  const d = db()
  for (const item of d.items) scheduleItem(item)
  console.log(`[SCHEDULE] جُدوِل ${JOBS.size} عنصر / من أصل ${d.items.length}`)
}

// ── Handler ───────────────────────────────────────────────────────────────
let handler = async (m, { conn, args, text, command, isAdmin, isOwner }) => {
  const cmd = command.toLowerCase()
  const d = db()

  // ── تشغيل/إيقاف عام ────────────────────────────────────────────────────
  if (/^(تشغيل_جدول|ايقاف_جدول|إيقاف_جدول)$/i.test(cmd)) {
    if (!isOwner) throw '❌ للمطور فقط.'
    d.enabled = !/ايقاف|إيقاف/.test(cmd)
    if (d.enabled) for (const it of d.items) scheduleItem(it)
    else for (const id of [...JOBS.keys()]) cancelJob(id)
    global.db.markDirty?.()
    return m.reply(`✅ الجدول الآن: ${d.enabled ? 'مفعَّل' : 'متوقف'}`)
  }

  // ── قروباتي (للمطور: قائمة JIDs) ────────────────────────────────────────
  if (/^قروباتي$/i.test(cmd)) {
    if (!isOwner) throw '❌ للمطور فقط.'
    const chats = await conn.groupFetchAllParticipating().catch(() => ({}))
    const lines = Object.values(chats).map(g => `• *${g.subject}*\n  \`${g.id}\``)
    return m.reply(`📋 *قروباتي* (${lines.length})\n\n${lines.join('\n') || '— لا قروبات —'}`)
  }

  // ── جدول كامل (للمطور) ──────────────────────────────────────────────────
  if (/^جدول_كامل$/i.test(cmd)) {
    if (!isOwner) throw '❌ للمطور فقط.'
    if (!d.items.length) return m.reply('— الجدول فارغ —')
    const lines = d.items.map((it, i) => `${fmtItem(it, i + 1)}\n   📍 ${it.chat}`)
    return m.reply(`📅 *الجدول الكامل* (${d.items.length})\n\n${lines.join('\n\n')}`)
  }

  // ── جدولي (في هذا القروب/الخاص) ────────────────────────────────────────
  if (/^جدولي$/i.test(cmd)) {
    const my = d.items.filter(it => it.chat === m.chat)
    if (!my.length) return m.reply(
`📅 لا توجد محاضرات/اختبارات مضافة في هذه المحادثة بعد.

أضف عبر:
${m.isGroup ? '' : '(يفضّل من داخل القروب)\n'}.محاضرة اضافة الفقه|08:00|سبت,اثنين|15|📚 محاضرة الفقه بعد ربع ساعة`)
    const lines = my.map((it, i) => fmtItem(it, i + 1))
    return m.reply(`📅 *جدول هذه المحادثة* (${my.length})\n\n${lines.join('\n\n')}\n\n💡 لحذف: .حذف_محاضرة <رقم>`)
  }

  // ── إضافة محاضرة/اختبار ───────────────────────────────────────────────
  if (/^(محاضرة|اختبار|lecture|exam)$/i.test(cmd)) {
    if (m.isGroup && !isAdmin && !isOwner) throw '❌ المشرف فقط في القروب.'
    const sub = (args[0] || '').toLowerCase()

    if (/^(اضافة|إضافة|add)$/.test(sub)) {
      const rest = args.slice(1).join(' ')
      const parts = rest.split('|').map(s => s.trim())
      if (parts.length < 4) throw `❌ الصيغة:\n.${cmd} اضافة <اسم>|<HH:MM>|<أيام أو تاريخ>|<مدة الإنذار بالدقائق>|<نص اختياري>\n\nمثال:\n.${cmd} اضافة ${cmd === 'اختبار' ? 'نهائي' : 'الفقه'}|08:00|${cmd === 'اختبار' ? '2026-05-12' : 'سبت,اثنين'}|15|نصّك المخصّص هنا`
      const [name, time, daySpec, leadStr, ...msgParts] = parts
      if (!/^\d{1,2}:\d{2}$/.test(time)) throw '❌ صيغة الوقت يجب أن تكون HH:MM (مثل 08:00).'
      const dayInfo = parseDays(daySpec)
      if (!dayInfo) throw '❌ الأيام غير صالحة. استخدم: يومي  أو  سبت,اثنين  أو  2026-05-12'
      const lead = parseInt(leadStr, 10)
      if (Number.isNaN(lead) || lead < 0 || lead > 1440) throw '❌ مدة الإنذار يجب أن تكون رقماً بين 0 و 1440 دقيقة.'
      const message = msgParts.join('|').trim() || null

      const item = {
        id: `sched-${d.nextId++}`,
        kind: cmd === 'اختبار' ? 'exam' : 'lecture',
        name,
        time,
        daysOfWeek: dayInfo.daysOfWeek,
        date: dayInfo.date,
        leadMinutes: lead,
        message,
        chat: m.chat,
        createdBy: m.sender,
        createdAt: Date.now(),
        broadcastTo: []
      }
      d.items.push(item)
      global.db.markDirty?.()
      scheduleItem(item)
      return m.reply(
`✅ *تمت الإضافة*

${fmtItem(item, d.items.length)}

🆔 المعرّف: \`${item.id}\`
💡 لربطها ببثّ لقروبات أخرى:
.بث_للقروبات ${d.items.length} <jid1>,<jid2>`)
    }

    return m.reply(
`📅 *${cmd === 'اختبار' ? 'الاختبارات' : 'المحاضرات'}*

• .${cmd} اضافة <اسم>|<HH:MM>|<${cmd === 'اختبار' ? 'YYYY-MM-DD' : 'يومي/أيام'}>|<إنذار بالدقائق>|<نص>
• .جدولي
• .حذف_محاضرة <رقم>
• .بث_للقروبات <رقم> <jid1,jid2,..>`)
  }

  // ── حذف ─────────────────────────────────────────────────────────────────
  if (/^(حذف_محاضرة|حذف_اختبار|delsched)$/i.test(cmd)) {
    const idx = parseInt(args[0], 10) - 1
    const my = d.items.filter(it => it.chat === m.chat)
    if (Number.isNaN(idx) || idx < 0 || idx >= my.length) throw '❌ رقم غير صالح. استخدم .جدولي لمعرفة الأرقام.'
    const item = my[idx]
    cancelJob(item.id)
    d.items = d.items.filter(it => it.id !== item.id)
    global.db.markDirty?.()
    return m.reply(`🗑️ تم الحذف: *${item.name}* (${item.time})`)
  }

  // ── ربط بث لقروبات أخرى ─────────────────────────────────────────────────
  if (/^(بث_للقروبات|broadcast_to)$/i.test(cmd)) {
    if (!isOwner && !isAdmin) throw '❌ المشرف/المطور فقط.'
    const idx = parseInt(args[0], 10) - 1
    const my = d.items.filter(it => it.chat === m.chat)
    if (Number.isNaN(idx) || idx < 0 || idx >= my.length) throw '❌ رقم غير صالح.'
    const targetsRaw = args.slice(1).join(' ')
    const list = (targetsRaw.match(/\d{10,}@g\.us/g) || []).filter(Boolean)
    if (!list.length) throw '❌ أعطني قائمة JIDs مفصولة بفواصل (مثال: 1203@g.us,1204@g.us).\nاستخدم .قروباتي لمعرفة الـ JIDs.'
    const item = my[idx]
    item.broadcastTo = [...new Set([...(item.broadcastTo || []), ...list])]
    global.db.markDirty?.()
    return m.reply(`✅ *${item.name}* سيُبثّ الآن إلى ${item.broadcastTo.length} قروب إضافي.`)
  }
}

handler.command = /^(محاضرة|اختبار|lecture|exam|جدولي|جدول_كامل|حذف_محاضرة|حذف_اختبار|delsched|broadcast_to|قروباتي|تشغيل_جدول|ايقاف_جدول|إيقاف_جدول)$/i
handler.help = ['محاضرة اضافة', 'اختبار اضافة', 'جدولي', 'حذف_محاضرة', 'بث_للقروبات', 'قروباتي']
handler.tags = ['group']

export default handler
