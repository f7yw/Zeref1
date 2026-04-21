import { xpRange } from '../lib/levelling.js'
import { syncEnergy, initEconomy, getRole, isVip, fmt, fmtEnergy } from '../lib/economy.js'
import { typingDelay } from '../lib/presence.js'
import { getSubBotFeatures } from '../lib/jadibot.js'

function clockString(ms) {
  const h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
  const m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
  const s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}

function normalizeChoice(text = '') {
  const map = {
    '٠':'0','١':'1','٢':'2','٣':'3','٤':'4',
    '٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
    '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4',
    '۵':'5','۶':'6','۷':'7','۸':'8','۹':'9'
  }
  return text.trim().replace(/[٠-٩۰-۹]/g, d => map[d] || d).trim()
}

// ─────────────────────────────────────────────────────────────────────────────
// كل قسم يحمل featureTag يطابق وسوم (tags) البلجنز:
//   profile, islamic, game, economy, ai, media, main, group, owner
// عند استدعاء القائمة من بوت فرعي → تُعرض فقط الأقسام المسموح بها له.
const sections = {

  1: {
    title: '👤 التسجيل والبروفايل',
    emoji: '👤',
    featureTag: 'profile',
    commands: [
      'تسجيل          ← إنشاء حساب في البوت',
      'بروفايل         ← ملفك الشخصي الكامل',
      'رانك            ← ترتيبك بين الأعضاء',
      'احصائياتي       ← إحصائياتك التفصيلية',
      'احصائياتي_مفصل  ← تقرير أعمق',
      'مراجعة_البريم   ← فحص حالة VIP',
      'تقرير_المال     ← سجل عملياتك المالية',
      'معاملاتي        ← سجل تحويلاتك',
    ]
  },

  2: {
    title: '🕌 الديني والثقافي',
    emoji: '🕌',
    featureTag: 'islamic',
    commands: [
      'قران            ← آية قرآنية عشوائية',
      'آية الكرسي      ← آية الكرسي',
      'حديث            ← حديث نبوي شريف',
      'الله            ← أسماء الله الحسنى',
      'اذكار_الصباح    ← أذكار الصباح',
      'اذكار_المساء    ← أذكار المساء',
      'نصيحه           ← نصيحة إسلامية',
      'حكمه            ← حكمة يومية',
      'مقولات          ← مقولة مشهورة',
      'حظ              ← فال اليوم',
      'التوقيت [مدينة] ← توقيت أي مدينة',
      'بلاغ            ← إرسال بلاغ للمطور',
    ]
  },

  3: {
    title: '🎮 الألعاب والترفيه',
    emoji: '🎮',
    featureTag: 'game',
    commands: [
      '─── ألعاب استراتيجية ───',
      'شطرنج          ← لعبة شطرنج',
      'اكس             ← لعبة XO مع شخص',
      'اربعة / c4      ← أربعة بالصف',
      'حجره            ← حجرة ورقة مقص',
      '',
      '─── ألعاب ذكاء ───',
      'سوال            ← سؤال معلومات عامة',
      'علم             ← خمّن العلَم',
      'فزوره           ← فزورة',
      'تحدي            ← تحدي رياضيات',
      'شنقه            ← لعبة المشنقة (حرف بحرف)',
      'خمن_رقم        ← خمّن الرقم 1-100',
      'ايموجي          ← خمّن معنى الإيموجي',
      'كلمة / رتب      ← رتّب الحروف لكلمة',
      'ذاكرة           ← اختبار الذاكرة',
      'سرعة            ← حساب سريع',
      '',
      '─── ألعاب جماعية ───',
      'وصله            ← سلسلة الكلمات',
      'لو              ← لو جامعي/مهني/تقني/فلسفي',
      'رهان / slot      ← ماكينة الحظ',
      '',
      '─── ألعاب ذكاء جامعية ───',
      'منطق            ← لغز منطقي للمفكرين',
      'برمجه           ← تحدي البرمجة والتقنية',
      '',
      '─── أدوات ترفيهية ───',
      'نرد             ← رمي النرد',
      'عملة            ← قلب عملة',
      'اختار [خيارات]  ← البوت يختار عنك',
    ]
  },

  4: {
    title: '💰 الاقتصاد والمتجر',
    emoji: '💰',
    featureTag: 'economy',
    commands: [
      '─── الرصيد ───',
      'البنك           ← رصيدك الكامل',
      'يومي            ← مكافأة يومية مجانية',
      'عمل             ← اكسب عملات',
      'طاقة            ← شحن الطاقة',
      '',
      '─── البنك ───',
      'ايداع [مبلغ]    ← إيداع في البنك',
      'سحب [مبلغ]     ← سحب من البنك',
      'تحويل @ [مبلغ] ← تحويل لشخص آخر',
      '',
      '─── المتجر ───',
      'شراء_الماس [كمية] ← شراء ماس بعملات',
      'شراء_عملات [كمية] ← بيع ماس مقابل عملات',
      '',
      '─── المستوى ───',
      'لفل             ← رفع المستوى بالعملات',
      'رانك            ← ترتيبك',
    ]
  },

  5: {
    title: '🤖 الذكاء الاصطناعي والتعلم',
    emoji: '🤖',
    featureTag: 'ai',
    commands: [
      '─── الذكاء الاصطناعي ───',
      'ai [سؤال]       ← نموذج AI عام',
      'بوت [نص]        ← محادثة مع البوت',
      'شخصية [وصف]    ← حدد شخصية مخصصة',
      'ذكاء [سؤال]    ← سؤال ذكي',
      '',
      '─── التعلم والدراسة ───',
      'تعلم [موضوع]    ← خطة تعلم',
      'خطة [موضوع]     ← جدول دراسي',
      'تلخيص [نص]     ← تلخيص نص',
      'بطاقات [موضوع]  ← بطاقات تعليمية',
      'اختبرني [موضوع] ← اختبار ذاتي',
      'بومودورو        ← تقنية التركيز',
      'مصادر [موضوع]  ← مصادر تعليمية',
    ]
  },

  6: {
    title: '🎧 الوسائط والأدوات',
    emoji: '🎧',
    featureTag: 'media',
    commands: [
      '─── الصوت والفيديو ───',
      'شغل [اسم]       ← تشغيل أغنية من يوتيوب',
      'اغنيه [اسم]     ← تحميل صوت',
      'بحث_يوتيوب [نص] ← بحث في يوتيوب',
      '',
      '─── الصور ───',
      'بنترست [نص]     ← بحث صور Pinterest',
      'جوده            ← رفع جودة صورة',
      'ملصق            ← تحويل صورة/فيديو لملصق',
      '',
      '─── أدوات الوسائط ───',
      'تحميل_صوت [url]  ← استخراج صوت من رابط',
      'تحميل_فيديو [url] ← تنزيل فيديو من رابط',
      'معلومات_رابط [url] ← فحص المنصة والأمان',
      'تحويل_صيغة       ← صورة→ملصق / فيديو→صوت',
      'بحث_صورة [كلمة]  ← بحث صور Unsplash',
      '',
      '─── الأدوات ───',
      'ترجم [نص]       ← ترجمة لأي لغة',
      'مترجم           ← مترجم متقدم',
      'انطقي [نص]      ← تحويل نص لصوت (TTS)',
      'زخرفه [نص]      ← زخرفة النص',
      'احرف [نص]       ← تنسيقات مختلفة',
      'ocr             ← استخراج نص من صورة',
      '',
      '─── الصراحة ───',
      'صراحه           ← نشر صراحة مجهولة',
    ]
  },

  7: {
    title: '📋 الإنتاجية والأدوات',
    emoji: '📋',
    featureTag: 'main',
    commands: [
      '─── المهام ───',
      'مهمة [نص]       ← إضافة مهمة',
      'مهامي           ← قائمة مهامك',
      'تم [رقم]        ← تأشير مهمة منتهية',
      'حذف_مهمة [رقم] ← حذف مهمة',
      '',
      '─── الملاحظات ───',
      'ملاحظة [نص]     ← إضافة ملاحظة',
      'ملاحظاتي        ← قائمة ملاحظاتك',
      '',
      '─── التذكيرات ───',
      'ذكرني [وقت] [نص] ← تذكير مؤجل',
      'تعديل_تذكير    ← تعديل تذكير',
      'حذف_جميع_التذكيرات ← مسح كل التذكيرات',
      '',
      '─── الإحصاء ───',
      'ترتيب           ← الأعضاء حسب XP',
      'ترتيب_الرسائل   ← الأكثر نشاطاً',
      'رسائلي          ← عدد رسائلك',
      'نشاط_القروب     ← نشاط المجموعة',
      '',
      '─── أدوات المطور ───',
      'كود [نص]        ← تنسيق كود',
      'json [نص]       ← تنسيق JSON',
      'فحص_رابط [url] ← فحص أمان رابط',
      '',
      '─── الصحة ───',
      'ماء             ← تذكير شرب الماء',
      'تنفس            ← تمرين التنفس',
      'استراحة         ← استراحة ذكية',
    ]
  },

  8: {
    title: '👥 إدارة المجموعات',
    emoji: '👥',
    featureTag: 'group',
    commands: [
      '─── الأعضاء ───',
      'طرد @           ← طرد عضو',
      'طرد_متعدد @... ← طرد عدة دفعة',
      'طرد_الجميع     ← طرد كل غير المشرفين',
      'اضف [رقم]      ← إضافة عضو',
      'رفع @          ← ترقية لمشرف',
      'خفض @          ← خفض مشرف',
      'ترقية_متعددة @... ← ترقية عدة',
      'خفض_متعدد @... ← خفض عدة مشرفين',
      '',
      '─── المعلومات ───',
      'أعضاء           ← قائمة الأعضاء كاملة',
      'المشرفين        ← قائمة المشرفين',
      'احصائيات        ← تفاصيل المجموعة',
      'عدد_الاعضاء     ← إحصاء الأعضاء',
      'ارقام_الاعضاء  ← استخراج أرقام الكل',
      '',
      '─── الرابط ───',
      'رابط            ← رابط دعوة المجموعة',
      'تجديد_الرابط   ← رابط جديد (يلغي القديم)',
      '',
      '─── الإعدادات ───',
      'قفل_القروب      ← مشرفون فقط يرسلون',
      'فتح_القروب      ← الكل يرسل',
      'قفل_الإعدادات  ← يمنع تعديل المعلومات',
      'فتح_الإعدادات  ← يسمح للكل بالتعديل',
      'اسم_القروب [نص] ← تغيير اسم المجموعة',
      'وصف_القروب [نص] ← تغيير الوصف',
      'صورة_القروب     ← تغيير الصورة (مع صورة)',
      '',
      '─── الرسائل ───',
      'منشن_مخفي [نص] ← منشن مخفي للكل',
      'منشن_ظاهر [نص] ← منشن مع الأسماء',
      'منشن_مشرفين    ← تنبيه المشرفين',
      'رسالة_خاصة @ نص ← رسالة خاصة لعضو',
      'رسالة_جماعية نص ← بث لكل الأعضاء',
      'تثبيت           ← تثبيت رسالة (رُدّ عليها)',
      'الغاء_تثبيت    ← إلغاء تثبيت',
      '',
      '─── الترحيب ───',
      'رسالة_ترحيب نص ← تعيين رسالة الترحيب',
      'رسالة_وداع نص  ← تعيين رسالة الوداع',
      'تفعيل_ترحيب    ← تشغيل الترحيب التلقائي',
      'إيقاف_ترحيب    ← إيقاف الترحيب',
      '',
      '─── الحماية ───',
      'الحماية [تشغيل/ايقاف] ← حماية المجموعة',
      'تحذير @        ← تحذير عضو',
      'تحذيرات        ← سجل التحذيرات',
      'تنظيف          ← حذف رسائل البوت',
      '',
      'مغادرة_البوت   ← يغادر البوت القروب',
    ]
  },

  9: {
    title: '👑 أوامر المالك',
    emoji: '👑',
    featureTag: 'owner',
    commands: [
      'لوحة_التحكم    ← لوحة كاملة للإدارة',
      '',
      '─── المستخدمون ───',
      'عرض_مستخدم @   ← بيانات مستخدم',
      'قائمة_المستخدمين ← كل المسجلين',
      'اعادة_ضبط @    ← صفر بيانات مستخدم',
      'حذف_مستخدم @   ← حذف نهائي',
      '',
      '─── الاقتصاد ───',
      'اضافة_مال @ 1000  ← إضافة عملات',
      'اضافة_بنك @ 1000  ← إضافة بنك',
      'اضافة_ماس @ 10    ← إضافة ماس',
      'تعديل_مستوى @ 5   ← تعديل المستوى',
      '',
      '─── العضوية ───',
      'addprem @       ← منح VIP',
      'حذف_بريم @     ← سحب VIP',
      'listprem        ← قائمة المميزين',
      '',
      '─── الحماية ───',
      'بان @           ← حظر مستخدم',
      'الغاء_بان @    ← رفع الحظر',
      'بلوك @          ← بلوك مستخدم',
      'فك_البلوك @    ← رفع البلوك',
      '',
      '─── النظام ───',
      'حالة_السحاب    ← حالة Supabase',
      'مزامنة_السحاب  ← حفظ فوري للسحاب',
      'نسخة_احتياطية  ← تنزيل نسخة احتياطية',
      'اخطاء          ← آخر أخطاء البوت',
      'احصائيات_القروب ← إحصاء كامل للقروب',
      'تعطيل_بوت / تفعيل_بوت ← تشغيل/إيقاف في القروب',
      'انضم [رابط]    ← دخول مجموعة',
      '',
      '─── ربط الهوية ───',
      'ليد [رقمك]     ← ربط LID JID برقم الهاتف (لتعريفك كمطور)',
      'رقمي / setlid  ← اختصار نفس الأمر',
      '',
      '─── الجلسة والإقران ───',
      'مسح_الجلسة تأكيد ← مسح الجلسة وإعادة توليد كود إقران',
      '                    (الكود يُعرض على /pairing-code)',
      '',
      '─── البوتات الفرعية (Jadibot) ───',
      'بوت_فرعي [رقم]                  ← إنشاء بوت فرعي + كود إقران',
      'ازالة_بوت_فرعي [رقم]            ← حذف بوت فرعي كاملاً',
      'قائمة_البوتات_الفرعية           ← عرض كل البوتات + المزايا + حالة الاتصال',
      'مزايا_البوت [رقم] [tags]        ← تحديد ميزات بوت فرعي',
      '   مثال: مزايا_البوت 9677xxxx game,islamic,profile',
      '   📌 جلسات البوتات الفرعية تُحفَظ تلقائياً في السحاب (Supabase)',
      '       وتُستعاد بعد كل إعادة تشغيل دون الحاجة لإعادة الإقران.',
    ]
  },

  10: {
    title: '🔧 تحكم البوت والحساب',
    emoji: '🔧',
    featureTag: 'owner',
    commands: [
      'تحكم_البوت     ← لوحة شاملة للتحكم',
      '',
      '─── معلومات ───',
      'وقت_التشغيل    ← وقت التشغيل + ذاكرة',
      'رام             ← استخدام الذاكرة',
      'تقرير_البوت    ← تقرير شامل',
      '',
      '─── إعدادات البوت ───',
      'اسم_البوت [اسم]       ← تغيير اسم الحساب',
      'وصف_البوت [نص]        ← تغيير النبذة',
      'صورة_البوت            ← تغيير الصورة',
      'تغيير_البادئة [رمز]   ← تغيير بادئة الأوامر',
      'تفعيل_الكل            ← تفعيل في الكل',
      'ايقاف_الكل            ← إيقاف في الكل',
      'مسح_الذاكرة           ← تنظيف الكاش',
      'إعادة_تشغيل           ← إعادة تشغيل',
      'رد_تلقائي [تشغيل/ايقاف] ← الرد التلقائي',
      '',
      '─── البث ───',
      'قائمة_القروبات         ← كل القروبات',
      'بث_للقروبات [رسالة]   ← إرسال لكل القروبات',
      'بث_للكل [رسالة]       ← إرسال لكل المحادثات',
      '',
      '─── الخصوصية ───',
      'خصوصية_المشاهدة [كل/جهات/لا_أحد]',
      'خصوصية_الصورة   [كل/جهات/لا_أحد]',
      'خصوصية_الحالة   [كل/جهات/لا_أحد]',
      'خصوصية_المجموعات [كل/جهات/لا_أحد]',
      'جميع_الخصوصية   [كل/جهات/لا_أحد]',
      '',
      '─── الحساب ───',
      'نشر_حالة [نص]         ← نشر حالة واتساب',
      'حضور_دائم             ← ظهور متاح دائماً',
      'حضور_إيقاف            ← إيقاف الحضور الدائم',
      'رفض_المكالمات         ← حجب المكالمات',
      'قبول_المكالمات        ← قبول المكالمات',
      'الأجهزة_المرتبطة      ← الأجهزة المرتبطة',
    ]
  }
}

