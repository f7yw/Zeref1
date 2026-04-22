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
// تعليمات الأقسام:
//   • title       — عنوان القسم
//   • emoji       — رمز يظهر في الفهرس
//   • desc        — وصف قصير في رأس القسم (سطر واحد)
//   • featureTag  — يطابق وسوم البلجنز (للبوتات الفرعية)
//   • audience    — 'all' | 'admin' | 'owner'
//   • menu        — 'main' | 'group' | 'dev'
//   • commands    — أسطر الأوامر؛ السطر يبدأ بـ ▸ يُعتبر عنواناً فرعياً،
//                   والسطر الفارغ يُترك مسافة بصرية.
// ─────────────────────────────────────────────────────────────────────────────
const sections = {

  1: {
    title: '👤 البروفايل والحساب',
    emoji: '👤',
    desc: 'تسجيلك، إحصاءاتك، رتبتك',
    featureTag: 'profile',
    audience: 'all', menu: 'main',
    commands: [
      '▸ الحساب',
      'تسجيل           إنشاء حساب جديد',
      'بروفايل         ملفّك الشخصي الكامل',
      '',
      '▸ الإحصاءات',
      'رانك            ترتيبك بين الأعضاء',
      'احصائياتي       إحصاءاتك التفصيلية',
      'احصائياتي_مفصل  تقرير أعمق',
      '',
      '▸ السجلات',
      'تقرير_المال     سجل عملياتك المالية',
      'معاملاتي        سجل تحويلاتك بين البنك والمحفظة',
    ]
  },

  2: {
    title: '🕌 الديني والثقافي',
    emoji: '🕌',
    desc: 'قرآن، أذكار، حِكم، أوقات',
    featureTag: 'islamic',
    audience: 'all', menu: 'main',
    commands: [
      '▸ القرآن والسنّة',
      'قران             آية قرآنية عشوائية',
      'آية_الكرسي       آية الكرسي كاملة',
      'حديث             حديث نبوي شريف',
      'الله             أسماء الله الحسنى',
      '',
      '▸ الأذكار',
      'اذكار_الصباح     أذكار الصباح',
      'اذكار_المساء     أذكار المساء',
      '',
      '▸ المواعيد',
      'مواعيد_الصلاة <مدينة>   أوقات الصلاة',
      'التوقيت <مدينة>         توقيت أي مدينة',
      'تاريخ                    التاريخ الميلادي + الهجري',
      '',
      '▸ حِكَم وثقافة',
      'نصيحه            نصيحة إسلامية',
      'حكمه             حكمة يومية',
      'مقولات           مقولة مشهورة',
      'حظ               فال اليوم',
      '',
      '▸ تواصل',
      'بلاغ <نص>        إرسال بلاغ للمطور',
    ]
  },

  3: {
    title: '🎮 الألعاب والترفيه',
    emoji: '🎮',
    desc: 'ألعاب فردية وجماعية، ذكاء، حظ',
    featureTag: 'game',
    audience: 'all', menu: 'main',
    commands: [
      '▸ ألعاب استراتيجية',
      'شطرنج           لعبة شطرنج كاملة',
      'اكس             XO ضد لاعب آخر',
      'اربعة / c4      أربعة بالصف',
      'حجره            حجرة ورقة مقص',
      '',
      '▸ ألعاب ذكاء',
      'سوال            سؤال معلومات عامة',
      'علم             خمّن العلَم',
      'فزوره           فزّورة',
      'تحدي            تحدي رياضيات',
      'شنقه            لعبة المشنقة',
      'خمن_رقم         خمّن الرقم 1-100',
      'ايموجي          خمّن معنى الإيموجي',
      'كلمة / رتب      رتّب الحروف لكلمة',
      'ذاكرة           اختبار الذاكرة',
      'سرعة            حساب سريع',
      '',
      '▸ ألعاب جماعية',
      'مافيا           لعبة المافيا الاجتماعية',
      'انضم_مافيا      الانضمام للعبة قائمة',
      'وصله            سلسلة الكلمات',
      'لو              "لو" جامعي/مهني/تقني/فلسفي',
      'تحدي_حجره       حجرة ورقة مقص ضد لاعب',
      '',
      '▸ ألعاب فكرية متقدّمة',
      'منطق            لغز منطقي للمفكّرين',
      'برمجه           تحدي برمجة وتقنية',
      '',
      '▸ حظ وترفيه',
      'رهان / slot     ماكينة الحظ',
      'نرد             رمي النرد',
      'عملة            قلب عملة',
      'اختار <خيارات>  البوت يختار عنك',
      'عشوائي <حد>     رقم عشوائي',
      '',
      '▸ متنوّعات',
      'هل_تعلم         معلومة عشوائية',
      'نكته            نكتة عربية',
      'قصة             قصة قصيرة ملهمة',
      'قصيدة           من عيون الشعر العربي',
      'عمري <سنة>      حاسبة العمر',
      'طقس <مدينة>     حالة الطقس الحالية',
    ]
  },

  4: {
    title: '💰 الاقتصاد والمتجر',
    emoji: '💰',
    desc: 'العملات، البنك، المتجر، المستوى',
    featureTag: 'economy',
    audience: 'all', menu: 'main',
    commands: [
      '▸ الرصيد والأرباح',
      'البنك            رصيدك الكامل',
      'يومي             مكافأة يومية مجانية',
      'عمل              اكسب عملات',
      'طاقة             شحن الطاقة',
      '',
      '▸ عمليات بنكية',
      'ايداع <مبلغ>      إيداع في البنك',
      'سحب <مبلغ>        سحب من البنك',
      'تحويل @ <مبلغ>    تحويل لشخص آخر',
      '',
      '▸ المتجر',
      'شراء_الماس <كمية>   شراء ماس بالعملات',
      'شراء_عملات <كمية>   بيع ماس مقابل عملات',
      '',
      '▸ المستوى',
      'لفل              ترقية المستوى بالعملات',
      'رانك             ترتيبك بين الجميع',
    ]
  },

  5: {
    title: '🤖 الذكاء الاصطناعي والتعلّم',
    emoji: '🤖',
    desc: 'محادثات AI، خطط دراسة، اختبارات',
    featureTag: 'ai',
    audience: 'all', menu: 'main',
    commands: [
      '▸ الذكاء الاصطناعي',
      'ai <سؤال>        نموذج AI عام',
      'بوت <نص>         محادثة طبيعية',
      'شخصية <وصف>      شخصية مخصّصة للبوت',
      'ذكاء <سؤال>      سؤال ذكي عميق',
      '',
      '▸ خطط الدراسة',
      'تعلم <موضوع>     خطة تعلّم متدرّجة',
      'خطة <موضوع>      جدول دراسي زمني',
      'مصادر <موضوع>    مصادر تعليمية موثّقة',
      '',
      '▸ المراجعة الذاتية',
      'تلخيص <نص>       تلخيص فقرة طويلة',
      'بطاقات <موضوع>   بطاقات مراجعة',
      'اختبرني <موضوع>  اختبار ذاتي تفاعلي',
      '',
      '▸ تقنيات التركيز',
      'بومودورو         تقنية البومودورو 25/5',
    ]
  },

  6: {
    title: '🎧 الوسائط والصوتيات',
    emoji: '🎧',
    desc: 'تحميل، تحويل، بحث، ملصقات',
    featureTag: 'media',
    audience: 'all', menu: 'main',
    commands: [
      '▸ صوت ويوتيوب',
      'شغل <اسم>          تشغيل أغنية من يوتيوب',
      'mp3 / اغنيه <اسم>  تنزيل صوت',
      'بحث_يوتيوب <نص>    بحث في يوتيوب',
      '',
      '▸ صور',
      'بنترست <نص>        بحث صور Pinterest',
      'بحث_صورة <كلمة>    بحث صور Unsplash',
      'جوده               رفع جودة الصورة',
      'ملصق               تحويل صورة/فيديو لملصق',
      '',
      '▸ تحميل وتحويل',
      'تحميل_صوت <رابط>     استخراج صوت من رابط',
      'تحميل_فيديو <رابط>   تنزيل فيديو من رابط',
      'معلومات_رابط <رابط>  فحص المنصة والأمان',
      'تحويل_صيغة           صورة→ملصق / فيديو→صوت',
      '',
      '▸ نصوص ولغة',
      'ترجم <نص>          ترجمة لأي لغة',
      'مترجم              مترجم متقدّم',
      'انطقي <نص>         تحويل نص لصوت (TTS)',
      'زخرفه <نص>         زخرفة عربية للنص',
      'احرف <نص>          تنسيقات حروف مختلفة',
      'ocr                استخراج نص من صورة',
      '',
      '▸ تفاعلي',
      'صراحه              نشر صراحة مجهولة',
      'ازرار              قالب أزرار سريع تجريبي',
    ]
  },

  7: {
    title: '⚒️ الإنتاجية والأدوات',
    emoji: '⚒️',
    desc: 'مهام، ملاحظات، تذكيرات، صحّة',
    featureTag: 'main',
    audience: 'all', menu: 'main',
    commands: [
      '▸ المهام',
      'مهمة <نص>          إضافة مهمة',
      'مهامي              قائمة مهامك',
      'تم <رقم>           تأشير مهمة منتهية',
      'حذف_مهمة <رقم>    حذف مهمة',
      '',
      '▸ الملاحظات',
      'ملاحظة <نص>        إضافة ملاحظة',
      'ملاحظاتي           قائمة ملاحظاتك',
      '',
      '▸ التذكيرات',
      'ذكرني <وقت> <نص>          تذكير مؤجَّل',
      'تعديل_تذكير               تعديل تذكير قائم',
      'حذف_جميع_التذكيرات        مسح كل التذكيرات',
      '',
      '▸ إحصاءات شخصية',
      'ترتيب              الأعضاء حسب XP',
      'ترتيب_الرسائل      الأكثر نشاطاً',
      'رسائلي             عدد رسائلك',
      'نشاط_القروب        نشاط المجموعة الحالية',
      '',
      '▸ أدوات للمطوّرين',
      'كود <نص>           تنسيق كود',
      'json <نص>          تنسيق JSON',
      'فحص_رابط <رابط>    فحص أمان رابط',
      '',
      '▸ صحّة وراحة',
      'ماء                تذكير شرب الماء',
      'تنفس               تمرين تنفّس مرشد',
      'استراحة            استراحة ذكية',
    ]
  },

  8: {
    title: '👥 إدارة المجموعات',
    emoji: '👥',
    desc: 'صلاحيات، أعضاء، رسائل، حماية',
    featureTag: 'group',
    audience: 'admin', menu: 'group',
    // memberCommands: يراها العضو والمشرف والمطور
    // adminCommands : يراها المشرف والمطور فقط
    memberCommands: [
      '▸ معلومات المجموعة',
      'أعضاء              قائمة الأعضاء كاملة',
      'المشرفين           قائمة المشرفين',
      'احصائيات           تفاصيل المجموعة',
      'عدد_الاعضاء        إحصاء سريع',
      'ارقام_الاعضاء      استخراج كل الأرقام',
      'رابط               عرض رابط الدعوة',
      '',
      '▸ تفاعل عام',
      'منشن_مشرفين        تنبيه المشرفين فقط',
      'تحذيرات            عرض سجل التحذيرات',
    ],
    adminCommands: [
      '▸ إدارة الأعضاء',
      'طرد @                  طرد عضو',
      'طرد_متعدد @ ...        طرد عدة دفعة',
      'طرد_الجميع             طرد كل غير المشرفين',
      'اضف <رقم>              إضافة عضو',
      'رفع @                  ترقية لمشرف',
      'خفض @                  خفض مشرف',
      'ترقية_متعددة @ ...     ترقية عدة',
      'خفض_متعدد @ ...        خفض عدة مشرفين',
      '',
      '▸ الرابط والإعدادات',
      'تجديد_الرابط           رابط جديد (يلغي القديم)',
      'قفل_القروب             مشرفون فقط يرسلون',
      'فتح_القروب             الكل يرسل',
      'قفل_الإعدادات          منع تعديل المعلومات',
      'فتح_الإعدادات          السماح للكل بالتعديل',
      'اسم_القروب <نص>        تغيير اسم المجموعة',
      'وصف_القروب <نص>        تغيير الوصف',
      'صورة_القروب            تغيير الصورة (مع صورة)',
      '',
      '▸ الرسائل والتنبيهات',
      'منشن_مخفي <نص>         منشن مخفي للكل',
      'منشن_ظاهر <نص>         منشن مع الأسماء',
      'رسالة_خاصة @ <نص>      DM لعضو',
      'رسالة_جماعية <نص>      بث لكل الأعضاء',
      'تثبيت / الغاء_تثبيت    تثبيت رسالة (بالرد)',
      '',
      '▸ الترحيب والوداع',
      'ترحيب                       لوحة الترحيب',
      'ترحيب تشغيل|ايقاف           تفعيل/إيقاف',
      'ترحيب نص <رسالة>            تخصيص النص',
      'ترحيب افتراضي               النص الأصلي',
      'ترحيب تجربة                 معاينة فوريّة',
      'وداع تشغيل|ايقاف            نفس الشيء للوداع',
      'وداع نص <رسالة>             تخصيص نص الوداع',
      '   متغيّرات: {user} {name} {number} {group} {desc} {count} {bot}',
      '',
      '▸ الحماية والتنظيف',
      'الحماية تشغيل|ايقاف         مكافحة الروابط',
      'تحذير @                     تحذير عضو',
      'تنظيف                       حذف رسائل البوت',
      'احذف (بالرد)                حذف رسالة محدّدة',
      'مغادرة_البوت                البوت يغادر القروب',
      '',
      '▸ النشاط والإعلانات',
      'قائمه_النشطين <عدد>         أكثر الأعضاء نشاطاً',
      'قائمه_الصامتين <عدد>        الأقل نشاطاً',
      'تنبيه <نص>                  إعلان رسمي مزخرف',
      'كلمة_اليوم <نص>             حفظ اقتباس/قاعدة اليوم',
      'قاعدة_القروب                عرض الكلمة/القاعدة',
    ]
  },

  9: {
    title: '👑 لوحة المطور',
    emoji: '👑',
    desc: 'إدارة المستخدمين، الاقتصاد، الحظر',
    featureTag: 'owner',
    audience: 'owner', menu: 'dev',
    commands: [
      '▸ اللوحة الرئيسية',
      'لوحة_التحكم            لوحة كاملة للإدارة',
      'لوحه / panel           اختصار',
      '',
      '▸ المستخدمون',
      'عرض_مستخدم @           بيانات مستخدم كاملة',
      'قائمة_المستخدمين       كل المسجَّلين',
      'اعادة_ضبط @            تصفير بيانات مستخدم',
      'حذف_مستخدم @           حذف نهائي',
      '',
      '▸ الاقتصاد',
      'اضافة_مال @ <مبلغ>     إضافة عملات',
      'اضافة_بنك @ <مبلغ>     إضافة للبنك',
      'اضافة_ماس @ <كمية>     إضافة ماس',
      'تعديل_مستوى @ <رقم>    تعديل المستوى',
      '',
      '▸ الحظر والبلوك',
      'بان @                  حظر مستخدم من البوت',
      'الغاء_بان @            رفع الحظر',
      'حظر_شات                حظر هذه الدردشة كلياً',
      'فك_حظر_شات             فك حظر الدردشة',
      'بلوك @                 بلوك مستخدم على واتساب',
      'فك_البلوك @            رفع البلوك',
      'قائمة_المحظورين_عام   كل المحظورين والمبلوكين',
      '',
      '▸ السحاب والنظام',
      'حالة_السحاب            فحص اتصال Supabase',
      'مزامنة_السحاب          حفظ فوري إلى السحاب',
      'نسخة_احتياطية          تنزيل نسخة كاملة',
      'اخطاء                  آخر أخطاء البوت',
      'احصائيات_القروب        إحصاء كامل لقروب',
      'تعطيل_بوت / تفعيل_بوت  تشغيل/إيقاف هنا',
      'انضم <رابط>            دخول مجموعة برابط',
      '',
      '▸ تشخيص',
      'بنق / ping             قياس زمن الاستجابة',
      'احصائيات_شاملة         تقرير شامل (RAM/قروبات)',
      'مغادرة_قروب <jid>      مغادرة قروب محدد',
      '',
      '▸ ربط الهوية',
      'ليد <رقمك>             ربط LID JID برقم الهاتف',
      'رقمي / setlid          اختصار نفس الأمر',
      '',
      '▸ الجلسة والإقران',
      'مسح_الجلسة تأكيد       مسح وتوليد كود إقران جديد',
      '                       (الكود يظهر على /pairing-code)',
      '',
      '▸ البوتات الفرعية (Jadibot)',
      'بوت_فرعي <رقم>                إنشاء بوت + كود إقران',
      'ازالة_بوت_فرعي <رقم>          حذف بوت فرعي كاملاً',
      'قائمة_البوتات_الفرعية         عرض كل البوتات + الحالة',
      'مزايا_البوت <رقم> <tags>      تحديد مزايا بوت فرعي',
      '   مثال: مزايا_البوت 96779xxxx game,islamic,profile',
      '   📌 الجلسات تُحفظ سحابياً وتُستعاد تلقائياً.',
    ]
  },

  10: {
    title: '🛠️ تحكّم البوت والحساب',
    emoji: '🛠️',
    desc: 'اسم البوت، خصوصية، بث، أجهزة',
    featureTag: 'owner',
    audience: 'owner', menu: 'dev',
    commands: [
      '▸ معلومات وأداء',
      'تحكم_البوت             لوحة تحكّم شاملة',
      'وقت_التشغيل / uptime   وقت التشغيل',
      'رام                    استخدام الذاكرة',
      'تقرير_البوت            تقرير شامل',
      '',
      '▸ هوية البوت',
      'اسم_البوت <اسم>        تغيير اسم الحساب',
      'وصف_البوت <نص>         تغيير النبذة',
      'صورة_البوت             تغيير الصورة',
      'تغيير_البادئة <رمز>    تغيير بادئة الأوامر',
      '',
      '▸ التشغيل والصيانة',
      'تفعيل_الكل             تفعيل في كل المحادثات',
      'ايقاف_الكل             إيقاف في كل المحادثات',
      'مسح_الذاكرة            تنظيف الكاش',
      'إعادة_تشغيل            إعادة تشغيل البوت',
      'رد_تلقائي تشغيل|ايقاف الرد التلقائي',
      '',
      '▸ التحكم بحالة البوت (☁️ يُحفظ سحابياً)',
      'حالة_البوت                       لوحة الحالة الكاملة',
      'ايقاف_الامر <اسم>                تعطيل أمر معيّن',
      'تفعيل_الامر <اسم>                إعادة تفعيل أمر',
      'الاوامر_المعطلة                  قائمة المعطّلة',
      'وضع_الصيانة تشغيل|ايقاف         البوت للمطور فقط',
      'وضع_خاص تشغيل|ايقاف             البوت للمطور والمميزين',
      'اقتراح_الاوامر تشغيل|ايقاف      تصحيح الأخطاء الإملائية',
      '',
      '▸ البث والقروبات',
      'قائمة_القروبات         عرض كل القروبات',
      'بث_للقروبات <نص>       إرسال لكل القروبات',
      'بث_للكل <نص>           إرسال لكل المحادثات',
      '',
      '▸ الخصوصية',
      'خصوصية_المشاهدة <كل/جهات/لا_أحد>',
      'خصوصية_الصورة   <كل/جهات/لا_أحد>',
      'خصوصية_الحالة   <كل/جهات/لا_أحد>',
      'خصوصية_المجموعات <كل/جهات/لا_أحد>',
      'جميع_الخصوصية   <كل/جهات/لا_أحد>',
      '',
      '▸ الحضور والمكالمات',
      'حضور_دائم              ظهور متاح دائماً',
      'حضور_إيقاف             إيقاف الحضور الدائم',
      'رفض_المكالمات          حجب المكالمات',
      'قبول_المكالمات         قبول المكالمات',
      '',
      '▸ الحالة والأجهزة',
      'نشر_حالة <نص>          نشر حالة واتساب',
      'الأجهزة_المرتبطة       عرض الأجهزة',
      'حذف_الأجهزة_المرتبطة   فصل أجهزة (مع تأكيد)',
    ]
  },

  11: {
    title: '🎓 وسيط طلاب الجامعة',
    emoji: '🎓',
    desc: 'إدارة طلاب وبثّ غير مباشر',
    featureTag: 'mediator',
    audience: 'owner', menu: 'dev',
    commands: [
      '▸ إدارة الطلاب',
      'طلاب اضف <رقم> [اسم]   تسجيل طالب جديد',
      'طلاب حذف <رقم>         حذف طالب',
      'طلاب قائمة             عرض كل الطلاب',
      'طلاب بحث <اسم/رقم>     بحث عن طالب',
      'طلاب تجميع <مجموعة>    تصنيف لشُعبة/سنة',
      '',
      '▸ المجموعات الطلابية',
      'مجموعات_الطلاب اضف <jid>   ربط قروب طلابي',
      'مجموعات_الطلاب حذف <jid>   فك الربط',
      'مجموعات_الطلاب قائمة       عرض المربوطة',
      '',
      '▸ مراسلة باسم البوت',
      'رسالة_لطالب @ <نص>          DM لطالب',
      'رسالة_للطلاب <نص>           DM للجميع',
      'رسالة_لمجموعة <اسم> <نص>    لقروب محدّد',
      'بث_للطلاب <نص>              بث لكل القروبات',
      'اعلان <نص>                  إعلان رسمي مزخرف',
      '',
      '▸ صندوق الردود',
      'صندوق_الطلاب                عرض الردود الواردة',
      'رد_على_طالب <رقم> <نص>      الرد من الصندوق',
      'تصفير_صندوق                 مسح كل الردود',
      '',
      '▸ إعدادات الوسيط',
      'وسيط_الطلاب                 لوحة الإعدادات',
      'وسيط_الطلاب تشغيل|ايقاف     تفعيل/إيقاف',
      'وسيط_الطلاب توقيع <نص>      توقيع تلقائي',
      'وسيط_الطلاب اخفاء_المصدر    إرسال بهوية البوت',
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
`╭━━━━━━━━『 🤖 *ZEREF BOT* 』━━━━━━━━╮
│
│  👤  ${name}
│  🏆  المستوى ${level}  •  ${role}
│  📊  ${bar}  ${user.exp || 0}/${max} XP
│
│  💰  ${fmt(user.money)}    🏦  ${fmt(user.bank)}
│  💎  ${user.diamond || 0}    ⚡  ${fmtEnergy(user, m.sender)}
│
│  ${vipStatus}
│  🕒  وقت التشغيل: ${uptime}
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`).trim()
}

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

  // فلترة بنوع القائمة
  if (menuKind === 'group') {
    pool = pool.filter(s => String(s.menu || 'main') === 'group')
  } else if (menuKind === 'dev') {
    pool = pool.filter(s => String(s.menu || 'main') === 'dev')
  } else {
    pool = pool.filter(s => {
      const aud = String(s.audience || 'all').toLowerCase()
      const m = String(s.menu || 'main')
      if (m === 'group' && !isGroup) return false
      if (aud === 'owner') return isOwner
      if (aud === 'admin') return isOwner || isAdmin
      return true
    })
  }

  // فلترة الصلاحيات النهائية
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

  // عرض الفهرس بصياغة مرتبة: رقم + إيموجي + عنوان + وصف
  const lines = entries.map(([k, s]) => {
    const num   = String(k).padStart(2, '0')
    const title = s.title.replace(/^[^ ]+ /, '')
    const desc  = s.desc ? `\n      ${s.desc}` : ''
    return `  *${num}.*  ${s.emoji}  ${title}${desc}`
  }).join('\n\n')

  const subLine = isSubBot
    ? `\n\n┌─ 🤖 *بوت فرعي* ─┐\n│ +${subPhone}\n│ 🧩 ${(allowedFeatures || []).join(' • ') || '—'}\n└─────`
    : ''

  return `${header}${subLine}

📋 *اختر قسماً*
رُدّ (Reply) على هذه الرسالة برقم القسم

${lines}

_↩️ ردّ بالرقم فقط (مثال: 3)_`.trim()
}

