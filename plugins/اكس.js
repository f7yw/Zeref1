import TicTacToe from '../lib/tictactoe.js'

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
│
│ 💡 أرسل رقماً من 1-9 لتحديد خانتك
│    أو "استسلم" للاستسلام
╰──────────────────`.trim()
}

async function sendToRoom(conn, room, text, m) {
  const opts = { mentions: conn.parseMention(text) }
  await conn.sendMessage(room.x, { text, ...opts }, { quoted: m })
  // Only send to O's chat if it's a different chat (DM mode)
  if (room.o && room.o !== room.x) {
    await conn.sendMessage(room.o, { text, ...opts }, { quoted: m })
  }
}

let handler = async (m, { conn, usedPrefix, command, text }) => {
  conn.game = conn.game || {}

  // Check if sender is already in a game
  const existing = Object.values(conn.game).find(r =>
    r.id?.startsWith('tictactoe') &&
    r.game && [r.game.playerX, r.game.playerO].includes(m.sender)
  )
  if (existing) {
    return m.reply(`*❗ أنت بالفعل في لعبة نشطة!*\n\nأرسل رقماً (1-9) للعب أو "استسلم" للخروج.`)
  }

  if (!text) {
    return m.reply(
`╭────『 🎮 إكس أو (XO) 』────
│
│ إنشاء روم أو الانضمام:
│ *${usedPrefix}${command} اسم_الروم*
│
│ مثال:
│   ${usedPrefix}${command} روم1
│
│ ─── كيف تلعب؟ ───
│ • أرسل رقم (1-9) لتضع علامتك
│ • الشبكة مرقّمة هكذا:
│   1️⃣2️⃣3️⃣
│   4️⃣5️⃣6️⃣
│   7️⃣8️⃣9️⃣
╰──────────────────`.trim()
    )
  }

  // Try to join existing waiting room
  const waitingRoom = Object.values(conn.game).find(r =>
    r.state === 'WAITING' && r.name === text
  )

  if (waitingRoom) {
    if (waitingRoom.game.playerX === m.sender) {
      return m.reply('❗ لا يمكنك الانضمام إلى روم أنشأته أنت!')
    }

    waitingRoom.o           = m.chat
    waitingRoom.game.playerO = m.sender
    waitingRoom.state       = 'PLAYING'

    const str = buildBoardStr(
      waitingRoom,
      `⌛ دورك @${waitingRoom.game.currentTurn.split('@')[0]}`
    )

    await m.reply('*✅ تم الانضمام! اللعبة تبدأ الآن...*')
    // Send board only once (sendToRoom handles deduplication)
    await sendToRoom(conn, waitingRoom, str, m)

  } else {
    // Create new room
    const room = {
      id:    'tictactoe-' + Date.now(),
      x:     m.chat,
      o:     '',
      game:  new TicTacToe(m.sender, 'pending'),
      state: 'WAITING',
      name:  text,
    }
    conn.game[room.id] = room

    await m.reply(
`╭────『 🎮 لعبة XO 』────
│
│ 🕹️ تم إنشاء الروم: *"${text}"*
│
│ ⏳ في انتظار اللاعب الثاني...
│
│ للانضمام:
│ *${usedPrefix}${command} ${text}*
│
│ ─── الشبكة ───
│   1️⃣2️⃣3️⃣
│   4️⃣5️⃣6️⃣
│   7️⃣8️⃣9️⃣
╰──────────────────`.trim()
    )
  }
}

handler.help    = ['اكس <اسم_الروم>']
handler.tags    = ['game']
handler.command = /^(tictactoe|ttt|xo|اكس|لعبه)$/i
export default handler
