// ════════════════════════════════════════════════════════════════════
//  🃏  لعبة البلاك جاك (21) — ضد البوت أو ضد لاعب
// ════════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────────
//  🎴  تعريف الأوراق
// ──────────────────────────────────────────────────────────────────
const SUITS  = ['♠️', '♥️', '♦️', '♣️']
const RANKS  = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const VALUES = {
  A: 11, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, J: 10, Q: 10, K: 10,
}

const SUIT_COLOR = { '♠️': '⬛', '♥️': '🟥', '♦️': '🟥', '♣️': '⬛' }

function makeDeck() {
  const deck = []
  for (const suit of SUITS)
    for (const rank of RANKS)
      deck.push({ suit, rank })
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

function draw(deck) { return deck.pop() }

function handValue(cards) {
  let total = 0, aces = 0
  for (const c of cards) {
    total += VALUES[c.rank]
    if (c.rank === 'A') aces++
  }
  while (total > 21 && aces-- > 0) total -= 10
  return total
}

function cardStr(c, hidden = false) {
  if (hidden) return '`🂠`'
  return `\`${c.rank}${c.suit}\``
}

function handStr(cards, hideSecond = false) {
  return cards.map((c, i) => cardStr(c, hideSecond && i === 1)).join('  ')
}

// ──────────────────────────────────────────────────────────────────
//  🗂️  إدارة الجلسات
// ──────────────────────────────────────────────────────────────────
global.bjGames ??= {}

const getGame   = (id) => global.bjGames[id]
const setGame   = (id, g) => { global.bjGames[id] = g }
const delGame   = (id) => { delete global.bjGames[id] }

const pause     = (ms) => new Promise(r => setTimeout(r, ms))

// ──────────────────────────────────────────────────────────────────
//  🎮  عرض حالة اللعبة
// ──────────────────────────────────────────────────────────────────
function buildBoardMsg(g, showAll = false) {
  const pVal  = handValue(g.playerCards)
  const dVal  = showAll ? handValue(g.dealerCards) : '?'
  const pCards = handStr(g.playerCards)
  const dCards = showAll ? handStr(g.dealerCards) : handStr(g.dealerCards, true)

  const lines = [
    `🃏 *لعبة البلاك جاك*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🤖 *البوت:*  ${dCards}  ${showAll ? `= *${dVal}*` : '= *?*'}`,
    ``,
    `👤 *أنت:*   ${pCards}  = *${pVal}*`,
    ``,
  ]

  if (!showAll) {
    if (pVal === 21 && g.playerCards.length === 2) {
      lines.push(`🌟 *بلاك جاك!*`)
    } else if (pVal > 21) {
      lines.push(`💥 *تجاوزت 21 — خسرت!*`)
    } else {
      lines.push(`📌 _ردّ بـ_ *.سحب* _لأخذ ورقة_ — *.وقف* _للوقوف_`)
    }
  }

  return lines.join('\n')
}

// ──────────────────────────────────────────────────────────────────
//  🏁  إنهاء اللعبة
// ──────────────────────────────────────────────────────────────────
async function finishGame(conn, g, reason) {
  const pVal = handValue(g.playerCards)
  const dVal = handValue(g.dealerCards)

  let result = ''
  let xp     = 0

  if (reason === 'bust') {
    result = `💥 تجاوزت 21 — *خسرت!* (أنت: ${pVal})`
    xp = -300
  } else if (reason === 'blackjack') {
    result = `🌟 *بلاك جاك!* — فزت بأفضل يد! (أنت: 21)`
    xp = 2000
  } else if (pVal > 21) {
    result = `💥 تجاوزت 21 — *خسرت!* (أنت: ${pVal})`
    xp = -300
  } else if (dVal > 21) {
    result = `🎉 البوت تجاوز 21 — *فزت!* (البوت: ${dVal}, أنت: ${pVal})`
    xp = 1000
  } else if (pVal > dVal) {
    result = `🎉 *فزت!* (أنت: ${pVal}, البوت: ${dVal})`
    xp = 1000
  } else if (pVal === dVal) {
    result = `🤝 *تعادل!* (${pVal} = ${dVal})`
    xp = 200
  } else {
    result = `❌ *خسرت!* (أنت: ${pVal}, البوت: ${dVal})`
    xp = -300
  }

  // تحديث XP
  const user = global.db?.data?.users?.[g.userId]
  if (user) {
    user.exp = Math.max(0, (user.exp || 0) + xp)
  }

  const board = buildBoardMsg(g, true)
  const finalMsg = [
    board,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🏁 *النتيجة:* ${result}`,
    xp !== 0 ? `⭐ XP: ${xp > 0 ? '+' : ''}${xp}` : '',
    ``,
    `▶️ للعب مرة أخرى: *.بلاك*`,
  ].filter(x => x !== '').join('\n')

  if (g.timer) { clearTimeout(g.timer); g.timer = null }
  delGame(g.userId)

  await conn.sendMessage(g.chatId, { text: finalMsg })
}

// ──────────────────────────────────────────────────────────────────
//  🤖  دور البوت (بعد وقوف اللاعب)
// ──────────────────────────────────────────────────────────────────
async function dealerTurn(conn, g) {
  // البوت يسحب حتى يصل لـ 17 أو أكثر
  while (handValue(g.dealerCards) < 17) {
    g.dealerCards.push(draw(g.deck))
    await pause(600)
  }
  await finishGame(conn, g, 'stand')
}

// ──────────────────────────────────────────────────────────────────
//  🎮  معالج الأوامر
// ──────────────────────────────────────────────────────────────────
let handler = async (m, { conn, command }) => {
  const userId = m.sender
  const chatId = m.chat
  const name   = m.pushName || userId.split('@')[0]

  // ══════════════════════════════════════════════════════════════
  //  .بلاك — بدء لعبة جديدة
  // ══════════════════════════════════════════════════════════════
  if (/^(بلاك|blackjack|اوراق|21)$/i.test(command)) {
    if (getGame(userId)) {
      return m.reply(`⚠️ لديك لعبة جارية بالفعل!\n📌 استخدم *.سحب* أو *.وقف* للاستمرار، أو *.انسحاب* للإنهاء.`)
    }

    const deck        = makeDeck()
    const playerCards = [draw(deck), draw(deck)]
    const dealerCards = [draw(deck), draw(deck)]

    const g = {
      userId,
      chatId,
      name,
      deck,
      playerCards,
      dealerCards,
      state: 'playing',
      timer: null,
    }
    setGame(userId, g)

    // انتهاء تلقائي بعد 3 دقائق
    g.timer = setTimeout(async () => {
      const current = getGame(userId)
      if (current && current.state === 'playing') {
        delGame(userId)
        await conn.sendMessage(chatId, {
          text: `⏰ *${name}* — انتهت مدة اللعبة! تم إنهاء جلستك.`
        })
      }
    }, 3 * 60 * 1000)

    const pVal = handValue(playerCards)

    // بلاك جاك فوري؟
    if (pVal === 21) {
      return finishGame(conn, g, 'blackjack')
    }

    const msg = buildBoardMsg(g)
    await conn.sendMessage(chatId, { text: msg }, { quoted: m })
    return
  }

  // ══════════════════════════════════════════════════════════════
  //  .سحب — Hit (أخذ ورقة)
  // ══════════════════════════════════════════════════════════════
  if (/^(سحب|hit|سحب_ورقة)$/i.test(command)) {
    const g = getGame(userId)
    if (!g || g.state !== 'playing') return m.reply('❌ لا توجد لعبة جارية. ابدأ بـ *.بلاك*')

    g.playerCards.push(draw(g.deck))
    const pVal = handValue(g.playerCards)

    if (pVal > 21) {
      return finishGame(conn, g, 'bust')
    }

    if (pVal === 21) {
      // وصلت لـ 21 تلقائياً — دور البوت مباشرة
      const board = buildBoardMsg(g)
      await conn.sendMessage(chatId, { text: board })
      await pause(800)
      return dealerTurn(conn, g)
    }

    const msg = buildBoardMsg(g)
    await conn.sendMessage(chatId, { text: msg }, { quoted: m })
    return
  }

  // ══════════════════════════════════════════════════════════════
  //  .وقف — Stand (الوقوف)
  // ══════════════════════════════════════════════════════════════
  if (/^(وقف|stand|وقوف)$/i.test(command)) {
    const g = getGame(userId)
    if (!g || g.state !== 'playing') return m.reply('❌ لا توجد لعبة جارية. ابدأ بـ *.بلاك*')

    g.state = 'dealer'

    const dealerReveal = [
      buildBoardMsg(g, true),
      ``,
      `🤖 *البوت يلعب...*`,
    ].join('\n')

    await conn.sendMessage(chatId, { text: dealerReveal })
    await pause(1000)
    return dealerTurn(conn, g)
  }

  // ══════════════════════════════════════════════════════════════
  //  .انسحاب — إلغاء اللعبة
  // ══════════════════════════════════════════════════════════════
  if (/^(انسحاب|انسحب|quit_bj)$/i.test(command)) {
    const g = getGame(userId)
    if (!g) return m.reply('❌ لا توجد لعبة جارية.')
    if (g.timer) clearTimeout(g.timer)
    delGame(userId)
    return m.reply('🚪 تم إلغاء لعبة البلاك جاك.')
  }

  // ══════════════════════════════════════════════════════════════
  //  .قواعد_بلاك — قواعد اللعبة
  // ══════════════════════════════════════════════════════════════
  if (/^(قواعد_بلاك|rules_bj|قواعد_اوراق)$/i.test(command)) {
    const guide = [
      `🃏 *قواعد البلاك جاك (21)*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `🎯 *الهدف:* الوصول لـ 21 أو أقرب رقم منها دون تجاوزها.`,
      ``,
      `🎴 *قيم الأوراق:*`,
      `  A = 1 أو 11 (تلقائياً)`,
      `  J, Q, K = 10`,
      `  2-10 = قيمتها الحقيقية`,
      ``,
      `🔄 *مجرى اللعبة:*`,
      `  1. تبدأ بورقتين، والبوت بورقتين (ورقة مخفية)`,
      `  2. *.سحب* — تأخذ ورقة جديدة`,
      `  3. *.وقف* — توقف، ويلعب البوت`,
      `  4. البوت يسحب حتى يصل لـ 17 أو أكثر`,
      ``,
      `🏆 *كيف تفوز؟*`,
      `  ✅ أقرب لـ 21 من البوت`,
      `  ✅ البوت يتجاوز 21 (bust)`,
      `  🌟 بلاك جاك (A + ورقة 10) في أول ورقتين`,
      ``,
      `💥 *كيف تخسر؟*`,
      `  ❌ تتجاوز 21 (bust)`,
      `  ❌ البوت أقرب لـ 21`,
      ``,
      `📝 *الأوامر:*`,
      `  *.بلاك* — بدء لعبة`,
      `  *.سحب* — أخذ ورقة`,
      `  *.وقف* — الوقوف`,
      `  *.انسحاب* — إلغاء اللعبة`,
    ].join('\n')

    return conn.sendMessage(chatId, { text: guide }, { quoted: m })
  }
}

handler.help    = ['بلاك — لعبة البلاك جاك ضد البوت']
handler.tags    = ['game']
handler.command = /^(بلاك|blackjack|اوراق|21|سحب_ورقة|hit|hit_bj|وقف|stand|وقوف|انسحاب_بلاك|quit_bj|قواعد_بلاك|rules_bj|قواعد_اوراق)$/i

export default handler
