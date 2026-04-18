import { xpRange } from '../lib/levelling.js'
import { syncEnergy, initEconomy } from '../lib/economy.js'

function clockString(ms) {
  let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
  let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
  let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}

function normalizeChoice(text = '') {
  const map = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9', '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9' }
  return text.trim().replace(/[٠-٩۰-۹]/g, d => map[d] || d)
}

export const sections = {
  study: {
    title: '🎓 التعلم والدراسة',
    text: (p) => `
*🎓 ─── التعلم والدراسة ───*

${p}تعلم              ⟵ شرح سريع لقسم الدراسة
${p}خطة رياضيات 7     ⟵ خطة دراسة حسب المادة والأيام
${p}تلخيص النص        ⟵ تلخيص أي فقرة ترسلها
${p}بطاقات النص       ⟵ تحويل النص لبطاقات مراجعة
${p}اختبرني فيزياء    ⟵ سؤال تدريبي سريع
${p}معدلي 90 85 77    ⟵ حساب معدل تقريبي
${p}قاعدة             ⟵ قاعدة مذاكرة مفيدة
${p}بومودورو          ⟵ طريقة تركيز مختصرة
${p}مصادر             ⟵ مصادر دراسة مرتبة
${p}جدول              ⟵ جدول يومي مختصر`.trim()
  },
  quran: {
    title: '📖 القرآن الكريم',
    text: (p) => `
*📖 ─── القرآن الكريم ───*

${p}اذكار الصباح  ⟵ أذكار الصباح اليومية
${p}اذكار المساء  ⟵ أذكار المساء اليومية
${p}ايه           ⟵ آية الكرسي
${p}الله 1           ⟵ اسماء الله الحسنى
${p}قران          ⟵ آية عشوائية من القرآن`.trim()
  },
  ai: {
    title: '🤖 الذكاء الاصطناعي',
    text: (p) => `
*🤖 ─── الذكاء الاصطناعي ───*

${p}ai / ${p}بوت  ⟵ التحدث مع ChatGPT
${p}جوده           ⟵ رفع جودة الصورة بالـ AI
${p}شخصية          ⟵ تحليل شخصية أنيمي`.trim()
  },
  games: {
    title: '🎮 الألعاب',
    text: (p) => `
*🎮 ─── الألعاب ───*

*👥 ألعاب جماعية (جروب):*
${p}شطرنج      ⟵ شطرنج مصوّر بين لاعبين 🖼️
${p}اكس        ⟵ إكس أو (Tic Tac Toe)
${p}شنقه       ⟵ لعبة المشنقة (تخمين الكلمة)
${p}وصله       ⟵ لعبة الوصلة (سلسلة كلمات)
${p}تحدي       ⟵ تحدي رياضيات (جائزة 💰)
${p}رهان       ⟵ راهن أعضاء القروب 🎰

*🎯 ألعاب فردية:*
${p}سوال       ⟵ سؤال عشوائي (جائزة 💰)
${p}خمن_رقم   ⟵ تخمين رقم من 1 إلى 100
${p}ايموجي     ⟵ لغز الإيموجي
${p}تخمين      ⟵ تخمين الشخصية
${p}فزوره      ⟵ فزورة عشوائية
${p}علم        ⟵ خمّن علم الدولة

*🎲 ألعاب سريعة:*
${p}نرد        ⟵ رمي النرد
${p}عملة       ⟵ ملك أو كتابة
${p}اختار      ⟵ يختار لك من خيارات
${p}حجر        ⟵ حجر ورقة مقص ضد البوت
${p}لو         ⟵ لعبة لو خيروك`.trim()
  },
  tools: {
    title: '🛠️ أدوات نافعة',
    text: (p) => `
*🛠️ ─── أدوات نافعة ───*

${p}ترجم en النص    ⟵ ترجمة النص لأي لغة
${p}ترجم ar hello   ⟵ ترجمة للعربي
${p}مترجم تشغيل ar  ⟵ تشغيل الترجمة التلقائية
${p}مترجم ايقاف     ⟵ إيقاف الترجمة التلقائية
${p}ذكرني           ⟵ ضبط تذكير بمهمة
${p}منبه            ⟵ ضبط منبّه بوقت محدد
${p}رمزي            ⟵ عرض رمز QR الخاص بك`.trim()
  },
  economy: {
    title: '💰 الاقتصاد',
    text: (p) => `
*💰 ─── الاقتصاد ───*

${p}البنك        ⟵ رصيدك ومحفظتك وطاقتك
${p}ايداع 500    ⟵ إيداع عملات في البنك
${p}سحب 500      ⟵ سحب عملات من البنك
${p}تحويل @ش 500 ⟵ تحويل لشخص آخر (5٪ رسوم)
${p}عمل          ⟵ اعمل واكسب عملات (-10 طاقة)
${p}يومي         ⟵ مكافأة يومية مجانية
${p}طاقة         ⟵ حالة طاقتك ومعدل الشحن
${p}لفل          ⟵ ارفع مستواك`.trim()
  },
  info: {
    title: '👤 الحساب والمعلومات',
    text: (p) => `
*📊 ─── المعلومات ───*

${p}الضعوم     ⟵ حالة البوت ووقت التشغيل
${p}بروفايل    ⟵ ملفك ومعلوماتك
${p}رسائلي     ⟵ عدد رسائلك ونشاطك
${p}رسائل @شخص ⟵ عدد رسائل عضو
${p}ترتيب_الرسائل ⟵ أكثر الأعضاء تفاعلاً
${p}التوقيت    ⟵ التوقيت الحالي
${p}بلاغ       ⟵ إرسال بلاغ للمالك
${p}المالك     ⟵ معلومات مالك البوت`.trim()
  },
  media: {
    title: '🎧 الوسائط والتحميل',
    text: (p) => `
*🎧 ─── الوسائط والتحميل ───*

${p}شغل اسم/رابط       ⟵ تشغيل أغنية صوت من يوتيوب
${p}mp3 اسم/رابط       ⟵ تحميل أغنية MP3
${p}فيديو اسم/رابط     ⟵ تحميل فيديو من يوتيوب
${p}بنترست كلمة        ⟵ صور بنترست
${p}جوده               ⟵ رفع جودة الصورة`.trim()
  },
  productivity: {
    title: '📌 الإنتاجية والتنظيم',
    text: (p) => `
*📌 ─── الإنتاجية والتنظيم ───*

${p}مهمة نص المهمة       ⟵ إضافة مهمة
${p}مهامي               ⟵ عرض مهامك
${p}تم 1                ⟵ تعليم مهمة كمكتملة
${p}حذف_مهمة 1          ⟵ حذف مهمة
${p}ملاحظة نص           ⟵ حفظ ملاحظة
${p}ملاحظاتي            ⟵ عرض ملاحظاتك`.trim()
  },
  analytics: {
    title: '📊 التحليل والإحصاءات',
    text: (p) => `
*📊 ─── التحليل والإحصاءات ───*

${p}احصائياتي        ⟵ ملخص استخدامك
${p}ترتيب            ⟵ أعلى الأعضاء XP
${p}نشاط_القروب      ⟵ تقرير سريع عن القروب
${p}حالة_الاقسام     ⟵ إحصاء أقسام البوت`.trim()
  },
  safety: {
    title: '🛡️ السلامة والخصوصية',
    text: (p) => `
*🛡️ ─── السلامة والخصوصية ───*

${p}فحص_رابط الرابط   ⟵ فحص رابط مشبوه
${p}خصوصيتي          ⟵ نصائح حماية الحساب
${p}قواعد_امان       ⟵ قواعد أمان للقروب`.trim()
  },
  developer: {
    title: '💻 البرمجة والمطور',
    text: (p) => `
*💻 ─── البرمجة والمطور ───*

${p}كود js console.log(1)   ⟵ تنسيق كود
${p}json {"a":1}            ⟵ تنسيق JSON
${p}regex ^[0-9]+$ 123      ⟵ اختبار Regex
${p}مطور                  ⟵ أدوات ومعلومات للمطور`.trim()
  },
  wellness: {
    title: '🌱 الصحة والعادات',
    text: (p) => `
*🌱 ─── الصحة والعادات ───*

${p}ماء              ⟵ تذكير شرب الماء
${p}تنفس             ⟵ تمرين تنفس قصير
${p}استراحة          ⟵ اقتراح استراحة ذكية`.trim()
  },
  group: {
    title: '👥 إدارة القروب',
    text: (p) => `
*👥 ─── إدارة القروب ───*

${p}اسم_القروب الاسم      ⟵ تغيير اسم القروب
${p}وصف_القروب النص      ⟵ تغيير وصف القروب
${p}طرد @شخص            ⟵ طرد عضو
${p}اضف 967xxxxxxxx     ⟵ إضافة عضو
${p}رفع @شخص            ⟵ رفع مشرف
${p}خفض @شخص            ⟵ خفض مشرف
${p}قفل_القروب          ⟵ المشرفون فقط
${p}فتح_القروب          ⟵ السماح للجميع
${p}منشن_ظاهر النص      ⟵ منشن واضح للجميع
${p}منشن_مخفي النص      ⟵ منشن مخفي للجميع
${p}الحماية تشغيل       ⟵ تفعيل حماية الروابط
${p}الحماية ايقاف       ⟵ إيقاف حماية الروابط`.trim()
  },
  owner: {
    title: '👑 أوامر المالك',
    text: (p) => `
*👑 ─── أوامر المالك ───*

${p}addprem      ⟵ إضافة مستخدم مميز
${p}المميزين     ⟵ قائمة المميزين
${p}بان          ⟵ حظر مستخدم
${p}فك-الحظر     ⟵ رفع الحظر عن مستخدم
${p}البلوكات     ⟵ قائمة المحظورين
${p}حالة_البوت   ⟵ حالة وإعدادات البوت
${p}تشغيل        ⟵ تشغيل البوت في المحادثة
${p}ايقاف        ⟵ إيقاف البوت في المحادثة
${p}عام          ⟵ استقبال أوامر الجميع
${p}خاص          ⟵ أوامر المالك فقط
${p}قراءة تشغيل  ⟵ تفعيل قراءة الرسائل
${p}قراءة ايقاف  ⟵ إيقاف قراءة الرسائل
${p}إعادة        ⟵ إعادة تشغيل البوت`.trim()
  },
  all: {
    title: '📜 كل الأقسام',
    text: (p) => Object.values(sections)
      .filter(section => section.title !== '📜 كل الأقسام')
      .map(section => section.text(p))
      .join('\n\n')
  }
}

