import { isVip } from '../lib/economy.js'
let handler = async (m, { conn, text }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  global.db.data.users[m.sender] ||= {}
  let user = global.db.data.users[m.sender]

  user.afk = Date.now()
  user.afkReason = text || ''

  await m.reply(
    `*[❗معلومة❗] المستخدم ${conn.getName(m.sender)} سيكون غير نشط (AFK), من فضلك لا تمنشن*\n\n*—◉ سبب الاختفاء (AFK): ${text || 'بدون سبب'}*\n👤 العضوية: ${vipStatus}`
  )
}

handler.help = ['afk [alasan]']
handler.tags = ['main']
handler.command = /^(اختفاء|الاختفاء|افك|afk)$/i

export default handler