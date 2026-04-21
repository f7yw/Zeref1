/**
 * أمر .ليد — يربط LID JID برقم الهاتف يدوياً
 * مهم لمن يرسل من LID JID ويريد أن يُتعرف عليه كمالك
 * الأمر: .ليد 967778088098
 */

let handler = async (m, { conn, text }) => {
  const senderLid = m.sender
  const isSenderLid = senderLid?.endsWith('@lid')

  // إذا لم يكن المرسل LID، لا يلزم التسجيل
  if (!isSenderLid) {
    return m.reply(`ℹ️ رقمك الحالي: \`${senderLid}\`\nأنت تستخدم رقم هاتف عادي — لا تحتاج لهذا الأمر.`)
  }

  const num = (text || '').replace(/[^0-9]/g, '').trim()
  if (!num || num.length < 7) {
    return m.reply(
`📱 *ربط رقم الهاتف بـ LID*

أنت ترسل من معرف LID:
\`${senderLid}\`

لربطه برقمك الحقيقي، أرسل:
*.ليد 967778088098*

مثال (بدون + أو مسافات)`
    )
  }

  global.lidPhoneMap ??= {}
  const phoneJid = `${num}@s.whatsapp.net`
  global.lidPhoneMap[senderLid] = phoneJid

  // حفظ في قاعدة البيانات
  global.db.data.lidPhoneMap ??= {}
  global.db.data.lidPhoneMap[senderLid] = phoneJid
  await global.db.write()

  // تحقق إذا كان المالك
  const ownerNums = (global.owner || []).map(([n]) => String(n).replace(/\D/g, ''))
  const isOwner = ownerNums.includes(num)

  return m.reply(
`✅ *تم الربط بنجاح!*

📱 معرف LID: \`${senderLid}\`
🔗 رقم الهاتف: +${num}
${isOwner ? '\n👑 تم التعرف عليك كـ *مطور البوت*!' : ''}

🔄 الآن سيتعرف عليك البوت بشكل صحيح.`
  )
}

handler.help = ['ليد']
handler.tags = ['main']
handler.command = /^(ليد|setlid|myid|رقمي)$/i

export default handler