// ─────────────────────────────────────────────────────────────────────────────
function buildHeader(m, user, level, role, max, uptime, vipStatus) {
  const name = user.name || m.pushName || 'مستخدم'
  const bar = (() => {
    const { max: xMax } = xpRange(level, global.multiplier)
    const pct = Math.min(10, Math.floor(((user.exp || 0) / Math.max(xMax, 1)) * 10))
    return '█'.repeat(pct) + '░'.repeat(10 - pct)
  })()
  return (
`╭────『 🤖 *ZEREF BOT* 』────
│
│ 👤 ${name}
│ 🏆 المستوى: ${level}  (${role})
│ ${bar}  ${user.exp || 0}/${max} XP
│ 💰 ${fmt(user.money)}  🏦 ${fmt(user.bank)}  💎 ${user.diamond || 0}
│ ⚡ ${fmtEnergy(user, m.sender)}
│ ${vipStatus}
│ 🕒 ${uptime}
╰──────────────────`).trim()
}

/**
 * يعيد قائمة الأقسام المسموح بها للاتصال الحالي.
 * البوت الرئيسي → كل الأقسام.
 * البوت الفرعي  → فقط الأقسام التي تطابق وسوم مزاياه (features) + قسم البوتات الفرعية إن وُجد.
 */
function getAllowedSections(conn) {
  const isSubBot = !!conn?.__subBotPhone
  if (!isSubBot) return sections

  let allowed = []
  try { allowed = getSubBotFeatures(conn.__subBotPhone) || [] } catch (_) {}
  // owner لا يُعطى تلقائياً لبوت فرعي إلا لو حدّده المطور
  const allowSet = new Set(allowed.map(s => String(s).toLowerCase()))

  const filtered = {}
  let i = 1
  for (const s of Object.values(sections)) {
    const tag = String(s.featureTag || '').toLowerCase()
    if (!tag) continue
    if (!allowSet.has(tag)) continue
    filtered[i++] = s
  }
  return filtered
}

