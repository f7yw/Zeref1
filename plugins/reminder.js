import { isVip } from '../lib/economy.js'
import fs from 'fs'
import path from 'path'
import schedule from 'node-schedule'
import { DateTime } from 'luxon'

const remindersFile = path.resolve('./reminders.json')
if (!fs.existsSync(remindersFile)) fs.writeFileSync(remindersFile, '[]')

const TIMEZONE = 'Asia/Riyadh'
const SESSION_TIMEOUT = 5 * 60 * 1000 // 5 دقائق
const REPEAT_OPTIONS  = ['مرة', 'يومي', 'اسبوعي', 'شهري']

// ─────────────────────────────────────────────────────────────────────────────
// جدولة وتحميل
// ─────────────────────────────────────────────────────────────────────────────
function scheduleReminder(reminder, conn) {
  const [hour, minute] = reminder.time.split(':').map(Number)
  let ruleOrDate

  if (reminder.repeat === 'مرة') {
    let now = DateTime.now().setZone(TIMEZONE)
    let when = now.set({ hour, minute, second: 0, millisecond: 0 })
    if (when <= now) when = when.plus({ days: 1 })
    ruleOrDate = when.toJSDate()
  } else {
    const rule = new schedule.RecurrenceRule()
    rule.hour = hour
    rule.minute = minute
    rule.tz = TIMEZONE
    if (reminder.repeat === 'اسبوعي') {
      rule.dayOfWeek = DateTime.now().setZone(TIMEZONE).weekday % 7
    } else if (reminder.repeat === 'شهري') {
      rule.date = DateTime.now().setZone(TIMEZONE).day
    }
    ruleOrDate = rule
  }

  schedule.scheduleJob(reminder.id, ruleOrDate, async () => {
    try {
      await conn.sendMessage(reminder.chat, {
        text: `🔔 *تذكير*\n\n${reminder.message}`
      })
    } catch (e) { console.error('[REMINDER]', e?.message) }
  })
}

export function loadAndScheduleReminders(conn) {
  try {
    const data = JSON.parse(fs.readFileSync(remindersFile))
    for (const r of data) scheduleReminder(r, conn)
  } catch (e) { console.error('[REMINDER-LOAD]', e?.message) }
}

// ─────────────────────────────────────────────────────────────────────────────
// تطبيع الإدخال (أرقام عربية → إنجليزية)
// ─────────────────────────────────────────────────────────────────────────────
function normalize(text = '') {
  const map = { '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9','：':':' }
  return String(text).trim().replace(/[٠-٩：]/g, ch => map[ch] || ch)
}

// ─────────────────────────────────────────────────────────────────────────────
// تخزين جلسات المعالج (مؤقت في الذاكرة)
// ─────────────────────────────────────────────────────────────────────────────
global.reminderSessions ??= {}

