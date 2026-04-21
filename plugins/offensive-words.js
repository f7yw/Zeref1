/**
 * 🛡️ حماية الكلام المسيء (محسَّنة)
 * ──────────────────────────────────────────
 *  • قائمة كلمات افتراضية + قائمة مخصّصة لكل قروب/محادثة.
 *  • مستويات حماية:
 *      1 = تحذير فقط
 *      2 = تحذير + مسح الرسالة (يحتاج البوت مشرفاً)
 *      3 = تحذير + مسح + حظر مؤقت 30د بعد 3 تحذيرات
 *      4 = تحذير + مسح + طرد من القروب فوراً
 *  • أوامر:
 *      .حماية_الكلام                ← الحالة + الإعدادات
 *      .حماية_الكلام تشغيل|ايقاف
 *      .حماية_الكلام مستوى <1-4>
 *      .كلمة_محظورة اضف <كلمة>
 *      .كلمة_محظورة حذف <كلمة>
 *      .كلمات_محظورة                ← عرض القائمة المخصّصة للقروب
 *      .تحذيرات_عضو @
 *      .رفع_حظر_مؤقت @
 */
import { isVip } from '../lib/economy.js'

const DEFAULT_BANNED = [
  'كلب','حيوان','غبي','أحمق','احمق','زبالة','لعين','ملعون','شرموطة','شرموط',
  'عاهرة','عاهر','كس','طيز','زبر','خول','قحبة','قحبه','لوطي','نيك',
  'fuck','shit','bitch','bastard','asshole','whore','damn','crap',
  'يلعن','العن','منيوك','مخنث','حمار','خنزير'
]

const WARN_LIMIT = 3
const TEMP_BAN_DURATION = 30 * 60 * 1000

function getChat(m) {
  global.db.data.chats[m.chat] ??= {}
  return global.db.data.chats[m.chat]
}
function getBannedList(chat) {
  if (!Array.isArray(chat.bannedWords)) chat.bannedWords = []
  return [...new Set([...DEFAULT_BANNED, ...chat.bannedWords])]
}
function containsOffensive(text, list) {
  if (!text) return null
  const lower = text.toLowerCase()
  return list.find(w => lower.includes(w.toLowerCase())) || null
}