function buildIndex(header, vipStatus, sectionsToShow, isSubBot, subPhone, allowedFeatures) {
  const entries = Object.entries(sectionsToShow)
  if (!entries.length) {
    return `${header}\n\n📭 *لا توجد أقسام متاحة لهذا البوت الفرعي.*\n\nاطلب من المطور تفعيل المزايا عبر:\n*مزايا_البوت ${subPhone || '<رقم>'} <tags>*`
  }
  const lines = entries
    .map(([k, s]) => `  *${k}.* ${s.emoji}  ${s.title.replace(/^[^ ]+ /, '')}`)
    .join('\n')
  const subLine = isSubBot
    ? `\n\n🤖 *بوت فرعي:* +${subPhone}\n🧩 *المزايا المُفعَّلة:* ${(allowedFeatures || []).join(' • ') || '—'}`
    : ''
  return `${header}${subLine}\n\n*📋 اختر قسماً — ردّ (Reply) على هذه الرسالة برقم القسم:*\n\n${lines}\n\n_↩️ ردّ على الرسالة باختيارك_`.trim()
}

function buildSection(id, header, vipStatus, sectionsToShow = sections) {
  const section = sectionsToShow[id]
  if (!section) return null
  const cmds = section.commands.map(c =>
    c.startsWith('─') || c === '' ? (c === '' ? '│' : `│\n│ ${c}`) : `│ • ${c}`
  ).join('\n')
  return (
`${header}

╭────『 ${section.title} 』────
${cmds}
│
╰──────────────────

_👤 ${vipStatus}_`).trim()
}

