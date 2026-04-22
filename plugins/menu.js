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
    audience: 'all', menu: 'main',
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
    audience: 'all', menu: 'main',
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
    audience: 'all', menu: 'main',
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
      'مافيا           ← لعبة المافيا الاجتماعية',
      'انضم_مافيا      ← انضمام للعبة مافيا قائمة',
      'تحدي_حجره       ← حجرة ورقة مقص بين لاعبَين',
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
    audience: 'all', menu: 'main',
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
    audience: 'all', menu: 'main',
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
    audience: 'all', menu: 'main',
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
      '',
      '─── أزرار تفاعلية ───',
      'ازرار           ← قالب أزرار سريع تجريبي',
    ]
  },

  7: {
    title: '📋 الإنتاجية والأدوات',
    emoji: '📋',
    featureTag: 'main',
    audience: 'all', menu: 'main',
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
    audience: 'admin', menu: 'group',
    // الأوامر تُقسَّم حسب الصلاحية:
    //   memberCommands → يراها العضو العادي والمشرف والمطور
    //   adminCommands  → يراها المشرف والمطور فقط
    memberCommands: [
      '─── معلومات المجموعة ───',
      'أعضاء           ← قائمة الأعضاء كاملة',
      'المشرفين        ← قائمة المشرفين',
      'احصائيات        ← تفاصيل المجموعة',
      'عدد_الاعضاء     ← إحصاء الأعضاء',
      'ارقام_الاعضاء  ← استخراج أرقام الكل',
      'رابط            ← رابط دعوة المجموعة (للعرض)',
      '',
      '─── تفاعل عام ───',
      'منشن_مشرفين    ← تنبيه المشرفين',
      'تحذيرات         ← عرض سجل التحذيرات',
    ],
    adminCommands: [
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
      '─── الرابط ───',
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
      'رسالة_خاصة @ نص ← رسالة خاصة لعضو',
      'رسالة_جماعية نص ← بث لكل الأعضاء',
      'تثبيت           ← تثبيت رسالة (رُدّ عليها)',
      'الغاء_تثبيت    ← إلغاء تثبيت',
      '',
      '─── الترحيب والوداع ───',
      'ترحيب              ← عرض/إعدادات ترحيب القروب',
      'ترحيب تشغيل|ايقاف ← تفعيل/إيقاف الترحيب',
      'ترحيب نص <رسالة>  ← تخصيص نص الترحيب',
      'ترحيب افتراضي     ← استرجاع النص الافتراضي',
      'ترحيب تجربة       ← معاينة فوريّة',
      'وداع تشغيل|ايقاف  ← نفس الشيء لرسالة الوداع',
      'وداع نص <رسالة>   ← تخصيص نص الوداع',
      '   متغيّرات: {user} {name} {number} {group} {desc} {count} {bot}',
      '',
      '─── الحماية ───',
      'الحماية [تشغيل/ايقاف] ← مكافحة الروابط/الإعلانات',
      'تحذير @        ← تحذير عضو',
      'تنظيف          ← حذف رسائل البوت',
      'احذف (بالرد)   ← حذف رسالة محدّدة',
      '',
      'مغادرة_البوت   ← يغادر البوت القروب',
    ]
  },

  9: {
    title: '👑 أوامر المالك',
    emoji: '👑',
    featureTag: 'owner',
    audience: 'owner', menu: 'dev',
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
    audience: 'owner', menu: 'dev',
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
  },

  11: {
    title: '🎓 وسيط طلاب الجامعة',
    emoji: '🎓',
    featureTag: 'mediator',
    audience: 'owner', menu: 'dev',
    commands: [
      '─── إدارة الطلاب ───',
      'طلاب اضف <رقم> [اسم]   ← تسجيل طالب جديد',
      'طلاب حذف <رقم>          ← حذف طالب',
      'طلاب قائمة              ← عرض كل الطلاب المسجلين',
      'طلاب بحث <اسم/رقم>     ← البحث عن طالب',
      'طلاب تجميع <مجموعة>    ← تصنيف طالب لمجموعة (شُعبة/سنة)',
      '',
      '─── إدارة المجموعات الطلابية ───',
      'مجموعات_الطلاب اضف <jid>  ← ربط قروب طلابي',
      'مجموعات_الطلاب حذف <jid>  ← فك الربط',
      'مجموعات_الطلاب قائمة       ← عرض كل القروبات المربوطة',
      '',
      '─── المراسلة غير المباشرة ───',
      'رسالة_لطالب @ <نص>       ← إرسال رسالة لطالب باسم البوت',
      'رسالة_للطلاب <نص>         ← إرسال للجميع (DM فردي)',
      'رسالة_لمجموعة <اسم> <نص>  ← إرسال لمجموعة طلابية',
      'بث_للطلاب <نص>            ← بث رسمي لكل القروبات الطلابية',
      'اعلان <نص>                ← إعلان رسمي مزخرف لكل القروبات',
      '',
      '─── تتبع الردود ───',
      'صندوق_الطلاب              ← عرض ردود الطلاب الواردة',
      'رد_على_طالب <رقم> <نص>   ← الرد على رسالة من الصندوق',
      'تصفير_صندوق               ← مسح صندوق الردود',
      '',
      '─── إعدادات الوسيط ───',
      'وسيط_الطلاب                ← لوحة الإعدادات',
      'وسيط_الطلاب تشغيل|ايقاف   ← تفعيل/إيقاف الوسيط',
      'وسيط_الطلاب توقيع <نص>    ← توقيع تلقائي يُذيَّل في كل رسالة',
      'وسيط_الطلاب اخفاء_المصدر  ← الرسائل تُرسل بهوية البوت فقط',
      '',
      '🔒 *هذا القسم يظهر للمطور فقط*',
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
/**
 * يعيد الأقسام المسموح بها بناءً على:
 *   1) إن كان البوت فرعياً → يفلتر حسب featureTag مقابل مزايا البوت الفرعي.
 *   2) audience لكل قسم:
 *        - 'owner' → يظهر للمطور فقط
 *        - 'admin' → يظهر لمشرفي القروب أو المطور
 *        - 'all'   → يظهر للجميع
 */
/**
 * يرجع الأقسام المسموح عرضها بناءً على:
 *  - menuKind: 'main' | 'group' | 'dev' (أي قائمة طُلبت)
 *  - isOwner / isAdmin (صلاحيات المستخدم)
 *  - isSubBot (يفلتر بالـ featureTag)
 */
function getAllowedSections(conn, { isOwner = false, isAdmin = false, isGroup = false, menuKind = 'main' } = {}) {
  const isSubBot = !!conn?.__subBotPhone
  let pool = Object.values(sections)

  // فلترة بمزايا البوت الفرعي
  if (isSubBot) {
    let allowed = []
    try { allowed = getSubBotFeatures(conn.__subBotPhone) || [] } catch (_) {}
    const allowSet = new Set(allowed.map(s => String(s).toLowerCase()))
    pool = pool.filter(s => allowSet.has(String(s.featureTag || '').toLowerCase()))
  }

  // فلترة بنوع القائمة:
  //   • main  → نعرض كل الأقسام التي يستحقها المستخدم (audience)
  //             أقسام القروب تظهر فقط داخل قروب
  //             أقسام المطور تظهر فقط للمطور
  //   • group → فقط أقسام menu='group'
  //   • dev   → فقط أقسام menu='dev'
  if (menuKind === 'group') {
    pool = pool.filter(s => String(s.menu || 'main') === 'group')
  } else if (menuKind === 'dev') {
    pool = pool.filter(s => String(s.menu || 'main') === 'dev')
  } else {
    // main: لا نقيّد بـ s.menu — نعتمد على audience + isGroup
    pool = pool.filter(s => {
      const aud = String(s.audience || 'all').toLowerCase()
      const m = String(s.menu || 'main')
      if (m === 'group' && !isGroup) return false  // لا نظهر أقسام القروب في الخاص
      if (aud === 'owner') return isOwner
      if (aud === 'admin') return isOwner || isAdmin
      return true
    })
  }

  // فلترة بالصلاحية للأقسام المتبقية (تطبق أيضاً على group/dev)
  pool = pool.filter(s => {
    const aud = String(s.audience || 'all').toLowerCase()
    if (aud === 'owner') return isOwner
    if (aud === 'admin') return isOwner || isAdmin
    return true
  })

  // إعادة ترقيم
  const filtered = {}
  let i = 1
  for (const s of pool) filtered[i++] = s
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

function buildSection(id, header, vipStatus, sectionsToShow = sections, ctx = {}) {
  const section = sectionsToShow[id]
  if (!section) return null
  // اختيار الأوامر حسب الصلاحية إذا كان القسم مقسّم admin/member
  let cmds = section.commands
  if (Array.isArray(section.memberCommands) || Array.isArray(section.adminCommands)) {
    if (ctx.isOwner || ctx.isAdmin) {
      cmds = [...(section.memberCommands || []), '', ...(section.adminCommands || [])]
    } else {
      cmds = section.memberCommands || []
    }
  }
  const text = (cmds || []).map(c =>
    c.startsWith('─') || c === '' ? (c === '' ? '│' : `│\n│ ${c}`) : `│ • ${c}`
  ).join('\n')
  return (
`${header}

╭────『 ${section.title} 』────
${text}
│
╰──────────────────

_👤 ${vipStatus}_`).trim()
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// تحديد نوع القائمة من الأمر المستخدم
function detectMenuKind(command = '') {
  const c = String(command).toLowerCase().trim()
  if (/(قائمة[_\s]?المطور|menu[_\s]?dev|dev[_\s]?menu|أوامر[_\s]?المطور|اوامر[_\s]?المطور)/.test(c)) return 'dev'
  if (/(قائمة[_\s]?القروب|قائمة[_\s]?المجموعة|menu[_\s]?group|group[_\s]?menu|اوامر[_\s]?القروب|أوامر[_\s]?القروب)/.test(c)) return 'group'
  return 'main'
}

let handler = async (m, { conn, command, usedPrefix, isOwner, isAdmin, isROwner }) => {
  const ownerFlag = !!(isOwner || isROwner)
  const adminFlag = !!isAdmin
  const menuKind = detectMenuKind(command)

  // حراسات الوصول
  if (menuKind === 'dev' && !ownerFlag) {
    return m.reply('🔒 *قائمة المطور* مخصصة للمطور فقط.')
  }
  if (menuKind === 'group' && !m.isGroup) {
    return m.reply('👥 *قائمة القروب* تُستدعى من داخل المجموعة فقط.\n\nللاستخدام في الخاص جرّب: *قائمة* أو *قائمة_المطور*')
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

  const isSubBot = !!conn?.__subBotPhone
  const subPhone = conn?.__subBotPhone || null
  const allowedFeatures = isSubBot ? (getSubBotFeatures(subPhone) || []) : null

  const sectionsToShow = getAllowedSections(conn, {
    isOwner: ownerFlag,
    isAdmin: adminFlag,
    isGroup: !!m.isGroup,
    menuKind
  })

  if (!Object.keys(sectionsToShow).length) {
    const hint = menuKind === 'group'
      ? '📭 لا توجد أقسام متاحة لك في هذه المجموعة.'
      : menuKind === 'dev'
        ? '📭 لا توجد أقسام مطور متاحة.'
        : '📭 لا توجد أقسام متاحة في القائمة الرئيسية.'
    return m.reply(hint)
  }

  const titleByKind = {
    main:  '📋 *القائمة الرئيسية*',
    group: '👥 *قائمة القروب*' + (adminFlag || ownerFlag ? ' — مشرف' : ' — عضو'),
    dev:   '👑 *قائمة المطور*'
  }
  const indexBody = buildIndex(header, vipStatus, sectionsToShow, isSubBot, subPhone, allowedFeatures)
  const finalMenu = `${titleByKind[menuKind]}\n\n${indexBody}`

  global.menuSessions ??= {}

  await typingDelay(conn, m.chat, 500)
  const pp = await conn.profilePictureUrl(m.sender, 'image').catch(() => './src/avatar_contact.png')
  const sent = await conn.sendMessage(m.chat, { image: { url: pp }, caption: finalMenu }, { quoted: m })

  global.menuSessions[m.sender] = {
    ts: Date.now(),
    msgId: sent?.key?.id || null,
    chat: m.chat,
    isSubBot,
    subPhone,
    isOwner: ownerFlag,
    isAdmin: adminFlag,
    isGroup: !!m.isGroup,
    menuKind,
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
  const sectionsToShow = getAllowedSections(this, {
    isOwner: !!session.isOwner,
    isAdmin: !!session.isAdmin,
    isGroup: !!session.isGroup,
    menuKind: session.menuKind || 'main'
  })
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

  const text = buildSection(choice, header, vipStatus, sectionsToShow, {
    isOwner: !!session.isOwner,
    isAdmin: !!session.isAdmin,
  })
  if (text) {
    await this.reply(m.chat, text, m)
    delete global.menuSessions[m.sender]
  }
}

handler.help = ['menu', 'الاوامر', 'قائمة_القروب', 'قائمة_المطور']
handler.tags = ['main']
handler.command = /^(menu|الاوامر|أوامر|اوامر|قائمة|قائمه|help|قائمة[_\s]?القروب|قائمة[_\s]?المجموعة|اوامر[_\s]?القروب|أوامر[_\s]?القروب|menu[_\s]?group|group[_\s]?menu|قائمة[_\s]?المطور|اوامر[_\s]?المطور|أوامر[_\s]?المطور|menu[_\s]?dev|dev[_\s]?menu)$/i
export default handler
