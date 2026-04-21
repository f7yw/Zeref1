import { xpRange } from '../lib/levelling.js'
import { syncEnergy, initEconomy, getRole, isVip, fmt, fmtEnergy } from '../lib/economy.js'
import { typingDelay } from '../lib/presence.js'

function clockString(ms) {
  const h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
  const m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
  const s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}

function normalizeChoice(text = '') {
  const map = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  }
  return text.trim().replace(/[٠-٩۰-۹]/g, d => map[d] || d).trim()
}

const sections = {
  1: {
    title: '🆓 التسجيل والبروفايل',
    commands: [
      'تسجيل       ← تسجيل الحساب',
      'بروفايل      ← ملفك الشخصي',
      'رانك         ← ترتيبك',
      'احصائياتي_مفصل ← إحصائيات تفصيلية',
      'مراجعة_البريم  ← فحص عضوية VIP',
      'تقرير_المال  ← تقرير الأموال',
    ]
  },
  2: {
    title: '🎁 الخدمات الدينية والثقافية',
    commands: [
      'نصيحه       ← نصيحة عشوائية',
      'مقولات      ← مقولة مشهورة',
      'حكمه        ← حكمة يومية',
      'حظ          ← حظك اليوم',
      'اذكارالصباح  ← أذكار الصباح',
      'اذكارالمساء  ← أذكار المساء',
      'الله         ← أسماء الله الحسنى',
      'آية الكرسي  ← آية الكرسي',
      'حديث        ← حديث نبوي',
      'قران         ← آية قرآنية',
      'التوقيت     ← توقيت أي مدينة',
      'ترجم        ← ترجمة النصوص',
      'بلاغ        ← إرسال بلاغ',
    ]
  },
  3: {
    title: '🎮 الألعاب والترفيه',
    commands: [
      'شطرنج       ← لعبة شطرنج',
      'اكس         ← لعبة XO',
      'اربعة / c4  ← أربعة بالصف',
      'حجره        ← لعبة حجرة ورقة',
      'رهان / slot  ← ماكينة الحظ',
      'سؤال_وجواب  ← أسئلة معلومات عامة',
      'تحدي        ← تحدي رياضيات',
      'سوال        ← سؤال عشوائي',
      'فزوره       ← فزورة',
      'علم         ← خمّن العلم',
      'نرد         ← رمي النرد',
      'حجر         ← حجر ورق مقص',
      'لو          ← لعبة لو',
      'كلمة / رتب  ← رتّب الكلمة',
      'سرعة        ← حساب سريع',
      'ذاكرة       ← اختبار الذاكرة',
      'شنقه        ← لعبة المشنقة',
      'خمن_رقم    ← خمّن الرقم',
      'وصله        ← لعبة وصلة',
      'ايموجي      ← خمّن الإيموجي',
    ]
  },
  4: {
    title: '💼 الاقتصاد والمتجر',
    commands: [
      'البنك        ← رصيدك ومعلوماتك',
      'يومي         ← مكافأة يومية',
      'عمل          ← اكسب عملات',
      'طاقة         ← شحن الطاقة',
      'ايداع        ← إيداع في البنك',
      'سحب          ← سحب من البنك',
      'تحويل        ← تحويل للآخرين',
      'شراء_الماس   ← شراء ماس بعملات',
      'شراء_عملات   ← بيع ماس مقابل عملات',
      'معاملاتي     ← سجل المعاملات',
      'لفل          ← رفع المستوى',
    ]
  },
  5: {
    title: '🤖 الذكاء الاصطناعي والتعلم',
    commands: [
      'ai           ← ذكاء اصطناعي',
      'بوت          ← محادثة البوت',
      'شخصية       ← شخصية مخصصة',
      'جوده         ← رفع جودة الصورة',
      'تعلم         ← خطة تعلم',
      'خطة          ← إنشاء خطة دراسية',
      'تلخيص       ← تلخيص نص',
      'بطاقات       ← بطاقات تعليمية',
      'اختبرني     ← اختبار ذاتي',
      'بومودورو    ← تقنية بومودورو',
      'جدول        ← جدول دراسي',
      'مصادر       ← مصادر تعليمية',
    ]
  },
  6: {
    title: '🎧 الوسائط والتحميل',
    commands: [
      'شغل          ← تشغيل أغنية',
      'اغنيه صوت   ← تحميل صوت',
      'اغنيه فيديو ← تحميل فيديو',
      'بحث_يوتيوب  ← بحث يوتيوب',
      'بنترست      ← بحث صور بنترست',
      'ملصق        ← إنشاء ملصق',
      'تحميل_صوت   ← تحميل من رابط',
      'تحميل_فيديو ← تحميل فيديو من رابط',
      'تحويل_صيغة  ← صورة → ملصق',
      'بحث_صورة   ← بحث عن صورة',
      'ocr          ← استخراج نص من صورة',
      'tts          ← تحويل نص لصوت',
      'زخرفه       ← زخرفة النص',
      'احرف        ← تنسيقات النص',
    ]
  },
  7: {
    title: '📋 الإنتاجية والأدوات',
    commands: [
      'مهمة        ← إضافة مهمة',
      'مهامي       ← قائمة مهامك',
      'تم          ← تأشير مهمة منتهية',
      'حذف_مهمة   ← حذف مهمة',
      'ملاحظة      ← إضافة ملاحظة',
      'ملاحظاتي    ← قائمة ملاحظاتك',
      'ذكرني       ← تذكير مؤجل',
      'ترتيب       ← ترتيب الأعضاء بالـXP',
      'ترتيب_الرسائل ← أكثر الأعضاء نشاطاً',
      'رسائلي      ← عدد رسائلك',
      'احصائياتي   ← إحصائياتك',
      'نشاط_القروب ← نشاط المجموعة',
      'فحص_رابط   ← فحص أمان رابط',
      'كود         ← تنسيق كود',
      'json        ← تنسيق JSON',
      'ماء         ← تذكير شرب الماء',
      'تنفس        ← تمرين تنفس',
      'استراحة     ← استراحة ذكية',
    ]
  },
  8: {
    title: '👥 إدارة المجموعات',
    commands: [
      '─── الأعضاء ───',
      'طرد          ← طرد عضو (منشن/رقم)',
      'طرد_متعدد   ← طرد عدة أعضاء دفعة',
      'طرد_الجميع  ← طرد كل غير المشرفين',
      'اضف          ← إضافة عضو بالرقم',
      'رفع          ← ترقية لمشرف',
      'خفض          ← خفض مشرف',
      'ترقية_متعددة ← ترقية عدة أعضاء',
      'خفض_متعدد   ← خفض عدة مشرفين',
      '',
      '─── عرض المعلومات ───',
      'أعضاء        ← قائمة كل الأعضاء',
      'المشرفين     ← قائمة المشرفين',
      'احصائيات     ← معلومات المجموعة',
      'عدد_الاعضاء  ← عدد الأعضاء',
      'ارقام_الاعضاء ← استخراج الأرقام',
      '',
      '─── الرابط ───',
      'رابط          ← رابط الدعوة',
      'تجديد_الرابط ← إنشاء رابط جديد',
      '',
      '─── الإعدادات ───',
      'قفل_القروب   ← قفل الإرسال',
      'فتح_القروب   ← فتح الإرسال',
      'قفل_الإعدادات ← منع تعديل الإعدادات',
      'فتح_الإعدادات ← السماح بتعديل الإعدادات',
      'اسم_القروب   ← تغيير الاسم',
      'وصف_القروب  ← تغيير الوصف',
      'صورة_القروب ← تغيير صورة القروب',
      '',
      '─── الرسائل ───',
      'منشن_مخفي   ← منشن مخفي للكل',
      'منشن_ظاهر   ← منشن ظاهر للكل',
      'منشن_مشرفين ← تنبيه المشرفين فقط',
      'رسالة_خاصة  ← إرسال رسالة خاصة لعضو',
      'رسالة_جماعية ← بث خاص لكل الأعضاء',
      'تثبيت        ← تثبيت رسالة',
      'الغاء_تثبيت ← إلغاء تثبيت',
      '',
      '─── الترحيب ───',
      'رسالة_ترحيب  ← تعيين رسالة الترحيب',
      'رسالة_وداع   ← تعيين رسالة الوداع',
      'تفعيل_ترحيب  ← تشغيل الترحيب',
      'إيقاف_ترحيب ← إيقاف الترحيب',
      '',
      '─── الحماية ───',
      'الحماية       ← حماية المجموعة',
      'تحذير         ← تحذير عضو',
      'تحذيرات       ← عرض التحذيرات',
      'تنظيف         ← حذف رسائل البوت',
      '',
      'مغادرة_البوت ← يغادر البوت القروب',
    ]
  },
  9: {
    title: '👑 أوامر المالك',
    commands: [
      'لوحة_التحكم ← عرض جميع أوامر الإدارة',
      '',
      '─── إدارة المستخدمين ───',
      'عرض_مستخدم @  ← عرض بيانات مستخدم',
      'قائمة_المستخدمين ← كل المستخدمين',
      'اعادة_ضبط @   ← صفر بيانات مستخدم',
      'حذف_مستخدم @  ← حذف كامل',
      '',
      '─── الاقتصاد ───',
      'اضافة_مال @ 1000',
      'اضافة_بنك @ 1000',
      'اضافة_ماس @ 10',
      'تعديل_مستوى @ 5',
      '',
      '─── العضوية ───',
      'addprem @      ← إضافة VIP',
      'حذف_بريم @    ← إلغاء VIP',
      'listprem       ← قائمة المميزين',
      '',
      '─── السحاب ───',
      'حالة_السحاب   ← حالة Supabase',
      'مزامنة_السحاب ← حفظ فوري',
      'قاعدة_البيانات ← إحصائيات البيانات',
      '',
      '─── البوت ───',
      'بلوك @ / فك_البلوك @',
      'بان @ / الغاء_بان @',
      'تعطيل_بوت / تفعيل_بوت',
      'انضم رابط_المجموعة',
      'إعادة           ← إعادة تشغيل',
      'نسخة_احتياطية  ← نسخة احتياطية',
    ]
  }
}