// ─────────────────────────────────────────────────────────────────────────────
let handler = async (m, { conn, usedPrefix }) => {
  const user = global.db.data.users[m.sender] || {}
  initEconomy(user, m.sender)
  syncEnergy(user, m.sender)

  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const level  = user.level || 0
  const role   = getRole(level)
  const { max } = xpRange(level, global.multiplier)
  const uptime = clockString(process.uptime() * 1000)
  const header = buildHeader(m, user, level, role, max, uptime, vipStatus)

  const isSubBot = !!conn?.__subBotPhone
  const subPhone = conn?.__subBotPhone || null
  const allowedFeatures = isSubBot ? (getSubBotFeatures(subPhone) || []) : null
  const sectionsToShow = getAllowedSections(conn)
  const menu = buildIndex(header, vipStatus, sectionsToShow, isSubBot, subPhone, allowedFeatures)

  global.menuSessions ??= {}

  await typingDelay(conn, m.chat, 500)
  const pp = await conn.profilePictureUrl(m.sender, 'image').catch(() => './src/avatar_contact.png')
  const sent = await conn.sendMessage(m.chat, { image: { url: pp }, caption: menu }, { quoted: m })

  global.menuSessions[m.sender] = {
    ts: Date.now(),
    msgId: sent?.key?.id || null,
    chat: m.chat,
    isSubBot,
    subPhone
  }
}

