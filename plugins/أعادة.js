import { isVip } from '../lib/economy.js'
//import db from '../lib/database.js'

let handler = async (m, { conn, text }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  function no(number){
    return number.replace(/\s/g,'').replace(/([@+-])/g,'')
  }

  text = no(text)

  if(isNaN(text)) {
    var number = text.split`@`[1]
  } else if(!isNaN(text)) {
    var number = text
  }

  if(!text && !m.quoted) return conn.reply(m.chat, `*❏إعادة تعيين المستخدم*\n\nمنشن المستخدم, *اكتب الرقم أو قم بالرد على رسالة المستخدم الذي تريد *إعادة تعيينه\n👤 العضوية: ${vipStatus}`, m)
  //let exists = await conn.isOnWhatsApp(number)
  // if (exists) return conn.reply(m.chat, `*الرقم غير مسجل في واتس اب*\n👤 العضوية: ${vipStatus}`, m)
  if(isNaN(number)) return conn.reply(m.chat, `*❏ إعادة تعيين المستخدم*\nالرقم الذي ادخلته خاطأً\n👤 العضوية: ${vipStatus}`, m)
 // if(number.length > 8) return conn.reply(m.chat, `*❏ إعادة تعيين المستخدم*\nالرقم الذي ادخلته خاطأً!\n👤 العضوية: ${vipStatus}`, m)
  try {
    if(text) {
      var user = number + '@s.whatsapp.net'
    } else if(m.quoted.sender) {
      var user = m.quoted.sender
    } else if(m.mentionedJid) {
        var user = number + '@s.whatsapp.net'
      }  
    } catch (e) {
  } finally {

  let groupMetadata = m.isGroup ? await conn.groupMetadata(m.chat) : {}
  let participants = m.isGroup ? groupMetadata.participants : []
  let users = m.isGroup ? participants.find(u => u.jid == user) : {}
  let number = user.split('@')[0]

  delete global.global.db.data.users[user]

  conn.reply(m.chat, `*❏ إعادة تعيين المستخدم*\n\n✅ إعادة التشغيل إلى @${number}من *قاعدة البيانات*\n👤 العضوية: ${vipStatus}`, null, { mentions: [user] })


 }
}
handler.help = ['reset <54xxx>']
handler.tags = ['owner']
handler.command = ['إعاة'] 
handler.admin = false
handler.rowner = true

export default handler
                                           