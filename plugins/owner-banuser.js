import { isVip } from '../lib/economy.js'
import { initUser } from '../lib/userInit.js'

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const cmd = String(command || '').toLowerCase()

  // ───────────── حظر/فك حظر دردشة كاملة ─────────────
  const isChatBan   = /^(حظر_شات|حظر-شات|banchat|حظر_دردشة|حظر-دردشة|حظر_المحادثة)$/i.test(cmd)
  const isChatUnban = /^(فك_حظر_شات|فك-حظر-شات|unbanchat|فك_الحظر|فك-الحظر|الغاء_حظر_شات|الغاء_حظر_الشات)$/i.test(cmd)

  if (isChatBan || isChatUnban) {
    const chat = global.db.data.chats[m.chat] || (global.db.data.chats[m.chat] = {})
    chat.isBanned = !!isChatBan
    await global.db.write().catch(() => {})
    const msg = isChatBan
      ? `╭────『 🛡️ حظر الدردشة 』────
│
│ ✅ تم حظر هذه الدردشة من البوت.
│ ⚠️ لن يستجيب البوت لأي أمر هنا
│    حتى يُلغى الحظر.
│
╰──────────────────`
      : `╭────『 ✅ فك حظر الدردشة 』────
│
│ 🟢 تم فك الحظر، البوت يعمل الآن
│    بشكل طبيعي في هذه الدردشة.
│
╰──────────────────`
    return m.reply(msg)
  }

  // ───────────── حظر/فك حظر مستخدم ─────────────
  let who
  if (m.isGroup) who = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : false)
  else who = m.chat

  if (!who) {
    let helpText = `╭────『 🔖 إدارة المستخدم 』────
│
│ ⚠️ منشن الشخص أو رد على رسالته
│
│ 📌 مثال:
│ *${usedPrefix + command} @${global.suittag || m.sender.split('@')[0]}*
│
╰──────────────────`
    return m.reply(helpText, m.chat, { mentions: conn.parseMention(helpText) })
  }

  let user = global.db.data.users[who]
  if (!user) {
    user = global.db.data.users[who] = {}
    initUser(user, undefined, who)
  }

  const isUnbanning = /^(unbanuser|unban|الغاء_بان|الغاء_الحظر|فك_بان|فك-البان|رفع_البان|رفع-البان)$/i.test(cmd)
  user.banned = !isUnbanning
  user.bannedReason = (!isUnbanning && text)
    ? text.replace('@' + who.split('@')[0], '').trim()
    : ''
  await global.db.write().catch(() => {})

  const status = isUnbanning ? '✅ تم فك الحظر عن' : '🚫 تم حظر'
  const caption = `╭────『 👤 إدارة المستخدم 』────
│
│ ${status}: @${who.split('@')[0]}
${!isUnbanning ? `│ 📝 السبب: ${user.bannedReason || 'غير محدد'}\n│` : '│'}
╰──────────────────`

  await conn.reply(m.chat, caption, m, { mentions: [who] })
}

handler.help = [
  'بان <@user>', 'الغاء_بان <@user>', 'رفع-البان <@user>',
  'حظر_شات', 'فك_حظر_شات'
]
handler.tags = ['owner']
handler.command = /^(banuser|unbanuser|بان|الغاء_بان|حظر|الغاء_الحظر|رفع_البان|رفع-البان|فك_بان|فك-البان|banchat|unbanchat|حظر_شات|حظر-شات|فك_حظر_شات|فك-حظر-شات|الغاء_حظر_شات|فك_الحظر|فك-الحظر|حظر_دردشة|حظر-دردشة|حظر_المحادثة)$/i
handler.rowner = true

export default handler
