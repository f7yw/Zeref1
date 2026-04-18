let linkRegex = /chat.whatsapp.com\/([0-9A-Za-z]{20,24})/i

let handler = async (m, { conn, text, isMods, isOwner, isPrems }) => {
  let link = (m.quoted ? m.quoted.text ? m.quoted.text : text : text) || text
  let [_, code] = link.match(linkRegex) || []

  if (!code) throw '*[ ⚠️ خطأ ⚠️ ] الرابط خاطئ أو غير موجود*\n*👉🏻 ضع رابط الجروب*\n\n*مثال:*\n*.انضم https://chat.whatsapp.com/D1jV6CtduH7JMkWeyVoqou*\n\n*[❗] لا ترد على أي رسالة لتجنب التداخل، اكتبها كرسالة جديدة فقط*'

  // Developer/owner/premium → immediate join, no confirmation
  if (isPrems || isMods || isOwner || m.fromMe) {
    let res = await conn.groupAcceptInvite(code)
    await m.reply('*✅ تم انضمام البوت للجروب بنجاح! استمتعوا به واحترموه.*')
    return
  }

  // Regular user → notify developer and inform user
  const data = global.owner.filter(([id]) => id)
  for (let jid of data.map(([id]) => `${id}@s.whatsapp.net`).filter(v => v !== conn.user.jid)) {
    await conn.sendMessage(jid, { text: `*[❗] طلب إضافة بوت لمجموعة جديد [❗]*\n\n*—◉ رقم مقدم الطلب:* wa.me/${m.sender.split('@')[0]}\n*—◉ رابط المجموعة:* ${link}` })
  }

  await m.reply('*[❗] تم إرسال رابط مجموعتك للمطور*\n\n*👉🏻 ستكون مجموعتك قيد التقييم وسيقرر المالك ما إذا كان سيضيف البوت أم لا*\n\n*[❗] أسباب محتملة للرفض:*\n*1. البوت مشبع (جروبات كثيرة)*\n*2. تم طرد البوت من قبل*\n*3. تم تغيير رابط المجموعة*\n\n*👉🏻 قد يستغرق الطلب ساعات أو أيام. تحلّ بالصبر!*')
}

handler.help = ['انضم رابط_الجروب']
handler.tags = ['premium']
handler.command = /^(شرف|انضم|انظم|enter|join)$/i
export default handler
