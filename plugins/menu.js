import { xpRange } from '../lib/levelling.js'
import { syncEnergy, initEconomy } from '../lib/economy.js'

function clockString(ms) {
  let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
  let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
  let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}

const sections = {
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
${p}تحدي       ⟵ تحدي رياضيات (جائزة 💰)
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

${p}ترجم        ⟵ ترجمة أي نص لأي لغة
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
${p}ايداع        ⟵ إيداع عملات في البنك
${p}سحب          ⟵ سحب عملات من البنك
${p}تحويل        ⟵ تحويل لشخص آخر (5٪ رسوم)
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
${p}التوقيت    ⟵ التوقيت الحالي
${p}رابطي      ⟵ رابط واتساب الخاص بك
${p}حكمه       ⟵ حكمة عشوائية
${p}حديث       ⟵ حديث نبوي شريف
${p}بلاغ       ⟵ إرسال بلاغ للمالك
${p}المالك     ⟵ معلومات مالك البوت`.trim()
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
${p}تشغيل        ⟵ تشغيل البوت
${p}ايقاف        ⟵ إيقاف البوت
${p}إعادة        ⟵ إعادة تشغيل البوت`.trim()
  }
}

const pageOrder = [
  ['quran', 'ai', 'games'],
  ['fun', 'tools', 'economy'],
  ['info', 'owner']
]

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
╚══〘 👇 اختر من الأزرار 〙══╝`.trim()
}

function buildPageButtons(pageIndex) {
  const page = pageOrder[pageIndex] || pageOrder[0]
  const buttons = []

  for (const key of page) {
    buttons.push({
      buttonId: `menu_${key}`,
      buttonText: { displayText: sections[key].title },
      type: 1
    })
  }

  if (pageIndex > 0) {
    buttons.push({
      buttonId: `menu_prev_${pageIndex}`,
      buttonText: { displayText: '⬅️ السابق' },
      type: 1
    })
  } else if (pageOrder.length > 1) {
    buttons.push({
      buttonId: `menu_next_${pageIndex}`,
      buttonText: { displayText: 'التالي ➡️' },
      type: 1
    })
  }

  return buttons.slice(0, 3)
}

function buildPageText(pageIndex) {
  const page = pageOrder[pageIndex] || pageOrder[0]
  return page.map((key, i) => `*${i + 1}.* ${sections[key].title}`).join('\n')
}

function buildSectionButtons() {
  return [
    {
      buttonId: 'menu_home',
      buttonText: { displayText: '🏠 القائمة' },
      type: 1
    },
    {
      buttonId: 'menu_back',
      buttonText: { displayText: '⬅️ رجوع' },
      type: 1
    }
  ]
}

async function sendPage(conn, m, pageIndex, prefix, stats) {
  const text = `${stats}\n\n${buildPageText(pageIndex)}\n\nاضغط على الزر فقط`
  await conn.sendMessage(m.chat, {
    text,
    footer: 'SHADOW BOT',
    buttons: buildPageButtons(pageIndex),
    headerType: 1
  }, { quoted: m })
}

async function sendSection(conn, m, sectionKey, prefix, stats) {
  const section = sections[sectionKey]
  if (!section) return

  const text = `${stats}\n\n${section.text(prefix)}`
  await conn.sendMessage(m.chat, {
    text,
    footer: 'SHADOW BOT',
    buttons: buildSectionButtons(),
    headerType: 1
  }, { quoted: m })
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

  await sendPage(conn, m, 0, usedPrefix, stats)
}

handler.command = /^(اوامر|أوامر|المهام|مهام|menu|قائمة)$/i
handler.exp = 0
handler.fail = null

handler.before = async (m, { conn }) => {
  const btn = m.message?.buttonsResponseMessage?.selectedButtonId
  if (!btn) return false

  if (!global.menuSessions) global.menuSessions = {}
  const session = global.menuSessions[m.sender]
  const prefix = session?.prefix || '.'

  const user = global.db.data.users[m.sender] || {}
  initEconomy(user)
  syncEnergy(user)

  const { level = 1, role = 'مستخدم' } = user
  const { max } = xpRange(level, global.multiplier)
  const uptime = clockString(process.uptime() * 1000)
  const stats = buildStats(m, user, level, role, max, uptime)

  if (btn === 'menu_home') {
    global.menuSessions[m.sender] = { prefix, page: 0, ts: Date.now() }
    await sendPage(conn, m, 0, prefix, stats)
    return true
  }

  if (btn === 'menu_back') {
    const page = session?.page || 0
    const prev = Math.max(0, page - 1)
    global.menuSessions[m.sender] = { prefix, page: prev, ts: Date.now() }
    await sendPage(conn, m, prev, prefix, stats)
    return true
  }

  if (btn.startsWith('menu_next_')) {
    const current = Number(btn.split('_').pop() || 0)
    const next = Math.min(pageOrder.length - 1, current + 1)
    global.menuSessions[m.sender] = { prefix, page: next, ts: Date.now() }
    await sendPage(conn, m, next, prefix, stats)
    return true
  }

  if (btn.startsWith('menu_prev_')) {
    const current = Number(btn.split('_').pop() || 0)
    const prev = Math.max(0, current - 1)
    global.menuSessions[m.sender] = { prefix, page: prev, ts: Date.now() }
    await sendPage(conn, m, prev, prefix, stats)
    return true
  }

  const sectionKey = btn.replace(/^menu_/, '')
  if (sections[sectionKey]) {
    await sendSection(conn, m, sectionKey, prefix, stats)
    return true
  }

  return false
}

export default handler