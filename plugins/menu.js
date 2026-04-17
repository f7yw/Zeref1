import { xpRange } from '../lib/levelling.js'
import { syncEnergy, initEconomy } from '../lib/economy.js'

function clockString(ms) {
  let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
  let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
  let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}

export const sections = {
  quran: {
    title: '📖 القرآن الكريم',
    text: (p) => `
*📖 ─── القرآن الكريم ───*

${p}اذكار الصباح  ⟵ أذكار الصباح اليومية
${p}اذكار المساء  ⟵ أذكار المساء اليومية
${p}ايه           ⟵ آية الكرسي
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

${p}سوال       ⟵ سؤال عشوائي (جائزة 💰)
${p}جواب       ⟵ إجابة الأسئلة والتحديات
${p}تحدي       ⟵ تحدي رياضيات (جائزة 💰)
${p}شطرنج      ⟵ لعبة شطرنج كاملة بين لاعبين
${p}نرد        ⟵ رمي النرد
${p}عملة       ⟵ ملك أو كتابة
${p}اختار      ⟵ يختار لك من عدة خيارات
${p}حجر        ⟵ حجر ورقة مقص ضد البوت
${p}رهان       ⟵ لعبة القمار (راهن بعملاتك 🎰)
${p}اكس        ⟵ إكس أو (Tic Tac Toe)
${p}لو         ⟵ لعبة لو خيروك
${p}فزوره      ⟵ فزورة عشوائية
${p}علم        ⟵ خمّن علم الدولة
${p}تخمين      ⟵ تخمين الشخصية`.trim()
  },
  fun: {
    title: '😄 ترفيه',
    text: (p) => `
*😄 ─── ترفيه وطرائف ───*

${p}ذكاء       ⟵ نسبة ذكائك عشوائياً
${p}جمال       ⟵ نسبة جمالك عشوائياً
${p}حظ         ⟵ حظك اليوم
${p}نرد        ⟵ نرد سريع للترفيه
${p}عملة       ⟵ قرعة عشوائية
${p}اختار      ⟵ اختيار عشوائي بين أشياء
${p}حجر        ⟵ تحدي حجر ورقة مقص
${p}قلب        ⟵ رسالة قلب
${p}صراحه      ⟵ سؤال بصراحة
${p}نصيحه      ⟵ نصيحة عشوائية
${p}مقولات     ⟵ اقتباسات أنيمي
${p}زخرفه      ⟵ زخرفة نص
${p}احرف       ⟵ تحويل الأحرف
${p}قط         ⟵ صور قطط عشوائية
${p}كلب        ⟵ صور كلاب عشوائية
${p}انمي       ⟵ بحث عن أنيمي`.trim()
  },
  tools: {
    title: '🛠️ الأدوات',
    text: (p) => `
*🛠️ ─── الأدوات ───*

${p}مترجم تشغيل ar  ⟵ تشغيل الترجمة العامة
${p}مترجم ايقاف     ⟵ إيقاف الترجمة العامة
${p}لغة ar          ⟵ تغيير لغة الترجمة العامة
${p}ذكرني       ⟵ ضبط تذكير بمهمة
${p}منبه        ⟵ ضبط منبّه بوقت محدد
${p}رمزي        ⟵ عرض رمز QR الخاص بك
${p}اختفاء      ⟵ وضع الاختفاء / AFK
${p}احرف        ⟵ تحويل وتزخرف الأحرف
${p}زخرفه       ⟵ زخرفة أي نص`.trim()
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
    title: '📊 المعلومات',
    text: (p) => `
*📊 ─── المعلومات ───*

${p}الضعوم     ⟵ حالة البوت ووقت التشغيل
${p}بروفايل    ⟵ ملفك ومعلوماتك
${p}التوقيت    ⟵ التوقيت الحالي
${p}رابطي      ⟵ رابط واتساب الخاص بك
${p}حكمه       ⟵ حكمة عشوائية
${p}حديث       ⟵ حديث نبوي شريف
${p}بلاغ       ⟵ إرسال بلاغ للمالك
${p}المالك     ⟵ معلومات مالك البوت`.trim()
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
    title: '📜 كل الأوامر',
    text: (p) => Object.values(sections)
      .filter(section => section.title !== '📜 كل الأوامر')
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
║
╚══〘 👇 اختر رقم القسم 〙══╝`.trim()
}

function buildPageText(prefix) {
  return Object.entries(menuSections)
    .map(([num, section]) => `*${num}.* ${section.title}`)
    .join('\n')
}

async function sendPage(conn, m, prefix, stats) {
  const text = `${stats}\n\n${buildPageText(prefix)}\n\nأرسل رقم القسم فقط مثل: *1*\nلجميع الأوامر اختر رقم قسم *📜 كل الأوامر*.`
  await conn.sendMessage(m.chat, { text }, { quoted: m })
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
  const choice = (m.text || '').trim()
  if (global.menuSessions?.[m.sender] && menuSections[choice]) {
    const session = global.menuSessions[m.sender]
    const prefix = session?.prefix || '.'
    const user = global.db.data.users[m.sender] || {}
    initEconomy(user)
    syncEnergy(user)
    const { level = 1, role = 'مستخدم' } = user
    const { max } = xpRange(level, global.multiplier)
    const uptime = clockString(process.uptime() * 1000)
    const stats = buildStats(m, user, level, role, max, uptime)
    await sendSection(conn, m, menuSections[choice].key, prefix, stats)
    return true
  }

  return false
}

export default handler