function clearExpired() {
  const now = Date.now()
  for (const k of Object.keys(global.reminderSessions)) {
    if (now - global.reminderSessions[k].ts > SESSION_TIMEOUT) {
      delete global.reminderSessions[k]
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// خطوات المعالج
// ─────────────────────────────────────────────────────────────────────────────
async function askTime(conn, m) {
  const sent = await conn.sendMessage(m.chat, {
    text:
`╭────『 🔔 إنشاء تذكير 』────
│
│ *الخطوة 1 من 3: الوقت*
│ ⏰ في أي وقت تريد التذكير؟
│
│ الصيغة: HH:MM (24 ساعة)
│ مثال: 18:30 أو 07:15
│
╰──────────────────
↩️ ردّ على هذه الرسالة بالوقت`
  }, { quoted: m })
  return sent?.key?.id || null
}

async function askMessage(conn, chat, quoted) {
  const sent = await conn.sendMessage(chat, {
    text:
`╭────『 🔔 إنشاء تذكير 』────
│
│ *الخطوة 2 من 3: الرسالة*
│ 💬 ماذا تريدني أن أذكّرك به؟
│
╰──────────────────
↩️ ردّ بالرسالة`
  }, { quoted })
  return sent?.key?.id || null
}

async function askRepeat(conn, chat, quoted) {
  const sent = await conn.sendMessage(chat, {
    text:
`╭────『 🔔 إنشاء تذكير 』────
│
│ *الخطوة 3 من 3: التكرار*
│ 🔁 كم مرة يتكرر التذكير؟
│
│   1. مرة واحدة فقط
│   2. يومي
│   3. اسبوعي
│   4. شهري
│
╰──────────────────
↩️ ردّ برقم الخيار أو بالكلمة`
  }, { quoted })
  return sent?.key?.id || null
}

function parseRepeat(raw) {
  const n = normalize(raw).toLowerCase()
  if (['1', 'مرة', 'مره', 'one', 'once'].includes(n)) return 'مرة'
  if (['2', 'يومي', 'يوم', 'daily'].includes(n)) return 'يومي'
  if (['3', 'اسبوعي', 'أسبوعي', 'weekly'].includes(n)) return 'اسبوعي'
  if (['4', 'شهري', 'monthly'].includes(n)) return 'شهري'
  return null
}

function diffString(time) {
  const [hour, minute] = time.split(':').map(Number)
  const now = DateTime.now().setZone(TIMEZONE)
  let target = now.set({ hour, minute, second: 0, millisecond: 0 })
  if (target <= now) target = target.plus({ days: 1 })
  const diff = target.diff(now, ['hours', 'minutes']).toObject()
  return `${Math.floor(diff.hours)}س ${Math.floor(diff.minutes)}د`
}

async function saveAndConfirm(conn, m, session) {
  const reminder = {
    id: `${m.chat}-${Date.now()}`,
    chat: m.chat,
    time: session.time,
    repeat: session.repeat,
    message: session.message,
    createdAt: Date.now(),
  }
  const data = JSON.parse(fs.readFileSync(remindersFile))
  data.push(reminder)
  fs.writeFileSync(remindersFile, JSON.stringify(data, null, 2))
  scheduleReminder(reminder, conn)

  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  await conn.sendMessage(m.chat, {
    text:
`╭────『 ✅ تم ضبط التذكير 』────
│
│ 🕒 الوقت:        ${session.time}
│ 🔁 التكرار:      ${session.repeat}
│ ⏳ المتبقي:      ${diffString(session.time)}
│ 💬 الرسالة:      ${session.message}
│
│ 👤 ${vipStatus}
│
╰──────────────────`
  }, { quoted: m })
}

// ─────────────────────────────────────────────────────────────────────────────
// الأمر الرئيسي → يبدأ المعالج
// ─────────────────────────────────────────────────────────────────────────────
const handler = async (m, { conn }) => {
  clearExpired()
  const msgId = await askTime(conn, m)
  global.reminderSessions[m.sender] = {
    step: 'time',
    msgId,
    chat: m.chat,
    ts: Date.now(),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// متابعة المعالج عبر Reply
// ─────────────────────────────────────────────────────────────────────────────
handler.all = async function (m) {
  clearExpired()
  const session = global.reminderSessions[m.sender]
  if (!session) return

  // يجب أن يكون الردّ على آخر رسالة من البوت
  const quotedId = m.quoted?.id || m.message?.extendedTextMessage?.contextInfo?.stanzaId
  if (!quotedId || quotedId !== session.msgId) return

  const raw = (m.text || '').trim()
  if (!raw) return

  // إلغاء صريح
  if (/^(الغاء|إلغاء|cancel|توقف)$/i.test(raw)) {
    delete global.reminderSessions[m.sender]
    return this.sendMessage(m.chat, { text: '❌ تم إلغاء إنشاء التذكير.' }, { quoted: m })
  }

  // ── الخطوة 1: الوقت ────────────────────────────────────────
  if (session.step === 'time') {
    const t = normalize(raw)
    if (!/^\d{1,2}:\d{2}$/.test(t)) {
      const sent = await this.sendMessage(m.chat, {
        text: '❌ صيغة الوقت غير صحيحة.\nاستخدم: HH:MM (مثل 18:30)\n\n↩️ جرّب الردّ مرة أخرى'
      }, { quoted: m })
      session.msgId = sent?.key?.id || session.msgId
      session.ts = Date.now()
      return
    }
    let [h, mi] = t.split(':').map(Number)
    if (h > 23 || mi > 59) {
      const sent = await this.sendMessage(m.chat, {
        text: '❌ الوقت خارج النطاق.\nالساعة 0-23، الدقيقة 0-59.\n\n↩️ جرّب مرة أخرى'
      }, { quoted: m })
      session.msgId = sent?.key?.id || session.msgId
      session.ts = Date.now()
      return
    }
    session.time = `${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}`
    session.step = 'message'
    session.ts = Date.now()
    session.msgId = await askMessage(this, m.chat, m)
    return
  }

  // ── الخطوة 2: الرسالة ────────────────────────────────────
  if (session.step === 'message') {
    if (raw.length < 2 || raw.length > 300) {
      const sent = await this.sendMessage(m.chat, {
        text: '❌ الرسالة قصيرة جداً أو طويلة جداً (2-300 حرف).\n\n↩️ ردّ مرة أخرى'
      }, { quoted: m })
      session.msgId = sent?.key?.id || session.msgId
      session.ts = Date.now()
      return
    }
    session.message = raw
    session.step = 'repeat'
    session.ts = Date.now()
    session.msgId = await askRepeat(this, m.chat, m)
    return
  }

  // ── الخطوة 3: التكرار ────────────────────────────────────
  if (session.step === 'repeat') {
    const r = parseRepeat(raw)
    if (!r) {
      const sent = await this.sendMessage(m.chat, {
        text: '❌ خيار غير معروف.\nاختر رقماً (1-4) أو كلمة: مرة / يومي / اسبوعي / شهري\n\n↩️ ردّ مرة أخرى'
      }, { quoted: m })
      session.msgId = sent?.key?.id || session.msgId
      session.ts = Date.now()
      return
    }
    session.repeat = r
    await saveAndConfirm(this, m, session)
    delete global.reminderSessions[m.sender]
  }
}

handler.command = /^ذكرني$/i
handler.help = ['ذكرني']
handler.tags = ['tools']
handler.group = false

export default handler