function buildStats(m, user, level, role, max, uptime, vipStatus) {
  const name = user.name || m.pushName || 'مستخدم'
  return `╭────『 🤖 ZEREF BOT 』────
│
│ 👤 *المستخدم:* ${name}
│ 🏆 *المستوى:* ${level} (${role})
│ ⭐ *الخبرة:* ${user.exp || 0} / ${max}
│ 💰 *المحفظة:* ${fmt(user.money)}
│ 🏦 *البنك:* ${fmt(user.bank)}
│ 💎 *الماس:* ${user.diamond || 0}
│ ⚡ *الطاقة:* ${fmtEnergy(user, m.sender)}
│ 💎 *العضوية:* ${vipStatus}
│ 🕒 *النشاط:* ${uptime}
│
╰──────────────────`.trim()
}

function buildMenuText(stats) {
  let text = `${stats}\n\n*📋 قائمة الأوامر — اختر رقماً:*\n\n`
  for (const [key, section] of Object.entries(sections)) {
    text += `${key}. ${section.title}\n`
  }
  text += `\n💡 أرسل رقم القسم لعرض أوامره`
  return text.trim()
}

function buildSection(id, stats, vipStatus) {
  const section = sections[id]
  if (!section) return null
  let text = `${stats}\n\n╭────『 ${section.title} 』────\n│\n`
  for (const cmd of section.commands) {
    text += `│ • ${cmd}\n`
  }
  text += `│\n╰──────────────────\n\n👤 العضوية: ${vipStatus}`
  return text.trim()
}

