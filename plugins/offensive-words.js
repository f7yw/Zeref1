import { isVip } from '../lib/economy.js'
import fs from 'fs'

const BANNED_WORDS = [
  'كلب', 'حيوان', 'غبي', 'أحمق', 'احمق', 'زبالة', 'لعين', 'ملعون', 'شرموطة', 'شرموط',
  'عاهرة', 'عاهر', 'كس', 'طيز', 'زبر', 'خول', 'قحبة', 'قحبه', 'لوطي', 'نيك',
  'fuck', 'shit', 'bitch', 'bastard', 'asshole', 'whore', 'damn', 'crap',
  'يلعن', 'العن', 'منيوك', 'مخنث', 'زبالة', 'حمار', 'خنزير'
]

const WARN_LIMIT = 3
const TEMP_BAN_DURATION = 30 * 60 * 1000 // 30 minutes

function containsOffensive(text) {
  if (!text) return false
  const lower = text.toLowerCase()
  return BANNED_WORDS.some(w => lower.includes(w.toLowerCase()))
}

export async function before(m, { conn }) {
  if (!m.text || m.fromMe || !global.db?.data) return true
  
  const chat = global.db.data.chats?.[m.chat] || {}
  if (!chat.antiOffensive) return true

  if (!containsOffensive(m.text)) return true

  const user = global.db.data.users?.[m.sender]
  if (!user) return true

  if (!Array.isArray(user.offensiveWarnings)) user.offensiveWarnings = []
  if (!user.offensiveLog) user.offensiveLog = []

  user.offensiveLog.push({ word: m.text.slice(0, 100), time: Date.now(), chat: m.chat })
  if (user.offensiveLog.length > 20) user.offensiveLog = user.offensiveLog.slice(-20)

  user.offensiveWarnings.push(Date.now())
  const activeWarnings = user.offensiveWarnings.filter(t => Date.now() - t < 24 * 60 * 60 * 1000)
  user.offensiveWarnings = activeWarnings

  const warnCount = activeWarnings.length

  if (warnCount >= WARN_LIMIT) {
    user.tempBannedUntil = Date.now() + TEMP_BAN_DURATION
    user.offensiveWarnings = []
    try {
      await m.reply(`🚫 @${m.sender.split('@')[0]} تم حظرك مؤقتاً من استخدام البوت لمدة 30 دقيقة بسبب استخدام كلمات مسيئة.\n👤 العضوية: ${vipStatus}`, null, { mentions: [m.sender] })
    } catch (_) {}
    return false
  }

  try {
    await conn.reply(m.chat,
      `⚠️ تحذير @${m.sender.split('@')[0]}!\n\n❌ تم رصد كلام مسيء في رسالتك.\n⚠️ التحذير رقم: *${warnCount}/${WARN_LIMIT}*\n${warnCount >= WARN_LIMIT - 1 ? '🚨 التحذير القادم سيؤدي إلى حظر مؤقت!' : 'يرجى الالتزام بأدب الحديث.'}`.trim(),
      m, { mentions: [m.sender] })
  } catch (_) {}

  return false
}

let handler = async (m, { conn, args, command, isOwner }) => {
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const chat = global.db.data.chats[m.chat] || (global.db.data.chats[m.chat] = {})

  if (/^(حماية_الكلام|antioffensive)$/i.test(command)) {
    const sub = (args[0] || '').toLowerCase()
    if (/^(تشغيل|on)$/i.test(sub)) {
      chat.antiOffensive = true
      return m.reply('✅ تم تفعيل فلتر الكلام المسيء. سيتم تحذير المخالفين وحظرهم مؤقتاً.')
    }
    if (/^(ايقاف|إيقاف|off)$/i.test(sub)) {
      chat.antiOffensive = false
      return m.reply('⛔ تم إيقاف فلتر الكلام المسيء.')
    }
    return m.reply(`الحالة الحالية: *${chat.antiOffensive ? 'مفعّل' : 'متوقف'}*\nاستخدم:\n.حماية_الكلام تشغيل\n.حماية_الكلام ايقاف\n👤 العضوية: ${vipStatus}`)
  }

  if (/^(تحذيرات_عضو|warnings)$/i.test(command)) {
    if (!isOwner) throw '❌ هذا الأمر للمطور فقط.'
    const target = m.mentionedJid?.[0] || m.quoted?.sender || m.sender
    const targetUser = global.db?.data?.users?.[target]
    if (!targetUser) throw '❌ المستخدم غير موجود.'
    const warns = (targetUser.offensiveWarnings || []).length
    const banned = (targetUser.tempBannedUntil || 0) > Date.now()
    return conn.reply(m.chat, `📊 تقرير @${target.split('@')[0]}\nالتحذيرات النشطة: ${warns}/${WARN_LIMIT}\nالحظر المؤقت: ${banned ? `حتى ${new Date(targetUser.tempBannedUntil).toLocaleString('ar')}` : 'لا'}`, m, { mentions: [target] })
  }

  if (/^(رفع_حظر_مؤقت|unbantmp)$/i.test(command)) {
    if (!isOwner) throw '❌ هذا الأمر للمطور فقط.'
    const target = m.mentionedJid?.[0] || m.quoted?.sender
    if (!target) throw 'حدد العضو.'
    const targetUser = global.db?.data?.users?.[target]
    if (!targetUser) throw '❌ المستخدم غير موجود.'
    targetUser.tempBannedUntil = 0
    targetUser.offensiveWarnings = []
    return conn.reply(m.chat, `✅ تم رفع الحظر المؤقت عن @${target.split('@')[0]}\n👤 العضوية: ${vipStatus}`, m, { mentions: [target] })
  }
}

handler.help = ['حماية_الكلام', 'تحذيرات_عضو', 'رفع_حظر_مؤقت']
handler.tags = ['owner']
handler.command = /^(حماية_الكلام|antioffensive|تحذيرات_عضو|warnings|رفع_حظر_مؤقت|unbantmp)$/i
export default handler
