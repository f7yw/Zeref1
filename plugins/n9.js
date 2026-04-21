import { isVip } from '../lib/economy.js'
const handler = async (m, {conn, args, groupMetadata, participants, usedPrefix, command, isBotAdmin, isSuperAdmin}) => {
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  if (!args[0]) return m.reply(`*[❗] ادخل رمز الدوله للبحث عن الارقام في هذه المجموعه من تلك الدوله، مثال: ${usedPrefix + command} 20*\n👤 العضوية: ${vipStatus}`);
  if (isNaN(args[0])) return m.reply(`*[❗] ادخل رمز الدوله للبحث عن الارقام في هذه المجموعه من تلك الدوله، مثال: ${usedPrefix + command} 20*\n👤 العضوية: ${vipStatus}`);
  const lol = args[0].replace(/[+]/g, '');
  const ps = participants.map((u) => u.id).filter((v) => v !== conn.user.jid && v.startsWith(lol || lol));
  const bot = global.db.data.settings[conn.user.jid] || {};
  if (ps == '') return m.reply(`*[❗] لا يوجد في هذه المجموعه ارقاام بمثل هذه البادئه +${lol}*\n👤 العضوية: ${vipStatus}`);
  const numeros = ps.map((v)=> '⭔ @' + v.replace(/@.+/, ''));
  const delay = (time) => new Promise((res)=>setTimeout(res, time));
  switch (command) {
    case 'قائمه-ارقام':
      conn.reply(m.chat, `*الارقام الي بتبدا ب +${lol} الي في المجموعه ذي:*\n\n` + numeros.join`\n`, m, {mentions: ps});
      break;
    case 'اطرد-ارقام':
      if (!bot.restrict) return m.reply('*[❗𝐈𝐍𝐅𝐎❗] المطور مو مفعل الطرد عشان بيبند رقم البوت*');
      if (!isBotAdmin) return m.reply('*[❗𝐈𝐍𝐅𝐎❗] البوت مو ادمن، مبعرف اطرد المستخدم*');
      conn.reply(m.chat, `*[❗] 𝙸𝙽𝙸𝙲𝙸𝙰𝙽𝙳𝙾 𝙴𝙻𝙸𝙼𝙸𝙽𝙰𝙲𝙸𝙾𝙽 𝙳𝙴 𝙽𝚄𝙼𝙴𝚁𝙾𝚂 𝙲𝙾𝙽 𝙴𝙻 𝙿𝚁𝙴𝙵𝙸𝙹𝙾 +${lol}, 𝙲𝙰𝙳𝙰 𝟷0 𝚂𝙴𝙶𝚄𝙽𝙳𝙾𝚂 𝚂𝙴 𝙴𝙻𝙸𝙼𝙸𝙽𝙰𝚁𝙰 𝙰 𝚄𝙽 𝚄𝚂𝚄𝙰𝚁𝙸𝙾*\n👤 العضوية: ${vipStatus}`, m);
      const ownerGroup = m.chat.split`-`[0] + '@s.whatsapp.net';
      const users = participants.map((u) => u.id).filter((v) => v !== conn.user.jid && v.startsWith(lol || lol));
      for (const user of users) {
        const error = `@${user.split('@')[0]} ʏᴀ ʜᴀ sɪᴅᴏ ᴇʟɪᴍɪɴᴀᴅᴏ ᴏ ʜᴀ ᴀʙᴀɴᴅᴏɴᴀᴅᴏ ᴇʟ ɢʀᴜᴘᴏ*`;
        if (user !== ownerGroup + '@s.whatsapp.net' && user !== global.conn.user.jid && user !== global.owner + '@s.whatsapp.net' && user.startsWith(lol || lol) && user !== isSuperAdmin && isBotAdmin && bot.restrict) {
          await delay(2000);
          const responseb = await conn.groupParticipantsUpdate(m.chat, [user], 'remove');
          if (responseb[0].status === '404') m.reply(error, m.chat, {mentions: conn.parseMention(error)});
          await delay(10000);
        } else return m.reply('*[❗] ايرور*');
      }
      break;
  }
};
handler.command = /^(ارقام|مفتاح-الارقام)$/i;
handler.owner = true;
handler.fail = null;
export default handler;
