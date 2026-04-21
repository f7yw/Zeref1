import yts from 'yt-search'
import { fmt, initEconomy , isVip} from '../lib/economy.js'

const ensureUser = jid => {
  const user = global.db.data.users[jid] || (global.db.data.users[jid] = {})
  if (!Array.isArray(user.tasks)) user.tasks = []
  if (!Array.isArray(user.notes)) user.notes = []
  return user
}

let handler = async (m, { conn, text, command, usedPrefix, participants }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  const user = ensureUser(m.sender)
  const now = new Date().toLocaleString('ar')

  if (/^(ميديا)$/i.test(command)) {
    return m.reply(`🎧 *قسم الوسائط*\n${usedPrefix}اغنيه صوت اسم\n${usedPrefix}اغنيه فيديو اسم\n${usedPrefix}فيديو اسم\n${usedPrefix}بحث_يوتيوب كلمة\n👤 العضوية: ${vipStatus}`)
  }

  if (/^(بحث_يوتيوب|يوتيوب)$/i.test(command)) {
    if (!text) throw `اكتب كلمة البحث.`
    const result = await yts(text)
    const videos = (result.videos || []).slice(0, 5)
    if (!videos.length) throw `لم أجد نتائج.`
    return m.reply(videos.map((v, i) => `${i + 1}. ${v.title}\n${v.timestamp || '-'} | ${v.author?.name || '-'}\n${v.url}`).join('\n\n'))
  }

  if (/^(مهمة)$/i.test(command)) {
    if (!text) throw `اكتب نص المهمة.`
    user.tasks.push({ text, done: false, createdAt: Date.now() })
    return m.reply(`✅ تم حفظ المهمة رقم ${user.tasks.length}\n👤 العضوية: ${vipStatus}`)
  }

  if (/^(مهامي)$/i.test(command)) {
    if (!user.tasks.length) return m.reply(`لا توجد مهام محفوظة.\n👤 العضوية: ${vipStatus}`)
    return m.reply(user.tasks.map((task, i) => `${i + 1}. ${task.done ? '✅' : '⬜'} ${task.text}`).join('\n'))
  }

  if (/^(تم)$/i.test(command)) {
    const index = Number(text) - 1
    if (!user.tasks[index]) throw `اكتب رقم مهمة صحيح.`
    user.tasks[index].done = true
    return m.reply(`✅ تم تعليم المهمة كمكتملة.\n👤 العضوية: ${vipStatus}`)
  }

  if (/^(حذف_مهمة|حذف-مهمة)$/i.test(command)) {
    const index = Number(text) - 1
    if (!user.tasks[index]) throw `اكتب رقم مهمة صحيح.`
    const [removed] = user.tasks.splice(index, 1)
    return m.reply(`🗑️ تم حذف: ${removed.text}\n👤 العضوية: ${vipStatus}`)
  }

  if (/^(ملاحظة)$/i.test(command)) {
    if (!text) throw `اكتب نص الملاحظة.`
    user.notes.push({ text, createdAt: Date.now() })
    return m.reply(`📝 تم حفظ الملاحظة رقم ${user.notes.length}\n👤 العضوية: ${vipStatus}`)
  }

  if (/^(ملاحظاتي)$/i.test(command)) {
    if (!user.notes.length) return m.reply(`لا توجد ملاحظات محفوظة.\n👤 العضوية: ${vipStatus}`)
    return m.reply(user.notes.map((note, i) => `${i + 1}. ${note.text}`).join('\n'))
  }

  if (/^(احصائياتي)$/i.test(command)) {
    initEconomy(user)
    return m.reply(
      `📊 *إحصائياتك*\n` +
      `الرسائل/XP: ${user.exp || 0}\n` +
      `المستوى: ${user.level || 0}\n` +
      `المهام: ${user.tasks.length}\n` +
      `المكتملة: ${user.tasks.filter(t => t.done).length}\n` +
      `الملاحظات: ${user.notes.length}\n` +
      `المال: ${fmt(user.money)}\n` +
      `البنك: ${fmt(user.bank)}`
    )
  }

  if (/^(رسائلي|رسائل)$/i.test(command)) {
    const who = m.mentionedJid?.[0] || m.quoted?.sender || m.sender
    const target = ensureUser(who)
    const groupMessages = m.isGroup ? (target.messages?.groups?.[m.chat] || 0) : 0
    const name = await Promise.resolve(conn.getName(who)).catch(() => who.split('@')[0])
    return conn.reply(m.chat, `💬 *متتبع الرسائل*\nالعضو: @${who.split('@')[0]}\nالاسم: ${name || '-'}\nإجمالي الرسائل: ${target.messages?.total || 0}\nرسائل هذا القروب: ${m.isGroup ? groupMessages : 'خاص'}\nآخر نشاط: ${target.messages?.last ? new Date(target.messages.last).toLocaleString('ar') : 'غير محفوظ'}\n👤 العضوية: ${vipStatus}`, m, { mentions: [who] })
  }

  if (/^(ترتيب_الرسائل|ترتيب-الرسائل)$/i.test(command)) {
    const stats = m.isGroup ? (global.db.data.chats[m.chat]?.messageStats || {}) : Object.fromEntries(Object.entries(global.db.data.users || {}).map(([jid, data]) => [jid, data.messages?.total || 0]))
    const top = Object.entries(stats).sort((a, b) => (b[1] || 0) - (a[1] || 0)).slice(0, 10)
    if (!top.length) return m.reply('لا توجد رسائل محفوظة بعد.\n👤 العضوية: ' + vipStatus)
    return conn.reply(m.chat, top.map(([jid, count], i) => `${i + 1}. @${jid.split('@')[0]} — ${count} رسالة`).join('\n'), m, { mentions: top.map(([jid]) => jid) })
  }

  if (/^(ترتيب)$/i.test(command)) {
    const top = Object.entries(global.db.data.users || {}).sort((a, b) => (b[1].exp || 0) - (a[1].exp || 0)).slice(0, 10)
    return m.reply(top.map(([jid, data], i) => `${i + 1}. @${jid.split('@')[0]} — ${data.exp || 0} XP`).join('\n'), null, { mentions: top.map(([jid]) => jid) })
  }

  if (/^(نشاط_القروب|نشاط-القروب)$/i.test(command)) {
    const total = participants?.length || 0
    const admins = (participants || []).filter(p => p.admin).length
    return m.reply(`📈 *نشاط القروب*\nالأعضاء: ${total}\nالمشرفون: ${admins}\nوقت التقرير: ${now}\nنصيحة: استخدموا ${usedPrefix}تحدي و${usedPrefix}كلمة لزيادة التفاعل.\n👤 العضوية: ${vipStatus}`)
  }

  if (/^(حالة_الاقسام|حالة-الاقسام)$/i.test(command)) {
    const stats = global.db.data.stats || {}
    const total = Object.values(stats).reduce((sum, item) => sum + (item.total || 0), 0)
    return m.reply(`📊 أوامر منفذة محفوظة: ${total}\nإضافات نشطة: ${Object.keys(global.plugins || {}).length}\nالمستخدمون المحفوظون: ${Object.keys(global.db.data.users || {}).length}\n👤 العضوية: ${vipStatus}`)
  }

  if (/^(فحص_رابط|فحص-رابط)$/i.test(command)) {
    if (!text || !/^https?:\/\//i.test(text)) throw `أرسل رابط يبدأ بـ http أو https.`
    const risky = /(login|verify|gift|free|password|token|wa\.me\/settings|bit\.ly|tinyurl|t\.co)/i.test(text)
    return m.reply(`${risky ? '⚠️ الرابط يحتاج حذر.' : '✅ الرابط لا تظهر عليه علامات خطرة واضحة.'}\nلا تدخل كلمة مرورك أو رمز التحقق في أي رابط غير موثوق.\n👤 العضوية: ${vipStatus}`)
  }

  if (/^(خصوصيتي)$/i.test(command)) {
    return m.reply(`🛡️ *نصائح الخصوصية*\n1. لا ترسل كود التحقق لأي شخص.\n2. فعّل التحقق بخطوتين.\n3. لا تفتح روابط هدايا مجهولة.\n4. راجع الأجهزة المرتبطة في واتساب.\n5. لا تشارك بياناتك البنكية في القروبات.\n👤 العضوية: ${vipStatus}`)
  }

  if (/^(قواعد_امان|قواعد-امان)$/i.test(command)) {
    return m.reply(`🛡️ *قواعد أمان للقروب*\n• منع الروابط المشبوهة.\n• عدم نشر أرقام خاصة بدون إذن.\n• الإبلاغ عن الاحتيال فوراً.\n• استخدام ${usedPrefix}الحماية تشغيل عند الحاجة.\n👤 العضوية: ${vipStatus}`)
  }

  if (/^(كود)$/i.test(command)) {
    if (!text) throw `مثال: ${usedPrefix}كود js console.log("hi")`
    const [lang, ...code] = text.split(/\s+/)
    return m.reply(`\`\`\`${lang || ''}\n${code.join(' ') || text}\n\`\`\`\n👤 العضوية: ${vipStatus}`)
  }

  if (/^(json)$/i.test(command)) {
    try {
      return m.reply(`\`\`\`json\n${JSON.stringify(JSON.parse(text), null, 2)}\n\`\`\`\n👤 العضوية: ${vipStatus}`)
    } catch {
      throw `JSON غير صحيح.`
    }
  }

  if (/^(regex)$/i.test(command)) {
    const [pattern, ...sampleParts] = text.split(/\s+/)
    if (!pattern || !sampleParts.length) throw `مثال: ${usedPrefix}regex ^[0-9]+$ 123`
    const sample = sampleParts.join(' ')
    const ok = new RegExp(pattern).test(sample)
    return m.reply(ok ? `✅ النص يطابق النمط.` : `❌ النص لا يطابق النمط.`)
  }

  if (/^(مطور)$/i.test(command)) {
    return m.reply(`💻 *قسم المطور*\n${usedPrefix}كود\n${usedPrefix}json\n${usedPrefix}regex\nهذه الأدوات تساعد في تنسيق الأكواد وفحص البيانات بسرعة.\n👤 العضوية: ${vipStatus}`)
  }

  if (/^(ماء)$/i.test(command)) return m.reply(`💧 تذكير لطيف: اشرب كوب ماء الآن وخذ نفساً هادئاً.\n👤 العضوية: ${vipStatus}`)
  if (/^(تنفس)$/i.test(command)) return m.reply(`🌬️ تمرين 4-4-4:\nخذ شهيق 4 ثوانٍ، احبس 4 ثوانٍ، ازفر 4 ثوانٍ. كررها 4 مرات.\n👤 العضوية: ${vipStatus}`)
  if (/^(استراحة)$/i.test(command)) return m.reply(`🌱 استراحة ذكية: ابتعد عن الشاشة 3 دقائق، حرّك رقبتك وكتفيك، ثم ارجع بتركيز أعلى.\n👤 العضوية: ${vipStatus}`)
}

handler.help = ['ميديا', ' ', 'مهمة', 'مهامي', 'تم', 'حذف_مهمة', 'ملاحظة', 'ملاحظاتي', 'احصائياتي', 'رسائلي', 'رسائل', 'ترتيب_الرسائل', 'ترتيب', 'نشاط_القروب', 'حالة_الاقسام', 'فحص_رابط', 'خصوصيتي', 'قواعد_امان', 'كود', 'json', 'regex', 'مطور', 'ماء', 'تنفس', 'استراحة']
handler.tags = ['tools']
handler.command = /^(ميديا|بحث_يوتيوب|يوتيوب|مهمة|مهامي|تم|حذف_مهمة|حذف-مهمة|ملاحظة|ملاحظاتي|احصائياتي|رسائلي|رسائل|ترتيب_الرسائل|ترتيب-الرسائل|ترتيب|نشاط_القروب|نشاط-القروب|حالة_الاقسام|حالة-الاقسام|فحص_رابط|فحص-رابط|خصوصيتي|قواعد_امان|قواعد-امان|كود|json|regex|مطور|ماء|تنفس|استراحة)$/i

export default handler