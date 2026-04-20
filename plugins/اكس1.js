const arabicToNum = { '١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
                      '۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9' }

function normalizeText(raw) {
  if (!raw) return ''
  return raw.trim()
    .replace(/[١-٩۱-۹]/g, d => arabicToNum[d] || d)
    .replace(/^[./#!]\s*/, '')  // strip command prefix if present
    .trim()
}

const WIN_SCORE  = 7000
const PLAY_SCORE = 99

function renderBoard(game) {
  return game.render().map(v => ({
    X: '❎', O: '⭕',
    1: '1️⃣', 2: '2️⃣', 3: '3️⃣',
    4: '4️⃣', 5: '5️⃣', 6: '6️⃣',
    7: '7️⃣', 8: '8️⃣', 9: '9️⃣',
  }[v]))
}

function buildBoardStr(room, statusLine) {
  const arr = renderBoard(room.game)
  return `╭────『 🎮 لعبة XO 』────
│
│ ❎ = @${room.game.playerX.split('@')[0]}
│ ⭕ = @${room.game.playerO.split('@')[0]}
│
│   ${arr.slice(0, 3).join('')}
│   ${arr.slice(3, 6).join('')}
│   ${arr.slice(6).join('')}
│
│ ${statusLine}
╰──────────────────`.trim()
}

async function sendToRoom(conn, room, text, m) {
  const opts = { mentions: conn.parseMention(text) }
  await conn.sendMessage(room.x, { text, ...opts }, { quoted: m })
  if (room.o && room.o !== room.x) {
    await conn.sendMessage(room.o, { text, ...opts }, { quoted: m })
  }
}

export async function before(m) {
  // Skip bot's own messages
  if (m.isBaileys) return true

  this.game = this.game || {}

  // Find a room where this sender is playing
  const room = Object.values(this.game).find(r =>
    r.id && r.game && r.state === 'PLAYING' &&
    [r.game.playerX, r.game.playerO].includes(m.sender)
  )
  if (!room) return true

  const normalized = normalizeText(m.text)
  const isSurrender = /^(استسلم|nyerah|surrender)$/i.test(normalized)
  const isNumber    = /^[1-9]$/.test(normalized)

  // Not a game input — let other handlers run
  if (!isNumber && !isSurrender) return true

  // Not their turn
  if (!isSurrender && m.sender !== room.game.currentTurn) {
    await m.reply(`⏳ ليس دورك! دور @${room.game.currentTurn.split('@')[0]}`, null, { mentions: [room.game.currentTurn] })
    return false
  }

  let ok = 1

  if (!isSurrender) {
    ok = room.game.turn(m.sender === room.game.playerO, parseInt(normalized) - 1)
    if (ok < 1) {
      const errMsg = {
        '-3': '⚠️ اللعبة منتهية بالفعل!',
        '-2': '❌ خطأ في اللعب!',
        '-1': '❌ الرقم خارج النطاق (1-9)!',
        0:    '🚫 هذه الخانة مشغولة! اختر خانة أخرى.',
      }[ok] || '❌ خطأ غير معروف'
      await m.reply(errMsg)
      return false
    }
  }

  if (isSurrender) {
    // Make the current player the loser
    room.game._currentTurn = (m.sender === room.game.playerX)
  }

  const isWin = isSurrender
    ? room.game.currentTurn !== m.sender  // the enemy wins on surrender
    : !!room.game.winner
  const isTie = !isWin && room.game.board === 511

  const winner = isSurrender ? room.game.currentTurn : room.game.winner

  let statusLine
  if (isWin) {
    statusLine = `🏆 مبروك @${winner.split('@')[0]}! فزت! 🎉`
  } else if (isTie) {
    statusLine = `🤝 تعادل! لعبة رائعة من الطرفين`
  } else {
    statusLine = `⌛ دورك @${room.game.currentTurn.split('@')[0]}`
  }

  const str = buildBoardStr(room, statusLine)

  // Update XP
  if (isTie || isWin) {
    const users = global.db.data.users
    if (users[room.game.playerX]) users[room.game.playerX].exp = (users[room.game.playerX].exp || 0) + PLAY_SCORE
    if (users[room.game.playerO]) users[room.game.playerO].exp = (users[room.game.playerO].exp || 0) + PLAY_SCORE
    if (isWin && users[winner])   users[winner].exp = (users[winner].exp || 0) + (WIN_SCORE - PLAY_SCORE)
    delete this.game[room.id]
  }

  await sendToRoom(this, room, str, m)
  return false  // stop further processing for this move
}
