import { isVip } from '../lib/economy.js'
import MessageType from '@whiskeysockets/baileys'
let handler = async (m, { conn, usedPrefix, command }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
let room = Object.values(conn.game).find(room => room.id.startsWith('tictactoe') && [room.game.playerX, room.game.playerO].includes(m.sender))
if (room == undefined) return conn.sendButton(m.chat, '*[❗] انت لست في لعبه جيم اكس او (اكس او)*', wm, null, [['ابدأ روم جديدة', `${usedPrefix}ttt مباراه جديدة`]], m)
delete conn.game[room.id]
await m.reply('*[ ✔ ]تمت ازاله الروم*')}
handler.command = /^(delttt|deltt|delxo|deltictactoe|ديليت)$/i
handler.fail = null
export default handler