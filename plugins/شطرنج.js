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

// ──── Chess.com Board Theme ────
const CELL   = 90;
const MARGIN = 34;
const SIZE   = CELL * 8 + MARGIN * 2;

const LIGHT  = '#EEEED2'; // chess.com cream
const DARK   = '#769656'; // chess.com green
const BORDER = '#4E3629'; // dark mahogany border
const LABEL_LIGHT = '#EEEED2'; // labels on dark border
const COORD_LIGHT = '#769656'; // coord on light squares
const COORD_DARK  = '#EEEED2'; // coord on dark squares

// Piece palette (chess.com style)
const W_FILL   = '#FAFAFA';
const W_STROKE = '#5D4037';
const W_SW     = 2.2;
const B_FILL   = '#2E1503';
const B_STROKE = '#D4C4A0';
const B_SW     = 1.8;

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

// ─── Piece SVG (90×90 coordinate space) ───────────────────────────────────
// ── NEO piece style ─────────────────────────────────────────────────────────
// Bold, geometric, flat — chess.com "Neo" theme
function pieceSVG(piece) {
  const w  = isWhite(piece);
  const F  = w ? W_FILL   : B_FILL;
  const S  = w ? W_STROKE : B_STROKE;
  const SW = (w ? W_SW : B_SW) + 0.8;   // Neo = thicker outlines
  const p  = piece.toLowerCase();
  const inner = w ? '#C8A060' : '#E8D5A3';  // inner accent for Neo

  switch (p) {
    // ── NEO PAWN ─────────────────────────────────────────────────────────
    case 'p': return `
      <circle cx="45" cy="22" r="15" fill="${F}" stroke="${S}" stroke-width="${SW}"/>
      <rect x="38" y="35" width="14" height="8" rx="1"
            fill="${F}" stroke="${S}" stroke-width="${SW}"/>
      <rect x="31" y="43" width="28" height="22" rx="3"
            fill="${F}" stroke="${S}" stroke-width="${SW}"/>
      <rect x="24" y="65" width="42" height="10" rx="5"
            fill="${F}" stroke="${S}" stroke-width="${SW}"/>`;

    // ── NEO ROOK ─────────────────────────────────────────────────────────
    case 'r': return `
      <rect x="24" y="8"  width="11" height="16" rx="2" fill="${F}" stroke="${S}" stroke-width="${SW}"/>
      <rect x="39" y="8"  width="12" height="16" rx="2" fill="${F}" stroke="${S}" stroke-width="${SW}"/>
      <rect x="55" y="8"  width="11" height="16" rx="2" fill="${F}" stroke="${S}" stroke-width="${SW}"/>
      <rect x="20" y="21" width="50" height="7"  rx="1" fill="${F}" stroke="${S}" stroke-width="${SW}"/>
      <rect x="24" y="28" width="42" height="37" rx="2" fill="${F}" stroke="${S}" stroke-width="${SW}"/>
      <rect x="19" y="65" width="52" height="10" rx="5" fill="${F}" stroke="${S}" stroke-width="${SW}"/>`;

    // ── NEO KNIGHT ───────────────────────────────────────────────────────
    case 'n': return `
      <path d="M32,75 L28,55 C24,46 26,36 32,28 C36,22 44,12 54,9
               C60,7 66,9 68,16 C70,24 64,30 60,34
               L66,45 C70,54 68,65 64,72 L68,75 Z"
            fill="${F}" stroke="${S}" stroke-width="${SW}" stroke-linejoin="round"/>
      <ellipse cx="50" cy="17" rx="5" ry="4"
               fill="${inner}" stroke="none"/>
      <line x1="34" y1="42" x2="58" y2="42"
            stroke="${S}" stroke-width="1.8" opacity="0.5"/>
      <rect x="22" y="66" width="46" height="10" rx="5"
            fill="${F}" stroke="${S}" stroke-width="${SW}"/>`;

    // ── NEO BISHOP ───────────────────────────────────────────────────────
    case 'b': return `
      <circle cx="45" cy="9" r="7" fill="${F}" stroke="${S}" stroke-width="${SW}"/>
      <rect x="42" y="15" width="6" height="8" rx="1"
            fill="${F}" stroke="${S}" stroke-width="${SW}"/>
      <ellipse cx="45" cy="34" rx="14" ry="16"
               fill="${F}" stroke="${S}" stroke-width="${SW}"/>
      <rect x="33" y="48" width="24" height="7" rx="3"
            fill="${F}" stroke="${S}" stroke-width="${SW}"/>
      <polygon points="30,55 60,55 65,65 25,65"
               fill="${F}" stroke="${S}" stroke-width="${SW}" stroke-linejoin="round"/>
      <rect x="22" y="65" width="46" height="10" rx="5"
            fill="${F}" stroke="${S}" stroke-width="${SW}"/>`;

    // ── NEO QUEEN ────────────────────────────────────────────────────────
    case 'q': return `
      <circle cx="45" cy="9"  r="8"   fill="${F}" stroke="${S}" stroke-width="${SW}"/>
      <circle cx="16" cy="24" r="6.5" fill="${F}" stroke="${S}" stroke-width="${SW}"/>
      <circle cx="74" cy="24" r="6.5" fill="${F}" stroke="${S}" stroke-width="${SW}"/>
      <circle cx="45" cy="24" r="5"   fill="${F}" stroke="${S}" stroke-width="${SW - 0.5}"/>
      <polygon points="10,52 16,24 30,40 45,8 60,40 74,24 80,52"
               fill="${F}" stroke="${S}" stroke-width="${SW}" stroke-linejoin="round"/>
      <rect x="16" y="52" width="58" height="14" rx="4"
            fill="${F}" stroke="${S}" stroke-width="${SW}"/>
      <rect x="18" y="66" width="54" height="9"  rx="4"
            fill="${F}" stroke="${S}" stroke-width="${SW}"/>`;

    // ── NEO KING ─────────────────────────────────────────────────────────
    case 'k': return `
      <rect x="41" y="4"  width="8"  height="26" rx="4"
            fill="${F}" stroke="${S}" stroke-width="${SW}"/>
      <rect x="30" y="11" width="30" height="10" rx="4"
            fill="${F}" stroke="${S}" stroke-width="${SW}"/>
      <polygon points="12,52 22,26 36,42 45,10 54,42 68,26 78,52"
               fill="${F}" stroke="${S}" stroke-width="${SW}" stroke-linejoin="round"/>
      <rect x="16" y="52" width="58" height="14" rx="4"
            fill="${F}" stroke="${S}" stroke-width="${SW}"/>
      <rect x="18" y="66" width="54" height="9"  rx="4"
            fill="${F}" stroke="${S}" stroke-width="${SW}"/>`;
  }
  return '';
}