export const menuSections = Object.fromEntries(
  Object.entries(sections).map(([key, section], index) => [
    String(index + 1),
    { key, title: section.title, text: section.text }
  ])
)

export const menuPollSections = Object.fromEntries(
  Object.entries(sections).map(([, section]) => [section.title, section.text])
)

function buildStats(m, user, level, role, max, uptime) {
  const name = m.pushName || 'مستخدم'
  const money = user.money || 0
  const bank = user.bank || 0
  const energy = typeof user.energy === 'number' ? user.energy : 100
  const epct = Math.max(0, Math.min(10, Math.floor((energy / 100) * 10)))
  const ebar = '█'.repeat(epct) + '░'.repeat(10 - epct)

  return `
╔══〘 🌟 *SHADOW - Bot* 🌟 〙══╗
║
║  👤 *${name}*
║  🏆 المستوى: *${level}* │ ${role}
║  ⭐ XP: *${user.exp || 0} / ${max}*
║
║  ─── الأموال ───
║  💰 محفظة: *${money.toLocaleString('en')} 🪙*
║  🏦 بنك:   *${bank.toLocaleString('en')} 🪙*
║  💎 ماس:   *${user.diamond || 0}*
║
║  ─── الطاقة ───
║  ${ebar} ${energy}/100 ⚡
║
║  ⏱️ وقت التشغيل: *${uptime}*
║  🔗 *github.com/Farisatif*
║
╚══〘 👇 اختر رقم القسم 〙══╝`.trim()
}

