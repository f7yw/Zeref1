// ════════════════════════════════════════════════════════════════════
//  🪨  حجر ورقة مقص — بين لاعبين (DM لكل منهما، النتيجة في المجموعة)
// ════════════════════════════════════════════════════════════════════

const CHOICES = {
  حجر:    { emoji: '🪨', beats: 'مقص' },
  ورقة:   { emoji: '📄', beats: 'حجر' },
  مقص:    { emoji: '✂️', beats: 'ورقة' },
}

const ALIAS = {
  حجر: 'حجر', rock: 'حجر', '1': 'حجر',
  ورقة: 'ورقة', paper: 'ورقة', '2': 'ورقة',
  مقص: 'مقص', scissors: 'مقص', '3': 'مقص',
}

const TIMEOUT_MS = 60 * 1000   // 60 ثانية للرد

// ──────────────────────────────────────────────────────────────────
//  🗂️  إدارة الجلسات  (مفتاح: chatId)
// ──────────────────────────────────────────────────────────────────
global.rpsGames ??= {}

const getRps   = (chatId)     => global.rpsGames[chatId]
const setRps   = (chatId, g)  => { global.rpsGames[chatId] = g }
const delRps   = (chatId)     => { delete global.rpsGames[chatId] }

const pause    = (ms) => new Promise(r => setTimeout(r, ms))

