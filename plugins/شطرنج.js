import sharp from 'sharp';

const FILES = 'abcdefgh';
const START = [
  ['r','n','b','q','k','b','n','r'],
  ['p','p','p','p','p','p','p','p'],
  ['.','.','.','.','.','.','.','.',],
  ['.','.','.','.','.','.','.','.',],
  ['.','.','.','.','.','.','.','.',],
  ['.','.','.','.','.','.','.','.',],
  ['P','P','P','P','P','P','P','P'],
  ['R','N','B','Q','K','B','N','R']
];

// --- Board style ---
const CELL = 90;
const MARGIN = 36;
const SIZE = CELL * 8 + MARGIN * 2;
const LIGHT = '#F0D9B5';
const DARK  = '#B58863';
const BORDER = '#6B4226';
const LABEL  = '#F5E8D0';

function cloneBoard() { return START.map(r => [...r]); }

function pos(square) {
  if (!/^[a-h][1-8]$/i.test(square)) return null;
  return { r: 8 - Number(square[1]), c: FILES.indexOf(square[0].toLowerCase()) };
}

function isWhite(p) { return p && p !== '.' && p === p.toUpperCase(); }

function pathClear(board, fr, to) {
  const dr = Math.sign(to.r - fr.r), dc = Math.sign(to.c - fr.c);
  let r = fr.r + dr, c = fr.c + dc;
  while (r !== to.r || c !== to.c) { if (board[r][c] !== '.') return false; r+=dr; c+=dc; }
  return true;
}

function legalMove(game, fr, to) {
  const board = game.board, piece = board[fr.r][fr.c], target = board[to.r][to.c];
  if (piece === '.') return 'لا توجد قطعة في هذا المربع.';
  const wt = game.turn === 'w';
  if (isWhite(piece) !== wt) return 'هذه ليست قطعتك الآن.';
  if (target !== '.' && isWhite(target) === wt) return 'لا يمكنك أكل قطعة من نفس اللون.';
  const p = piece.toLowerCase(), dr = to.r - fr.r, dc = to.c - fr.c, adr = Math.abs(dr), adc = Math.abs(dc);
  if (p === 'p') {
    const dir = isWhite(piece) ? -1 : 1, sr = isWhite(piece) ? 6 : 1;
    if (dc === 0 && target === '.' && dr === dir) return true;
    if (dc === 0 && target === '.' && fr.r === sr && dr === dir*2 && board[fr.r+dir][fr.c] === '.') return true;
    if (adc === 1 && dr === dir && target !== '.') return true;
    return 'حركة البيدق غير صحيحة.';
  }
  if (p === 'n') return (adr===2&&adc===1)||(adr===1&&adc===2) || 'حركة الحصان غير صحيحة.';
  if (p === 'b') return (adr===adc&&pathClear(board,fr,to)) || 'حركة الفيل غير صحيحة أو الطريق مغلق.';
  if (p === 'r') return ((dr===0||dc===0)&&pathClear(board,fr,to)) || 'حركة القلعة غير صحيحة أو الطريق مغلق.';
  if (p === 'q') return (((adr===adc)||dr===0||dc===0)&&pathClear(board,fr,to)) || 'حركة الوزير غير صحيحة أو الطريق مغلق.';
  if (p === 'k') return (adr<=1&&adc<=1) || 'حركة الملك غير صحيحة.';
  return 'قطعة غير معروفة.';
}

