import { isVip } from '../lib/economy.js'
/* Creditos a https://github.com/FG98F */

let handler = async (m, { conn, usedPrefix, command }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }  
if (!m.quoted) throw `*[❗معلومه❗] *الرجاء تحديد الرساله التي تريد حذفها اسمي ايما احذف كل الرسائل  الغير مرغوب فيها*`
try {
let delet = m.message.extendedTextMessage.contextInfo.participant
let bang = m.message.extendedTextMessage.contextInfo.stanzaId
return conn.sendMessage(m.chat, { delete: { remoteJid: m.chat, fromMe: false, id: bang, participant: delet }})
} catch {
return conn.sendMessage(m.chat, { delete: m.quoted.vM.key })
}}
handler.help = ['del', 'delete']
handler.tags = ['group']
// (حذف) محجوز لـ group-admin لإزالة عضو. هذا الأمر فقط (احذف) لمسح رسالة محدّدة بالرد عليها.
handler.command = /^(احذف|del|delete)$/i
handler.group = true
handler.admin = true
handler.botAdmin = true
export default handler

/*let handler = function (m) {
if (!m.quoted) throw false
let { chat, fromMe, isBaileys } = m.quoted
if (!fromMe) throw false
if (!isBaileys) throw '*[❗luffy❗] 𝙴𝚂𝙴 𝙼𝙴𝙽𝚂𝙰𝙹𝙴 𝙽𝙾 𝙵𝚄𝙴 𝙴𝙽𝚅𝙸𝙰𝙳𝙾 𝙿𝙾𝚁 𝙼𝙸, 𝙽𝙾 𝙻𝙾 𝙿𝚄𝙴𝙳𝙾 𝙴𝙻𝙸𝙼𝙸𝙽𝙰𝚁*'
conn.sendMessage(chat, { delete: m.quoted.vM.key })
}
handler.help = ['del', 'delete']
handler.tags = ['tools']
handler.command = /^حذف|احذف$/i
handler.group = true
handler.admin = true
export default handler*/