// ──────────────────────────────────────────────────────────────────
//  🏁  عرض النتيجة في المجموعة
// ──────────────────────────────────────────────────────────────────
async function resolveRps(conn, g) {
  if (g.timer) { clearTimeout(g.timer); g.timer = null }

  const { p1, p2, chatId } = g

  // إذا لم يرد أحدهما — خسر تلقائياً
  if (!p1.choice && !p2.choice) {
    delRps(chatId)
    return conn.sendMessage(chatId, {
      text: `⏰ *انتهى الوقت!*\nلم يرد أي لاعب — تم إلغاء التحدي.`
    })
  }
  if (!p1.choice) p1.choice = Object.keys(CHOICES)[Math.floor(Math.random() * 3)]
  if (!p2.choice) p2.choice = Object.keys(CHOICES)[Math.floor(Math.random() * 3)]

  const c1 = CHOICES[p1.choice]
  const c2 = CHOICES[p2.choice]

  let resultLine = ''
  let xp1 = 0, xp2 = 0

  if (p1.choice === p2.choice) {
    resultLine = `🤝 *تعادل!*`
    xp1 = xp2 = 300
  } else if (c1.beats === p2.choice) {
    resultLine = `🏆 *${p1.name}* فاز!`
    xp1 = 1000; xp2 = -300
  } else {
    resultLine = `🏆 *${p2.name}* فاز!`
    xp1 = -300; xp2 = 1000
  }

  // تحديث XP
  const updateXp = (jid, xp) => {
    const u = global.db?.data?.users?.[jid]
    if (u) u.exp = Math.max(0, (u.exp || 0) + xp)
  }
  updateXp(p1.jid, xp1)
  updateXp(p2.jid, xp2)

  const msg = [
    `⚔️ *نتيجة التحدي — حجر ورقة مقص*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `👤 *${p1.name}:*  ${c1.emoji} *${p1.choice}*${!p1.choiceReal ? ' _(عشوائي)_' : ''}`,
    `👤 *${p2.name}:*  ${c2.emoji} *${p2.choice}*${!p2.choiceReal ? ' _(عشوائي)_' : ''}`,
    ``,
    resultLine,
    ``,
    `⭐ XP: ${p1.name} ${xp1 > 0 ? '+' : ''}${xp1}  •  ${p2.name} ${xp2 > 0 ? '+' : ''}${xp2}`,
    ``,
    `🔄 تحدٍ جديد: *.تحدي @ذكر*`,
  ].join('\n')

  delRps(chatId)
  await conn.sendMessage(chatId, { text: msg })
}

// ──────────────────────────────────────────────────────────────────
//  📩  إرسال DM لكل لاعب
// ──────────────────────────────────────────────────────────────────
async function sendChoiceDm(conn, player, opponent, chatId) {
  const dm = [
    `⚔️ *تحدي — حجر ورقة مقص*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🎮 تحدّاك *${opponent.name}* في المجموعة!`,
    ``,
    `اختر سلاحك:`,
    `  🪨 اكتب *حجر*  أو  *1*`,
    `  📄 اكتب *ورقة* أو  *2*`,
    `  ✂️ اكتب *مقص*  أو  *3*`,
    ``,
    `⏰ _لديك 60 ثانية للرد._`,
    `↩️ _ردّ على هذه الرسالة باختيارك._`,
  ].join('\n')

  try {
    const sent = await conn.sendMessage(player.jid, { text: dm })
    player.msgId = sent?.key?.id ?? null
  } catch (e) {
    console.error('[RPS] DM error:', player.name, e.message)
  }
}

// ──────────────────────────────────────────────────────────────────
//  🎮  معالج الأوامر
// ──────────────────────────────────────────────────────────────────
let handler = async (m, { conn, command, usedPrefix }) => {
  if (!m.isGroup) return m.reply('❌ هذا الأمر يعمل فقط في المجموعات!')

  const chatId = m.chat
  const sender = m.sender
  const name   = m.pushName || sender.split('@')[0]

  // ══════════════════════════════════════════════════════════════
  //  .تحدي @ذكر — بدء تحدي
  // ══════════════════════════════════════════════════════════════
  if (/^(تحدي|تحدٍ|rps2|حجرورقة)$/i.test(command)) {
    const existing = getRps(chatId)
    if (existing) {
      return m.reply(`⚠️ هناك تحدٍ جارٍ بين *${existing.p1.name}* و *${existing.p2.name}*!\nانتظر حتى ينتهي.`)
    }

    // البحث عن المذكور
    const mentioned = m.mentionedJid?.[0] || m.quoted?.sender
    if (!mentioned) return m.reply(`❌ يجب تحديد لاعب!\nمثال: *.تحدي @اسم*`)
    if (mentioned === sender) return m.reply('❌ لا يمكنك تحدي نفسك!')

    // جلب اسم الخصم
    let opName = mentioned.split('@')[0]
    try { opName = await conn.getName(mentioned) || opName } catch {}

    const g = {
      chatId,
      p1: { jid: sender,    name, choice: null, choiceReal: false, msgId: null },
      p2: { jid: mentioned, name: opName, choice: null, choiceReal: false, msgId: null },
      timer: null,
    }
    setRps(chatId, g)

    // إعلان في المجموعة
    await conn.sendMessage(chatId, {
      text: [
        `⚔️ *تحدي — حجر ورقة مقص!*`,
        `━━━━━━━━━━━━━━━━━━━━━━━━`,
        `👤 *${name}*  ⚡  *${opName}*`,
        ``,
        `📩 _تم إرسال رسالة خاصة لكل لاعب..._`,
        `⏰ _لديكم 60 ثانية لإرسال اختياركم._`,
      ].join('\n')
    }, { quoted: m })

    // إرسال DM لكل لاعب
    await sendChoiceDm(conn, g.p1, g.p2, chatId)
    await sendChoiceDm(conn, g.p2, g.p1, chatId)

    // مؤقت الإنهاء التلقائي
    g.timer = setTimeout(() => resolveRps(conn, g), TIMEOUT_MS)
    return
  }

  // ══════════════════════════════════════════════════════════════
  //  .الغاء_تحدي — إلغاء التحدي
  // ══════════════════════════════════════════════════════════════
  if (/^(الغاء_تحدي|cancel_rps)$/i.test(command)) {
    const g = getRps(chatId)
    if (!g) return m.reply('❌ لا يوجد تحدٍ جارٍ.')
    const isHost  = g.p1.jid === sender || g.p2.jid === sender
    const isOwner = global.owner?.some(o => String(o[0]) === sender.split('@')[0])
    if (!isHost && !isOwner) return m.reply('❌ فقط أحد المتحدين يمكنه الإلغاء!')
    if (g.timer) clearTimeout(g.timer)
    delRps(chatId)
    return m.reply('🚫 تم إلغاء التحدي.')
  }
}

// ──────────────────────────────────────────────────────────────────
//  📡  اعتراض رسائل الـ DM (اختيارات اللاعبين)
// ──────────────────────────────────────────────────────────────────
handler.all = async function (m) {
  if (!m || !m.message) return

  // رسائل خاصة فقط
  if (m.chat?.endsWith('@g.us')) return

  const sender = m.sender
  const text   = (m.text || '').trim().toLowerCase()

  for (const g of Object.values(global.rpsGames || {})) {
    if (g.timer === null && !g.p1.choice && !g.p2.choice) continue

    const isP1 = g.p1.jid === sender
    const isP2 = g.p2.jid === sender
    if (!isP1 && !isP2) continue

    const player  = isP1 ? g.p1 : g.p2
    if (player.choice) continue  // سبق أن اختار

    // التحقق من أنه يردّ على رسالة البوت
    const quotedId = m.quoted?.id
    if (!quotedId || quotedId !== player.msgId) continue

    const choice = ALIAS[text]
    if (!choice) {
      await this.sendMessage(m.chat, {
        text: `❌ اختيار غير صحيح!\nاكتب: *حجر* أو *ورقة* أو *مقص* (أو 1 / 2 / 3)`
      })
      continue
    }

    player.choice     = choice
    player.choiceReal = true
    await this.sendMessage(m.chat, {
      text: `✅ تم تسجيل اختيارك: ${CHOICES[choice].emoji} *${choice}*\n⏳ _ننتظر الخصم..._`
    })

    // هل اختار كلاهما؟
    if (g.p1.choice && g.p2.choice) {
      clearTimeout(g.timer)
      g.timer = null
      await resolveRps(this, g)
    }

    break
  }
}

handler.help    = ['تحدي — حجر ورقة مقص بين لاعبين']
handler.tags    = ['game']
// أزيل (تحدي) لأنه يتعارض مع plugins/تحدي.js (تحدي الرياضيات). هذا تحدي حجرة-ورقة-مقص.
handler.command = /^(تحدي_حجره|تحدي_rps|rps2|حجرورقة|الغاء_تحدي|cancel_rps)$/i

export default handler