export async function before(m, { conn, isAdmin, isBotAdmin }) {
  if (!m.text || m.fromMe || !global.db?.data) return true
  const chat = global.db.data.chats?.[m.chat] || {}
  if (!chat.antiOffensive) return true
  if (isAdmin) return true // المشرفون مستثنون

  const list = getBannedList(chat)
  const hit = containsOffensive(m.text, list)
  if (!hit) return true

  const level = Math.min(4, Math.max(1, parseInt(chat.antiOffensiveLevel || 2, 10)))

  const user = global.db.data.users?.[m.sender]
  if (!user) return true
  user.offensiveWarnings ??= []
  user.offensiveLog ??= []
  user.offensiveLog.push({ word: hit, time: Date.now(), chat: m.chat })
  if (user.offensiveLog.length > 30) user.offensiveLog = user.offensiveLog.slice(-30)
  user.offensiveWarnings = (user.offensiveWarnings || []).filter(t => Date.now() - t < 24 * 60 * 60 * 1000)
  user.offensiveWarnings.push(Date.now())
  const warnCount = user.offensiveWarnings.length

  // مسح الرسالة (مستوى 2+)
  if (level >= 2 && isBotAdmin) {
    try { await conn.sendMessage(m.chat, { delete: m.key }) } catch {}
  }

  // طرد فوري (مستوى 4)
  if (level >= 4 && isBotAdmin && m.isGroup) {
    try { await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove') } catch {}
    try {
      await conn.sendMessage(m.chat, {
        text: `🚪 تم طرد @${m.sender.split('@')[0]} لاستخدامه كلاماً مسيئاً (مستوى الحماية 4).`,
        mentions: [m.sender]
      })
    } catch {}
    return false
  }

  // حظر مؤقت (مستوى 3+)
  if (level >= 3 && warnCount >= WARN_LIMIT) {
    user.tempBannedUntil = Date.now() + TEMP_BAN_DURATION
    user.offensiveWarnings = []
    try {
      await conn.sendMessage(m.chat, {
        text: `🚫 @${m.sender.split('@')[0]} حُظر مؤقتاً من البوت 30 دقيقة بسبب تكرار الكلام المسيء.`,
        mentions: [m.sender]
      })
    } catch {}
    return false
  }

  // تحذير
  try {
    await conn.sendMessage(m.chat, {
      text:
`⚠️ *تحذير* @${m.sender.split('@')[0]}
❌ كلمة مرصودة: \`${hit}\`
🛡️ مستوى الحماية: *${level}*
🔢 تحذيرات اليوم: *${warnCount}/${WARN_LIMIT}*
${warnCount >= WARN_LIMIT - 1 ? '🚨 التحذير القادم سيؤدي لإجراء أشد!' : 'الرجاء الالتزام بأدب الحوار.'}`.trim(),
      mentions: [m.sender]
    }, { quoted: m })
  } catch {}

  return false
}

let handler = async (m, { conn, args, command, isOwner, isAdmin }) => {
  const cmd = command.toLowerCase()
  const chat = getChat(m)

  if (/^(حماية_الكلام|antioffensive)$/i.test(cmd)) {
    if (!isAdmin && !isOwner) throw '❌ المشرف/المطور فقط.'
    const sub = (args[0] || '').toLowerCase()
    if (/^(تشغيل|on|نعم|فعل)$/.test(sub)) { chat.antiOffensive = true; global.db.markDirty?.(); return m.reply('✅ فعِّلت فلتر الكلام المسيء.') }
    if (/^(ايقاف|إيقاف|off|تعطيل)$/.test(sub)) { chat.antiOffensive = false; global.db.markDirty?.(); return m.reply('⛔ أوقفتُ فلتر الكلام المسيء.') }
    if (sub === 'مستوى' || sub === 'level') {
      const lvl = parseInt(args[1], 10)
      if (Number.isNaN(lvl) || lvl < 1 || lvl > 4) throw 'المستوى من 1 إلى 4.'
      chat.antiOffensiveLevel = lvl; global.db.markDirty?.()
      return m.reply(`✅ مستوى الحماية الآن: *${lvl}*\n  1: تحذير فقط\n  2: تحذير + مسح\n  3: + حظر مؤقت\n  4: + طرد فوري`)
    }
    return m.reply(
`╭───『 🛡️ حماية الكلام المسيء 』
│ 🔘 الحالة: *${chat.antiOffensive ? '✅ مفعَّل' : '⛔ متوقف'}*
│ 🛡️ المستوى: *${chat.antiOffensiveLevel || 2}* /4
│ 📝 كلمات مخصّصة: *${(chat.bannedWords || []).length}*
╰────────

⚙️ .حماية_الكلام تشغيل | ايقاف
⚙️ .حماية_الكلام مستوى 1..4
⚙️ .كلمة_محظورة اضف <كلمة>
⚙️ .كلمة_محظورة حذف <كلمة>
⚙️ .كلمات_محظورة`)
  }

  if (/^(كلمة_محظورة|badword)$/i.test(cmd)) {
    if (!isAdmin && !isOwner) throw '❌ المشرف/المطور فقط.'
    const sub = (args[0] || '').toLowerCase()
    const word = args.slice(1).join(' ').trim()
    chat.bannedWords ??= []
    if (/^(اضف|إضف|add)$/.test(sub)) {
      if (!word) throw 'اكتب الكلمة بعد "اضف".'
      if (chat.bannedWords.includes(word)) return m.reply('⚠️ الكلمة موجودة سلفاً.')
      chat.bannedWords.push(word); global.db.markDirty?.()
      return m.reply(`✅ أُضيفت: *${word}*\nالمجموع المخصّص: ${chat.bannedWords.length}`)
    }
    if (/^(حذف|del|remove)$/.test(sub)) {
      if (!word) throw 'اكتب الكلمة بعد "حذف".'
      const before = chat.bannedWords.length
      chat.bannedWords = chat.bannedWords.filter(w => w !== word)
      global.db.markDirty?.()
      return m.reply(chat.bannedWords.length < before ? `🗑️ حُذفت: *${word}*` : '⚠️ لم أجد هذه الكلمة في القائمة المخصّصة.')
    }
    return m.reply('استخدم: .كلمة_محظورة اضف <كلمة>  /  .كلمة_محظورة حذف <كلمة>')
  }

  if (/^(كلمات_محظورة|badwords|قائمة_كلمات)$/i.test(cmd)) {
    const custom = chat.bannedWords || []
    return m.reply(
`📚 *كلمات محظورة*

🔒 افتراضية: ${DEFAULT_BANNED.length}
🛠️ مخصّصة بهذا القروب: ${custom.length}

${custom.length ? custom.map((w, i) => `${i + 1}. ${w}`).join('\n') : '— لا كلمات مخصّصة بعد —'}`)
  }

  if (/^(تحذيرات_عضو|warnings)$/i.test(cmd)) {
    if (!isOwner && !isAdmin) throw '❌ المشرف/المطور فقط.'
    const target = m.mentionedJid?.[0] || m.quoted?.sender || m.sender
    const targetUser = global.db?.data?.users?.[target]
    if (!targetUser) throw '❌ المستخدم غير موجود.'
    const warns = (targetUser.offensiveWarnings || []).length
    const banned = (targetUser.tempBannedUntil || 0) > Date.now()
    return conn.reply(m.chat, `📊 @${target.split('@')[0]}\nتحذيرات نشطة: ${warns}/${WARN_LIMIT}\nحظر مؤقت: ${banned ? `حتى ${new Date(targetUser.tempBannedUntil).toLocaleString('ar')}` : 'لا'}`, m, { mentions: [target] })
  }

  if (/^(رفع_حظر_مؤقت|unbantmp)$/i.test(cmd)) {
    if (!isOwner) throw '❌ للمطور فقط.'
    const target = m.mentionedJid?.[0] || m.quoted?.sender
    if (!target) throw 'حدد العضو.'
    const targetUser = global.db?.data?.users?.[target]
    if (!targetUser) throw '❌ المستخدم غير موجود.'
    targetUser.tempBannedUntil = 0
    targetUser.offensiveWarnings = []
    global.db.markDirty?.()
    return conn.reply(m.chat, `✅ رُفع الحظر المؤقت عن @${target.split('@')[0]}`, m, { mentions: [target] })
  }
}

handler.help = ['حماية_الكلام', 'كلمة_محظورة', 'كلمات_محظورة', 'تحذيرات_عضو', 'رفع_حظر_مؤقت']
handler.tags = ['group']
handler.command = /^(حماية_الكلام|antioffensive|كلمة_محظورة|badword|كلمات_محظورة|badwords|قائمة_كلمات|تحذيرات_عضو|warnings|رفع_حظر_مؤقت|unbantmp)$/i
export default handler
