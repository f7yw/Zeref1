import { isVip } from '../lib/economy.js'

const ROWS = 6
const COLS = 7
const WIN_SCORE = 1500
const PLAY_SCORE = 100

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill('⚪'))
}

function renderBoard(board) {
  let str = '1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣\n'
  for (let r = 0; r < ROWS; r++) {
    str += board[r].join('') + '\n'
  }
  return str.trim()
}

function checkWin(board, player) {
  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      if (board[r][c] === player && board[r][c+1] === player && board[r][c+2] === player && board[r][c+3] === player) return true
    }
  }
  // Vertical
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] === player && board[r+1][c] === player && board[r+2][c] === player && board[r+3][c] === player) return true
    }
  }
  // Diagonal (down-right)
  for (let r = 0; r < ROWS - 3; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      if (board[r][c] === player && board[r+1][c+1] === player && board[r+2][c+2] === player && board[r+3][c+3] === player) return true
    }
  }
  // Diagonal (up-right)
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c < COLS - 3; c++) {
      if (board[r][c] === player && board[r-1][c+1] === player && board[r-2][c+2] === player && board[r-3][c+3] === player) return true
    }
  }
  return false
}

function isFull(board) {
  return board[0].every(cell => cell !== '⚪')
}

async function buildBoardStr(conn, room, statusLine) {
  const getName = async (jid) => {
    try { return await conn.getName(jid) } catch { return jid.split('@')[0] }
  }
  const name1 = await getName(room.player1)
  const name2 = await getName(room.player2)
  const vip1 = isVip(room.player1) ? '💎 مميز' : '❌ عادي'
  const vip2 = isVip(room.player2) ? '💎 مميز' : '❌ عادي'

  return `╭────『 🎮 لعبة Connect 4 』────
│
│ 🔴 = ${name1} (@${room.player1.split('@')[0]}) 👤 العضوية: ${vip1}
│ 🟡 = ${name2} (@${room.player2.split('@')[0]}) 👤 العضوية: ${vip2}
│
${renderBoard(room.board)}
│
│ ${statusLine}
│
│ 💡 أرسل رقماً من 1-7 لتحديد العمود
│    أو "استسلم" للاستسلام
╰──────────────────`.trim()
}

let handler = async (m, { conn, usedPrefix, command, text }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  conn.c4 = conn.c4 || {}

  const getName = async (jid) => {
    try { return await conn.getName(jid) } catch { return jid.split('@')[0] }
  }

  const existing = Object.values(conn.c4).find(r =>
    [r.player1, r.player2].includes(m.sender)
  )
  if (existing) {
    return m.reply(`*❗ أنت بالفعل في لعبة نشطة!*\n\nأرسل رقماً (1-7) للعب أو "استسلم" للخروج.\n👤 العضوية: ${vipStatus}`)
  }

  if (!text) {
    return m.reply(
`╭────『 🎮 Connect 4 』────
│
│ إنشاء روم أو الانضمام:
│ *${usedPrefix}${command} اسم_الروم*
│
│ مثال:
│   ${usedPrefix}${command} روم1
│
│ ─── كيف تلعب؟ ───
│ • أرسل رقم (1-7) لتضع قرصك
│ • الهدف: تكوين 4 أقراص متتالية
│
│ 👤 العضوية: ${vipStatus}
╰──────────────────`.trim()
    )
  }

  const waitingRoom = Object.values(conn.c4).find(r =>
    r.state === 'WAITING' && r.name === text
  )

  if (waitingRoom) {
    if (waitingRoom.player1 === m.sender) {
      return m.reply(`❗ لا يمكنك الانضمام إلى روم أنشأته أنت!\n👤 العضوية: ${vipStatus}`)
    }

    waitingRoom.player2 = m.sender
    waitingRoom.state   = 'PLAYING'

    const nameTurn = await getName(waitingRoom.turn)
    const str = await buildBoardStr(conn, waitingRoom, `⌛ دورك ${nameTurn} (@${waitingRoom.turn.split('@')[0]})`)

    await m.reply(`*✅ تم الانضمام! اللعبة تبدأ الآن...*\n👤 العضوية: ${vipStatus}`)
    await conn.sendMessage(m.chat, { text: str, mentions: [waitingRoom.player1, waitingRoom.player2] }, { quoted: m })

  } else {
    const room = {
      id:      'c4-' + Date.now(),
      chat:    m.chat,
      player1: m.sender,
      player2: null,
      board:   createBoard(),
      turn:    m.sender,
      state:   'WAITING',
      name:    text,
    }
    conn.c4[room.id] = room

    await m.reply(
`╭────『 🎮 Connect 4 』────
│
│ 🕹️ تم إنشاء الروم: *"${text}"*
│
│ ⏳ في انتظار اللاعب الثاني...
│
│ للانضمام:
│ *${usedPrefix}${command} ${text}*
│
│ 👤 العضوية: ${vipStatus}
╰──────────────────`.trim()
    )
  }
}