// ─── Board renderer ────────────────────────────────────────────────────────
function buildSvg(game, highlight = null) {
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">`;

  // Outer border
  svg += `<rect width="${SIZE}" height="${SIZE}" fill="${BORDER}" rx="10"/>`;

  // Files (a-h) and ranks (1-8)
  const files = ['a','b','c','d','e','f','g','h'];
  for (let c = 0; c < 8; c++) {
    const cx = MARGIN + c * CELL + CELL / 2;
    svg += `<text x="${cx}" y="${MARGIN - 10}" text-anchor="middle" font-size="15" font-weight="bold"
                  font-family="Arial,sans-serif" fill="${LABEL_LIGHT}">${files[c]}</text>`;
    svg += `<text x="${cx}" y="${MARGIN + CELL * 8 + 22}" text-anchor="middle" font-size="15" font-weight="bold"
                  font-family="Arial,sans-serif" fill="${LABEL_LIGHT}">${files[c]}</text>`;
  }
  for (let r = 0; r < 8; r++) {
    const cy = MARGIN + r * CELL + CELL / 2 + 5;
    svg += `<text x="${MARGIN - 12}" y="${cy}" text-anchor="middle" font-size="15" font-weight="bold"
                  font-family="Arial,sans-serif" fill="${LABEL_LIGHT}">${8 - r}</text>`;
    svg += `<text x="${MARGIN + CELL * 8 + 12}" y="${cy}" text-anchor="middle" font-size="15" font-weight="bold"
                  font-family="Arial,sans-serif" fill="${LABEL_LIGHT}">${8 - r}</text>`;
  }

  // Squares
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const x = MARGIN + c * CELL, y = MARGIN + r * CELL;
      const isLight = (r + c) % 2 === 0;
      const sq = files[c] + (8 - r);
      const isHL = highlight && highlight === sq;
      let squareColor = isLight ? LIGHT : DARK;
      if (isHL) squareColor = '#F6F669'; // chess.com last-move highlight

      svg += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="${squareColor}"/>`;

      // Mini coord label in square corners (chess.com style)
      if (c === 7) {
        svg += `<text x="${x + CELL - 5}" y="${y + 16}" text-anchor="end" font-size="11"
                      font-family="Arial,sans-serif" fill="${isLight ? COORD_LIGHT : COORD_DARK}">${8 - r}</text>`;
      }
      if (r === 7) {
        svg += `<text x="${x + CELL - 5}" y="${y + CELL - 5}" text-anchor="end" font-size="11"
                      font-family="Arial,sans-serif" fill="${isLight ? COORD_LIGHT : COORD_DARK}">${files[c]}</text>`;
      }

      // Piece
      const piece = game.board[r][c];
      if (piece !== '.') {
        svg += `<g transform="translate(${x},${y}) scale(${CELL / 90})">${pieceSVG(piece)}</g>`;
      }
    }
  }

  svg += `</svg>`;
  return svg;
}

async function renderBoard(game, highlight = null) {
  return sharp(Buffer.from(buildSvg(game, highlight))).png({ compressionLevel: 6 }).toBuffer();
}

function findGame(conn, chat, sender) {
  conn.chess = conn.chess || {};
  return Object.values(conn.chess).find(g => g.chat === chat && [g.white, g.black].includes(sender));
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  conn.chess = conn.chess || {};
  const sub  = (args[0] || '').toLowerCase();
  let game   = findGame(conn, m.chat, m.sender);

  // ── End game ──
  if (/^(انهاء|حذف|stop|end)$/i.test(sub) && game) {
    delete conn.chess[game.id];
    return m.reply('♟️ تم إنهاء مباراة الشطرنج.');
  }

  // ── Surrender ──
  if (/^(استسلام|surrender)$/i.test(sub) && game) {
    const winner = game.white === m.sender ? game.black : game.white;
    delete conn.chess[game.id];
    const img = await renderBoard(game);
    return conn.sendMessage(m.chat, {
      image: img,
      caption: `🏳️ استسلم @${m.sender.split('@')[0]}\n🏆 الفائز: @${winner.split('@')[0]}`,
      mentions: [m.sender, winner]
    }, { quoted: m });
  }

  // ── New game or join ──
  if (!game) {
    const waiting = Object.values(conn.chess).find(i => i.chat === m.chat && !i.black);
    if (waiting && waiting.white !== m.sender) {
      waiting.black = m.sender;
      const img = await renderBoard(waiting);
      return conn.sendMessage(m.chat, {
        image: img,
        caption: `♟️ *شطرنج SHADOW — Chess.com Style*\n\n⬜ الأبيض: @${waiting.white.split('@')[0]}\n⬛ الأسود: @${waiting.black.split('@')[0]}\n\n▶️ الأبيض يبدأ أولاً!\n📌 الحركة: *${usedPrefix}${command} e2 e4*\n🏳️ الانسحاب: *${usedPrefix}${command} استسلام*`,
        mentions: [waiting.white, waiting.black]
      }, { quoted: m });
    }
    const id = `chess-${Date.now()}`;
    conn.chess[id] = { id, chat: m.chat, white: m.sender, black: null, turn: 'w', board: cloneBoard() };
    const img = await renderBoard(conn.chess[id]);
    return conn.sendMessage(m.chat, {
      image: img,
      caption: `♟️ *مباراة شطرنج جديدة!*\n\n⬜ الأبيض: @${m.sender.split('@')[0]}\n⏳ انتظار لاعب ثانٍ...\n\n📌 للانضمام اكتب: *${usedPrefix}${command}*`,
      mentions: [m.sender]
    }, { quoted: m });
  }

  if (!game.black) return m.reply('⏳ المباراة بانتظار لاعب ثانٍ.');
  if (m.sender !== (game.turn === 'w' ? game.white : game.black)) return m.reply('⏳ ليس دورك الآن، انتظر.');

  const fr = pos(args[0] || ''), to = pos(args[1] || '');
  if (!fr || !to) return m.reply(`اكتب الحركة هكذا:\n*${usedPrefix}${command} e2 e4*`);

  const legal = legalMove(game, fr, to);
  if (legal !== true) return m.reply(`❌ ${legal}`);

  const piece    = game.board[fr.r][fr.c];
  const captured = game.board[to.r][to.c];
  game.board[to.r][to.c] = piece;
  game.board[fr.r][fr.c] = '.';
  if (piece === 'P' && to.r === 0) game.board[to.r][to.c] = 'Q';
  if (piece === 'p' && to.r === 7) game.board[to.r][to.c] = 'q';

  const toSquare = FILES[to.c] + (8 - to.r);

  if (captured.toLowerCase() === 'k') {
    const img = await renderBoard(game, toSquare);
    delete conn.chess[game.id];
    return conn.sendMessage(m.chat, {
      image: img,
      caption: `🏆 *كش ملك!*\nالفائز: @${m.sender.split('@')[0]} 🎉`,
      mentions: [game.white, game.black]
    }, { quoted: m });
  }

  game.turn = game.turn === 'w' ? 'b' : 'w';
  const nextPlayer = game.turn === 'w' ? game.white : game.black;
  const img = await renderBoard(game, toSquare);

  return conn.sendMessage(m.chat, {
    image: img,
    caption: `♟️ *شطرنج — Chess.com Style*\n\n⬜ @${game.white.split('@')[0]}  vs  ⬛ @${game.black.split('@')[0]}\n\n▶️ الدور: @${nextPlayer.split('@')[0]}\n📌 الحركة: *${usedPrefix}${command} e2 e4*\n🏳️ الانسحاب: *${usedPrefix}${command} استسلام*`,
    mentions: [game.white, game.black]
  }, { quoted: m });
};

handler.help = ['شطرنج', 'chess'];
handler.tags = ['game'];
handler.command = /^(شطرنج|chess)$/i;
export default handler;