function buildSection(id, header, vipStatus, sectionsToShow = sections, ctx = {}) {
  const section = sectionsToShow[id]
  if (!section) return null

  // اختيار الأوامر حسب الصلاحية
  let cmds = section.commands
  if (Array.isArray(section.memberCommands) || Array.isArray(section.adminCommands)) {
    if (ctx.isOwner || ctx.isAdmin) {
      cmds = [...(section.memberCommands || []), '', ...(section.adminCommands || [])]
    } else {
      cmds = section.memberCommands || []
    }
  }

  // تنسيق:
  //   • سطر يبدأ بـ '▸' → عنوان فرعي
  //   • سطر فارغ        → سطر فاصل بصري
  //   • السطر يبدأ بمسافات → سطر تابع
  //   • غير ذلك         → بند أمر
  const formatted = (cmds || []).map(line => {
    if (line === '') return '│'
    if (line.startsWith('▸')) return `│\n│  ${line}`
    if (line.startsWith('   ')) return `│      ${line.trimStart()}`
    return `│   • ${line}`
  }).join('\n')

  const descLine = section.desc ? `│  ${section.desc}\n│` : ''

  return (
`${header}

╭━━━━━━━━『 ${section.title} 』━━━━━━━━╮
│
${descLine}
${formatted}
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

_${vipStatus}_`).trim()
}

// ─────────────────────────────────────────────────────────────────────────────
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
    return m.reply('🔒 *قائمة المطور* مخصّصة للمطور فقط.')
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
    group: '👥 *قائمة القروب*' + (adminFlag || ownerFlag ? ' — _مشرف_' : ' — _عضو_'),
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
      `⏰ *انتهت صلاحية القائمة!*\n\nمضى أكثر من 5 دقائق على إرسال القائمة.\nأرسل الأمر مجدداً للحصول على قائمة جديدة 🔄`,
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