handler.before = async function (m) {
  this.c4 = this.c4 || {}
  const room = Object.values(this.c4).find(r =>
    r.state === 'PLAYING' && [r.player1, r.player2].includes(m.sender)
  )
  if (!room) return true

  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => {
    try { return await this.getName(jid) } catch { return jid.split('@')[0] }
  }

  const text = m.text.trim().toLowerCase()
  const isSurrender = /^(استسلم|surrender)$/i.test(text)
  const isNumber    = /^[1-7]$/.test(text)

  if (!isNumber && !isSurrender) return true

  if (!isSurrender && m.sender !== room.turn) {
    const nameTurn = await getName(room.turn)
    await m.reply(`⏳ ليس دورك! دور ${nameTurn} (@${room.turn.split('@')[0]})\n👤 العضوية: ${vipStatus}`, null, { mentions: [room.turn] })
    return false
  }

  if (isSurrender) {
    const winner = room.player1 === m.sender ? room.player2 : room.player1
    const winnerName = await getName(winner)
    const loserName = await getName(m.sender)
    const str = await buildBoardStr(this, room, `🏳️ استسلم ${loserName}\n🏆 الفائز: ${winnerName}`)
    await this.sendMessage(m.chat, { text: `${str}\n👤 العضوية: ${vipStatus}`, mentions: [room.player1, room.player2] }, { quoted: m })
    delete this.c4[room.id]
    return false
  }

  const col = parseInt(text) - 1
  let row = -1
  for (let r = ROWS - 1; r >= 0; r--) {
    if (room.board[r][col] === '⚪') {
      row = r
      break
    }
  }

  if (row === -1) {
    await m.reply(`🚫 هذا العمود ممتلئ! اختر عموداً آخر.\n👤 العضوية: ${vipStatus}`)
    return false
  }

  const piece = room.turn === room.player1 ? '🔴' : '🟡'
  room.board[row][col] = piece

  if (checkWin(room.board, piece)) {
    const winnerName = await getName(room.turn)
    const str = await buildBoardStr(this, room, `🏆 مبروك ${winnerName}! فزت! 🎉`)
    await this.sendMessage(m.chat, { text: `${str}\n👤 العضوية: ${vipStatus}`, mentions: [room.player1, room.player2] }, { quoted: m })
    
    const users = global.db.data.users
    if (users[room.player1]) users[room.player1].exp = (users[room.player1].exp || 0) + PLAY_SCORE
    if (users[room.player2]) users[room.player2].exp = (users[room.player2].exp || 0) + PLAY_SCORE
    if (users[room.turn])   users[room.turn].exp = (users[room.turn].exp || 0) + (WIN_SCORE - PLAY_SCORE)
    
    delete this.c4[room.id]
    return false
  }

  if (isFull(room.board)) {
    const str = await buildBoardStr(this, room, `🤝 تعادل!`)
    await this.sendMessage(m.chat, { text: `${str}\n👤 العضوية: ${vipStatus}`, mentions: [room.player1, room.player2] }, { quoted: m })
    delete this.c4[room.id]
    return false
  }

  room.turn = room.turn === room.player1 ? room.player2 : room.player1
  const nameNext = await getName(room.turn)
  const str = await buildBoardStr(this, room, `⌛ دورك ${nameNext} (@${room.turn.split('@')[0]})`)
  await this.sendMessage(m.chat, { text: `${str}\n👤 العضوية: ${vipStatus}`, mentions: [room.player1, room.player2] }, { quoted: m })
  
  return false
}

handler.help = ['connect4', 'c4']
handler.tags = ['game']
handler.command = /^(connect4|c4|اربعة|أربعة)$/i

export default handler
