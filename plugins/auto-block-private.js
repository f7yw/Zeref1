/**
 * بلوك تلقائي لكل من يدخل الخاص
 * عند التفعيل: أي رقم يراسل البوت في الخاص (غير المالك/المميزين) يُحظر تلقائياً.
 */

const SETTING_KEY = 'autoBlockPrivate'

let handler = async (m, { args, command, usedPrefix }) => {
  global.db.data.botSettings ??= {}
  const sub = (args[0] || '').toLowerCase()
  const cur = !!global.db.data.botSettings[SETTING_KEY]

  if (/^(تشغيل|on|نعم|فعل|تفعيل)$/i.test(sub)) {
    global.db.data.botSettings[SETTING_KEY] = true
    await global.db.write()
    return m.reply('🚫 تم تفعيل البلوك التلقائي للخاص.\nأي رقم يراسل البوت في الخاص (غير المالك/المميزين) سيُحظر فوراً.')
  }
  if (/^(ايقاف|إيقاف|off|لا|تعطيل|اطفاء|إطفاء)$/i.test(sub)) {
    global.db.data.botSettings[SETTING_KEY] = false
    await global.db.write()
    return m.reply('✅ تم إيقاف البلوك التلقائي للخاص.')
  }
  return m.reply(
`🚫 *البلوك التلقائي للخاص*

الحالة: *${cur ? 'مفعّل ✅' : 'متوقّف ⛔'}*

للتغيير:
${usedPrefix}${command} تشغيل
${usedPrefix}${command} ايقاف`)
}

handler.help = ['بلوك_الخاص', 'حظر_الخاص']
handler.tags = ['owner']
handler.command = /^(بلوك_الخاص|حظر_الخاص|block_private|autoblock_private)$/i
handler.owner = true

// ─── الخطّاف التلقائي: ينفذ قبل كل الأوامر ───────────────────────────────
handler.before = async function (m, { conn, isOwner, isROwner, isPrems }) {
  try {
    if (!global.db?.data?.botSettings?.[SETTING_KEY]) return
    if (m.isGroup) return                                       // فقط الخاص
    if (m.fromMe) return                                        // ليس من البوت
    if (isOwner || isROwner || isPrems) return                  // استثناء المالك والمميزين
    const sender = m.sender
    if (!sender) return
    if (sender === 'status@broadcast') return
    if (sender.endsWith('@g.us') || sender.endsWith('@newsletter')) return

    // حلّ الـ @lid إلى رقم حقيقي قدر الإمكان
    const resolved = (sender.endsWith('@lid') && global.lidPhoneMap?.[sender])
      ? global.lidPhoneMap[sender]
      : sender

    // updateBlockStatus لا يقبل @lid — استخدم النسخة المحلولة فقط
    const target = resolved.endsWith('@s.whatsapp.net') ? resolved : null
    if (!target) return                                         // لا نملك رقم → تجاهل

    // تجنب الحظر المتكرر: علّم في القاعدة
    global.db.data.botSettings.blockedPrivateList ??= {}
    if (global.db.data.botSettings.blockedPrivateList[target]) return

    await conn.updateBlockStatus(target, 'block').catch(() => {})
    global.db.data.botSettings.blockedPrivateList[target] = Date.now()

    // أرسل تحذيراً للمالكين
    for (const entry of (global.owner || [])) {
      const ownerNum = String(Array.isArray(entry) ? entry[0] : entry).replace(/\D/g, '')
      if (!ownerNum) continue
      const ownerJid = `${ownerNum}@s.whatsapp.net`
      conn.sendMessage(ownerJid, {
        text: `🚫 *بلوك تلقائي*\n\n📞 الرقم: \`${target.split('@')[0]}\`\n💬 محتوى الرسالة: ${(m.text || '').slice(0, 100) || '—'}\n\n_تم الحظر تلقائياً لأنه راسل البوت في الخاص._`
      }).catch(() => {})
    }
    return true   // أوقف معالجة الرسالة
  } catch {}
}

export default handler