handler.all = async function (m) {
  const session = global.menuSessions?.[m.sender]
  if (!session) return

  const quotedId = m.quoted?.id || m.message?.extendedTextMessage?.contextInfo?.stanzaId
  if (!quotedId || quotedId !== session.msgId) return

  const raw = (m.text || '').trim()
  if (!raw || /^[./#!\u0600-\u06FF]/.test(raw)) return

  const choice = normalizeChoice(raw)
  const sectionsToShow = getAllowedSections(this)
  if (!sectionsToShow[choice]) return

  if (Date.now() - session.ts > 5 * 60 * 1000) {
    delete global.menuSessions[m.sender]
    await this.reply(
      m.chat,
      `⏰ *انتهت صلاحية القائمة!*\n\nلقد مضى أكثر من 5 دقائق على إرسال القائمة.\nأرسل الأمر مجدداً للحصول على قائمة جديدة 🔄`,
      m
    )
    return
  }

  const user = global.db.data.users[m.sender] || {}
  initEconomy(user, m.sender)
  syncEnergy(user, m.sender)

  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const level  = user.level || 0
  const role   = getRole(level)
  const { max } = xpRange(level, global.multiplier)
  const uptime = clockString(process.uptime() * 1000)
  const header = buildHeader(m, user, level, role, max, uptime, vipStatus)

  const text = buildSection(choice, header, vipStatus, sectionsToShow)
  if (text) {
    await this.reply(m.chat, text, m)
    delete global.menuSessions[m.sender]
  }
}

handler.help = ['menu', 'الاوامر']
handler.tags = ['main']
handler.command = /^(menu|الاوامر|أوامر|اوامر|قائمة|قائمه|help)$/i
export default handler
