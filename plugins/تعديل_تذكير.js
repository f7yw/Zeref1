import { isVip } from '../lib/economy.js'
import fs from 'fs'
import path from 'path'
import schedule from 'node-schedule'

const remindersFile = path.resolve('./reminders.json')

// إنشاء الملف إذا لم يكن موجود
if (!fs.existsSync(remindersFile)) fs.writeFileSync(remindersFile, '[]')

// === الأمر الرئيسي ===
let handler = async (m, { args, usedPrefix, command }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
    let example = `مثال:\n${usedPrefix + command} 2 20:00 راجع الدرس شهري`
    if (args.length < 4) {
        return m.reply(`❗ لاستخدام الأمر اكتب:\n${usedPrefix + command} <الرقم> <الوقت> <الرسالة> <التكرار>\n\n${example}\n👤 العضوية: ${vipStatus}`)
    }

    let index = parseInt(args[0]) - 1
    let time = args[1]
    let repeat = args[args.length - 1]
    let message = args.slice(2, -1).join(' ')

    if (isNaN(index)) return m.reply('❌ الرقم غير صحيح.')
    if (!/^\d{2}:\d{2}$/.test(time)) return m.reply('❌ الوقت غير صحيح، اكتب مثل 18:30')
    if (!['مرة', 'يومي', 'اسبوعي', 'شهري'].includes(repeat)) return m.reply('❌ نوع التكرار غير صحيح. اختر من: مرة، يومي، اسبوعي، شهري')

    // تحميل التذكيرات
    let data = JSON.parse(fs.readFileSync(remindersFile))
    let userReminders = data.filter(r => r.chat === m.chat)

    if (!userReminders[index]) return m.reply('❌ لم يتم العثور على التذكير بالرقم المحدد.')

    // تعديل التذكير
    let oldReminder = userReminders[index]
    let globalIndex = data.indexOf(oldReminder)

    // إلغاء التذكير القديم إن كان مجدول
    if (oldReminder.id && schedule.scheduledJobs[oldReminder.id]) {
        schedule.scheduledJobs[oldReminder.id].cancel()
    }

    // تحديث التذكير بنفس id
    let updatedReminder = {
        ...oldReminder,
        time,
        repeat,
        message
    }

    data[globalIndex] = updatedReminder
    fs.writeFileSync(remindersFile, JSON.stringify(data, null, 2))

    // جدولة التذكير الجديد
    scheduleReminder(updatedReminder, m)

    await m.reply(`✅ تم تعديل التذكير بنجاح\n🕒 الوقت: ${time}\n🔁 التكرار: ${repeat}\n💬 الرسالة: ${message}\n👤 العضوية: ${vipStatus}`)
}

handler.command = /^(تعديل_تذكير)$/i
export default handler

// === وظيفة الجدولة ===
function scheduleReminder(reminder, m) {
    // إنشاء id إذا لم يكن موجود
    if (!reminder.id) reminder.id = `${reminder.chat}-${Date.now()}`

    let [hour, minute] = reminder.time.split(':').map(Number)
    let ruleOrDate

    if (reminder.repeat === 'مرة') {
        let now = new Date()
        let when = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0)
        if (when <= now) when.setDate(when.getDate() + 1)
        ruleOrDate = when
    } else {
        let rule = new schedule.RecurrenceRule()
        rule.hour = hour
        rule.minute = minute

        if (reminder.repeat === 'اسبوعي') rule.dayOfWeek = new Date().getDay()
        else if (reminder.repeat === 'شهري') rule.date = new Date().getDate()

        ruleOrDate = rule
    }

    schedule.scheduleJob(reminder.id, ruleOrDate, () => {
        m.conn.sendMessage(reminder.chat, { text: `🔔 تذكير: ${reminder.message}\n👤 العضوية: ${vipStatus}` })
    })
}