function buildPageText(prefix) {
  return Object.entries(menuSections)
    .map(([num, section]) => `*${num}.* ${section.title}`)
    .join('\n')
}

async function sendPage(conn, m, prefix, stats) {
  const text = `${stats}\n\n${buildPageText(prefix)}\n\nأرسل رقم القسم فقط مثل: *1*\nلجميع الأقسام اختر رقم قسم *📜 كل الأقسام*.`
  await conn.sendMessage(m.chat, { image: global.imagen4, caption: text }, { quoted: m })
}

async function sendSection(conn, m, sectionKey, prefix, stats) {
  const section = sections[sectionKey]
  if (!section) return

  const text = `${stats}\n\n${section.text(prefix)}`
  await conn.sendMessage(m.chat, { text }, { quoted: m })
}

let handler = async (m, { conn, usedPrefix }) => {
  const user = global.db.data.users[m.sender] || {}
  initEconomy(user)
  syncEnergy(user)

  const { level = 1, role = 'مستخدم' } = user
  const { max } = xpRange(level, global.multiplier)
  const uptime = clockString(process.uptime() * 1000)
  const stats = buildStats(m, user, level, role, max, uptime)

  if (!global.menuSessions) global.menuSessions = {}
  global.menuSessions[m.sender] = {
    prefix: usedPrefix,
    page: 0,
    ts: Date.now()
  }

  await sendPage(conn, m, usedPrefix, stats)
}

handler.command = /^(اوامر|أوامر|الاوامر|الأوامر|كل_الاوامر|كل-الاوامر|المهام|مهام|menu|help|قائمة|القائمة|قائمه|القائمه)$/i
handler.exp = 0
handler.fail = null

handler.before = async (m, { conn }) => {
  const choice = normalizeChoice(m.text || '')
  if (menuSections[choice]) {
    const session = global.menuSessions?.[m.sender] || {}
    const prefix = session?.prefix || '.'
    const user = global.db.data.users[m.sender] || {}
    initEconomy(user)
    syncEnergy(user)
    const { level = 1, role = 'مستخدم' } = user
    const { max } = xpRange(level, global.multiplier)
    const uptime = clockString(process.uptime() * 1000)
    const stats = buildStats(m, user, level, role, max, uptime)
    await sendSection(conn, m, menuSections[choice].key, prefix, stats)
    if (global.menuSessions?.[m.sender]) delete global.menuSessions[m.sender]
    return true
  }

  return false
}

export default handler