// ---- SVG Piece Shapes (drawn in 0-90 space, per cell) ----
// Each returns SVG elements for one piece, placed inside a <g> that's already
// translated to the cell's top-left corner.
function pieceSVG(piece) {
  const w = isWhite(piece);
  const fill   = w ? '#FFFDE7' : '#1A1A2E';
  const stroke = w ? '#424242' : '#E0E0E0';
  const sw = 2.5;
  const dot = w ? '#616161' : '#BDBDBD';
  const p = piece.toLowerCase();

  // cx=45, top of useful area=8, bottom=82, so pieces fit in 74px height
  switch (p) {
    case 'p': return `
      <circle cx="45" cy="26" r="13" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
      <polygon points="36,39 54,39 58,68 32,68" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>
      <rect x="28" y="68" width="34" height="8" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;

    case 'r': return `
      <rect x="27" y="10" width="9"  height="14" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
      <rect x="40" y="10" width="9"  height="14" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
      <rect x="54" y="10" width="9"  height="14" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
      <rect x="25" y="22" width="40" height="46" rx="3" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
      <rect x="22" y="68" width="46" height="8" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
      <line x1="25" y1="34" x2="65" y2="34" stroke="${stroke}" stroke-width="1.5" opacity="0.5"/>`;

    case 'n': return `
      <path d="M38,76 L30,60 C26,52 24,44 28,34 C30,28 34,22 40,16 C44,12 50,9 56,10 C60,11 64,14 64,18 C62,17 58,16 55,18 C52,20 52,24 54,30 L62,42 C66,48 66,56 62,64 L66,76 Z" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>
      <circle cx="46" cy="20" r="4" fill="${dot}"/>
      <rect x="26" y="68" width="38" height="8" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;

    case 'b': return `
      <circle cx="45" cy="12" r="5" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
      <line x1="45" y1="17" x2="45" y2="22" stroke="${stroke}" stroke-width="${sw}"/>
      <ellipse cx="45" cy="36" rx="13" ry="16" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
      <polygon points="35,50 55,50 60,68 30,68" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>
      <rect x="27" y="68" width="36" height="8" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;

    case 'q': return `
      <circle cx="45" cy="12" r="7" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
      <circle cx="18" cy="24" r="5" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
      <circle cx="72" cy="24" r="5" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
      <polygon points="12,52 18,24 31,40 45,10 59,40 72,24 78,52" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>
      <ellipse cx="45" cy="64" rx="28" ry="12" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
      <rect x="20" y="70" width="50" height="8" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;

    case 'k': return `
      <rect x="41" y="6"  width="8" height="22" rx="3" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
      <rect x="34" y="12" width="22" height="8" rx="3" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
      <polygon points="14,54 20,28 35,44 45,14 55,44 70,28 76,54" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>
      <ellipse cx="45" cy="64" rx="28" ry="12" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
      <rect x="20" y="70" width="50" height="8" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
  }
  return '';
}

function buildSvg(game) {
  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">`;
  out += `<rect width="${SIZE}" height="${SIZE}" fill="${BORDER}" rx="10"/>`;
  out += `<rect x="${MARGIN-4}" y="${MARGIN-4}" width="${CELL*8+8}" height="${CELL*8+8}" fill="#4A2E1A"/>`;

  // Squares and pieces
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const x = MARGIN + c * CELL, y = MARGIN + r * CELL;
      out += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="${(r+c)%2===0 ? LIGHT : DARK}"/>`;
      const piece = game.board[r][c];
      if (piece !== '.') {
        out += `<g transform="translate(${x},${y}) scale(${CELL/90})">${pieceSVG(piece)}</g>`;
      }
    }
  }

  // Coord labels
  const files = ['a','b','c','d','e','f','g','h'];
  for (let c = 0; c < 8; c++) {
    const x = MARGIN + c * CELL + CELL / 2;
    const color = c % 2 === 0 ? DARK : LIGHT;
    out += `<text x="${x}" y="${MARGIN-10}" text-anchor="middle" font-size="16" fill="${LABEL}" font-family="Arial,sans-serif" font-weight="bold">${files[c]}</text>`;
    out += `<text x="${x}" y="${MARGIN+CELL*8+22}" text-anchor="middle" font-size="16" fill="${LABEL}" font-family="Arial,sans-serif" font-weight="bold">${files[c]}</text>`;
  }
  for (let r = 0; r < 8; r++) {
    const y = MARGIN + r * CELL + CELL/2 + 5;
    out += `<text x="${MARGIN-12}" y="${y}" text-anchor="middle" font-size="16" fill="${LABEL}" font-family="Arial,sans-serif" font-weight="bold">${8-r}</text>`;
    out += `<text x="${MARGIN+CELL*8+12}" y="${y}" text-anchor="middle" font-size="16" fill="${LABEL}" font-family="Arial,sans-serif" font-weight="bold">${8-r}</text>`;
  }

  out += `</svg>`;
  return out;
}

async function renderBoard(game) {
  return sharp(Buffer.from(buildSvg(game))).png({ compressionLevel: 6 }).toBuffer();
}

function findGame(conn, chat, sender) {
  conn.chess = conn.chess || {};
  return Object.values(conn.chess).find(g => g.chat === chat && [g.white, g.black].includes(sender));
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  conn.chess = conn.chess || {};
  const sub = (args[0] || '').toLowerCase();
  let game = findGame(conn, m.chat, m.sender);

  if (/^(انهاء|حذف|stop|end)$/i.test(sub) && game) {
    delete conn.chess[game.id];
    return m.reply('♟️ تم إنهاء مباراة الشطرنج.');
  }

  if (/^(استسلام|surrender)$/i.test(sub) && game) {
    const winner = game.white === m.sender ? game.black : game.white;
    delete conn.chess[game.id];
    const img = await renderBoard(game);
    return conn.sendMessage(m.chat, {
      image: img,
      caption: `🏳️ استسلم @${m.sender.split('@')[0]}\n🏆 الفائز: @${winner.split('@')[0]}\n\n🔗 ${global.md}`,
      mentions: [m.sender, winner]
    }, { quoted: m });
  }

  if (!game) {
    const waiting = Object.values(conn.chess).find(i => i.chat === m.chat && !i.black);
    if (waiting && waiting.white !== m.sender) {
      waiting.black = m.sender;
      const img = await renderBoard(waiting);
      return conn.sendMessage(m.chat, {
        image: img,
        caption: `♟️ *شطرنج SHADOW*\n\n⬜ الأبيض: @${waiting.white.split('@')[0]}\n⬛ الأسود: @${waiting.black.split('@')[0]}\n\nبدأت المباراة — الأبيض يبدأ أولاً\n\n📌 الحركة: *${usedPrefix}${command} e2 e4*\n🏳️ الانسحاب: *${usedPrefix}${command} استسلام*\n\n🔗 ${global.md}`,
        mentions: [waiting.white, waiting.black]
      }, { quoted: m });
    }
    const id = `chess-${Date.now()}`;
    conn.chess[id] = { id, chat: m.chat, white: m.sender, black: null, turn: 'w', board: cloneBoard() };
    return m.reply(`♟️ *تم إنشاء مباراة شطرنج!*\n\nلينضم لاعب آخر يكتب:\n*${usedPrefix}${command}*\n\n🔗 ${global.md}`);
  }

  if (!game.black) return m.reply('⏳ المباراة بانتظار لاعب ثاني.');
  if (m.sender !== (game.turn === 'w' ? game.white : game.black)) return m.reply('⏳ ليس دورك الآن، انتظر.');

  const fr = pos(args[0] || ''), to = pos(args[1] || '');
  if (!fr || !to) return m.reply(`اكتب الحركة هكذا:\n*${usedPrefix}${command} e2 e4*`);

  const legal = legalMove(game, fr, to);
  if (legal !== true) return m.reply(`❌ ${legal}`);

  const piece = game.board[fr.r][fr.c];
  const captured = game.board[to.r][to.c];
  game.board[to.r][to.c] = piece;
  game.board[fr.r][fr.c] = '.';
  if (piece === 'P' && to.r === 0) game.board[to.r][to.c] = 'Q';
  if (piece === 'p' && to.r === 7) game.board[to.r][to.c] = 'q';

  if (captured.toLowerCase() === 'k') {
    delete conn.chess[game.id];
    const img = await renderBoard(game);
    return conn.sendMessage(m.chat, {
      image: img,
      caption: `🏆 *كش ملك!*\nالفائز: @${m.sender.split('@')[0]}\n\n🔗 ${global.md}`,
      mentions: [game.white, game.black]
    }, { quoted: m });
  }

  game.turn = game.turn === 'w' ? 'b' : 'w';
  const nextPlayer = game.turn === 'w' ? game.white : game.black;
  const img = await renderBoard(game);
  return conn.sendMessage(m.chat, {
    image: img,
    caption: `♟️ *شطرنج SHADOW*\n\n⬜ الأبيض: @${game.white.split('@')[0]}\n⬛ الأسود: @${game.black.split('@')[0]}\n\n▶️ الدور: @${nextPlayer.split('@')[0]}\n📌 الحركة: *${usedPrefix}${command} e2 e4*\n🏳️ الانسحاب: *${usedPrefix}${command} استسلام*`,
    mentions: [game.white, game.black]
  }, { quoted: m });
};

handler.help = ['شطرنج', 'chess'];
handler.tags = ['game'];
handler.command = /^(شطرنج|chess)$/i;
export default handler;