let handler = async (m, { conn, usedPrefix }) => {
  const user = global.db.data.users[m.sender] || {}
  initEconomy(user, m.sender)
  syncEnergy(user, m.sender)
  
  const vipStatus = isVip(m.sender) ? '💎 مميز' : '❌ عادي'
  const level = user.level || 0
  const role = getRole(level)
  const { max } = xpRange(level, global.multiplier)
  const uptime = clockString(process.uptime() * 1000)
  
  const stats = buildStats(m, user, level, role, max, uptime, vipStatus)
  const menu = buildMenuText(stats)
  
  global.menuSessions ??= {}
  global.menuSessions[m.sender] = { ts: Date.now() }

  const pp = await conn.profilePictureUrl(m.sender, 'image').catch(() => './src/avatar_contact.png')
  await conn.sendMessage(m.chat, { image: { url: pp }, caption: menu + `\n\n👤 العضوية: ${vipStatus}` }, { quoted: m })
}

handler.all = async function (m) {
  const session = global.menuSessions?.[m.sender]
  if (!session) return

  const raw = (m.text || '').trim()
  if (!raw || /^[./#!]/.test(raw)) return 
  
  const choice = normalizeChoice(raw)
  if (!sections[choice]) return

  if (Date.now() - session.ts > 5 * 60 * 1000) {
    delete global.menuSessions[m.sender]
    return
  }

  const user = global.db.data.users[m.sender] || {}
  initEconomy(user, m.sender)
  syncEnergy(user, m.sender)
  
  const vipStatus = isVip(m.sender) ? '💎 مميز' : '❌ عادي'
  const level = user.level || 0
  const role = getRole(level)
  const { max } = xpRange(level, global.multiplier)
  const uptime = clockString(process.uptime() * 1000)
  const stats = buildStats(m, user, level, role, max, uptime, vipStatus)

  const sectionText = buildSection(choice, stats, vipStatus)
  if (sectionText) {
    await this.reply(m.chat, sectionText, m)
    delete global.menuSessions[m.sender]
  }
}

handler.help = ['menu', 'الاوامر']
handler.tags = ['main']
handler.command = /^(menu|الاوامر|أوامر|اوامر|قائمة|قائمه|help)$/i

export default handler
