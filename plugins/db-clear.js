let handler = async (m, { conn, command, args, usedPrefix, isOwner }) => {
  if (!isOwner) throw '❌ هذا الأمر للمطور فقط.'

  if (/^(مسح_المستخدمين|clear_users)$/i.test(command)) {
    const confirm = args[0]
    if (confirm !== 'تأكيد') {
      return m.reply(`⚠️ *تحذير: سيتم حذف بيانات جميع المستخدمين (عدا المحظورين والمميزين)!*\nللتأكيد اكتب:\n*${usedPrefix}${command} تأكيد*`)
    }
    const users = global.db.data.users || {}
    let removed = 0
    for (const [jid, user] of Object.entries(users)) {
      if (!user?.premium && !(user?.premiumTime > Date.now())) {
        delete global.db.data.users[jid]
        removed++
      }
    }
    await global.db.write()
    return m.reply(`✅ تم مسح *${removed}* مستخدم.\nتم الاحتفاظ بالمميزين والمحظورين.`)
  }

  if (/^(مسح_المحادثات|clear_chats)$/i.test(command)) {
    const confirm = args[0]
    if (confirm !== 'تأكيد') {
      return m.reply(`⚠️ *تحذير: سيتم حذف بيانات جميع المحادثات!*\nللتأكيد:\n*${usedPrefix}${command} تأكيد*`)
    }
    global.db.data.chats = {}
    await global.db.write()
    return m.reply('✅ تم مسح بيانات جميع المحادثات.')
  }

  if (/^(مسح_الإحصاء|clear_stats)$/i.test(command)) {
    global.db.data.stats = {}
    await global.db.write()
    return m.reply('✅ تم مسح الإحصاءات.')
  }

  if (/^(مسح_الكل|clear_all)$/i.test(command)) {
    const confirm = args[0]
    if (confirm !== 'تأكيد') {
      return m.reply(`⚠️ *تحذير: سيتم مسح كل البيانات (عدا المحظورين والمميزين)!*\nللتأكيد:\n*${usedPrefix}${command} تأكيد*`)
    }
    const users = global.db.data.users || {}
    let removed = 0
    for (const [jid, user] of Object.entries(users)) {
      if (!user?.premium && !(user?.premiumTime > Date.now())) {
        delete global.db.data.users[jid]
        removed++
      }
    }
    global.db.data.chats = {}
    global.db.data.stats = {}
    await global.db.write()
    return m.reply(`✅ تم المسح الشامل:\n• مستخدمون محذوفون: *${removed}*\n• المحادثات: مُسحت\n• الإحصاءات: مُسحت\n• المحظورون والمميزون: محفوظون ✅`)
  }

  if (/^(قاعدة_البيانات|dbinfo)$/i.test(command)) {
    const users = Object.keys(global.db.data.users || {}).length
    const prems = Object.values(global.db.data.users || {}).filter(u => u?.premium || (u?.premiumTime > Date.now())).length
    const chats = Object.keys(global.db.data.chats || {}).length
    const stats = Object.keys(global.db.data.stats || {}).length
    const settings = Object.keys(global.db.data.settings || {}).length
    return m.reply(`╭────『 💾 قاعدة البيانات 』────
│ 👥 المستخدمون: *${users}*
│ 👑 المميزون: *${prems}*
│ 💬 المحادثات: *${chats}*
│ 📊 الإحصاءات: *${stats} أمر*
│ ⚙️ الإعدادات: *${settings}*
│
│ *أوامر المسح (للمطور فقط):*
│ .مسح_المستخدمين تأكيد
│ .مسح_المحادثات تأكيد
│ .مسح_الإحصاء
│ .مسح_الكل تأكيد
╰──────────────────`.trim())
  }
}

handler.help = ['مسح_المستخدمين', 'مسح_المحادثات', 'مسح_الإحصاء', 'مسح_الكل', 'قاعدة_البيانات']
handler.tags = ['owner']
handler.command = /^(مسح_المستخدمين|clear_users|مسح_المحادثات|clear_chats|مسح_الإحصاء|clear_stats|مسح_الكل|clear_all|قاعدة_البيانات|dbinfo)$/i
handler.owner = true
export default handler
