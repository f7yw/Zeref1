let handler = async (m, { conn, usedPrefix, command, args, isOwner }) => {
  const user = global.db?.data?.users?.[m.sender]

  if (/^(مغادرة|غادر|leave|خروج|انسحب)$/i.test(command)) {
    if (!user || !user.registered) {
      return m.reply('❌ لست مسجلاً أصلاً. استخدم .تسجيل للتسجيل.')
    }
    user.registered  = false
    user.name        = ''
    user.age         = -1
    user.regTime     = -1
    user.level       = 0
    user.exp         = 0
    user.money       = 0
    user.bank        = 0
    user.diamond     = 0
    user.energy      = 100
    user.transactions = []
    user.totalEarned  = 0
    return m.reply(`✅ *تم إلغاء تسجيلك بنجاح.*\n\nتم حذف جميع بياناتك من البوت بما فيها رصيدك.\nيمكنك التسجيل مجدداً في أي وقت باستخدام *.تسجيل*`)
  }

  if (/^(حذف_عضو|حذف-عضو|deluser|مسح_عضو)$/i.test(command)) {
    if (!isOwner) throw '❌ هذا الأمر للمطور فقط.'
    const target = m.mentionedJid?.[0] || m.quoted?.sender
    if (!target) throw `حدد العضو:\n${usedPrefix}${command} @الشخص`
    const targetUser = global.db?.data?.users?.[target]
    if (!targetUser) throw '❌ هذا المستخدم غير موجود في قاعدة البيانات.'
    delete global.db.data.users[target]
    return conn.reply(m.chat, `✅ تم حذف بيانات @${target.split('@')[0]} من قاعدة البيانات.`, m, { mentions: [target] })
  }

  if (/^(مميز_حذف|حذف_مميز|delprem)$/i.test(command)) {
    if (!isOwner) throw '❌ هذا الأمر للمطور فقط.'
    const target = m.mentionedJid?.[0] || m.quoted?.sender
    if (!target) throw `حدد العضو:\n${usedPrefix}${command} @الشخص`
    const targetUser = global.db?.data?.users?.[target]
    if (!targetUser) throw '❌ هذا المستخدم غير موجود.'
    targetUser.premium = false
    targetUser.premiumTime = 0
    targetUser.infiniteResources = false
    return conn.reply(m.chat, `✅ تم إلغاء تميّز @${target.split('@')[0]}.`, m, { mentions: [target] })
  }
}

handler.help = ['مغادرة', 'حذف_عضو', 'مميز_حذف']
handler.tags = ['general']
handler.command = /^(مغادرة|غادر|leave|خروج|انسحب|حذف_عضو|حذف-عضو|deluser|مسح_عضو|مميز_حذف|حذف_مميز|delprem)$/i
export default handler
