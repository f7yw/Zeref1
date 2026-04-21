import { isVip } from '../lib/economy.js'
let handler = async (m, { command, args }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  const chat = global.db.data.chats[m.chat] || (global.db.data.chats[m.chat] = {})
  const sub = (args[0] || '').toLowerCase()

  if (/^(حالة_البوت|حالة-البوت|الحالة|الحاله|حالة|حاله|botstatus|status)$/i.test(command)) {
    return m.reply(`
╭────『 ⚙️ حالة البوت 』────
│ وضع المحادثة: *${chat.botOff ? 'متوقف' : 'شغال'}*
│ الوضع العام: *${global.opts.self ? 'خاص للمالك' : 'عام للجميع'}*
│ قراءة الرسائل: *${global.opts.autoread ? 'مفعلة' : 'متوقفة'}*
│ تقييد أوامر الإدارة: *${global.opts.restrict ? 'مفعل' : 'متوقف'}*
│ حماية الروابط: *${chat.antiLink ? 'مفعلة' : 'متوقفة'}*
│ الترجمة العامة: *${chat.globalTranslate?.enabled ? `مفعلة إلى ${chat.globalTranslate.to}` : 'متوقفة'}*
╰──────────────────`.trim())
  }

  // حافظ على الإعدادات بين عمليات إعادة التشغيل
  const persistOpts = async () => {
    global.db.data.settings = global.db.data.settings || {}
    global.db.data.settings.opts = {
      self: !!global.opts.self,
      autoread: !!global.opts.autoread,
      restrict: !!global.opts.restrict
    }
    await global.db.write()
  }

  if (/^(ايقاف|إيقاف|botoff)$/i.test(command)) {
    chat.botOff = true
    await global.db.write()
    return m.reply('⛔ تم إيقاف أوامر البوت في هذه المحادثة لغير المالك.')
  }

  if (/^(تشغيل|boton)$/i.test(command)) {
    chat.botOff = false
    await global.db.write()
    return m.reply('✅ تم تشغيل أوامر البوت في هذه المحادثة.')
  }

  if (/^(خاص|self)$/i.test(command)) {
    global.opts.self = true
    await persistOpts()
    return m.reply('🔐 تم تحويل البوت إلى وضع المالك فقط.')
  }

  if (/^(عام|public)$/i.test(command)) {
    global.opts.self = false
    await persistOpts()
    return m.reply('🌍 تم تحويل البوت إلى الوضع العام.')
  }

  if (/^(قراءة|read)$/i.test(command)) {
    if (/^(تشغيل|on|نعم)$/i.test(sub)) {
      global.opts.autoread = true
      await persistOpts()
      return m.reply('✅ تم تفعيل قراءة الرسائل.')
    }
    if (/^(ايقاف|إيقاف|off|لا)$/i.test(sub)) {
      global.opts.autoread = false
      await persistOpts()
      return m.reply('✅ تم إيقاف قراءة الرسائل.')
    }
    return m.reply('استخدم: .قراءة تشغيل أو .قراءة ايقاف')
  }
}

handler.help = ['الحالة', 'حالة_البوت', 'تشغيل', 'ايقاف', 'عام', 'خاص', 'قراءة']
handler.tags = ['owner']
handler.command = /^(حالة_البوت|حالة-البوت|الحالة|الحاله|حالة|حاله|botstatus|status|ايقاف|إيقاف|botoff|تشغيل|boton|خاص|self|عام|public|قراءة|read)$/i
handler.owner = true
export default handler