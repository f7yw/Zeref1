let handler = async (m, { conn }) => {
  let prem = global.prems
    .map(v => v.replace(/[^0-9]/g, ''))
    .filter(v => v && v !== conn.user.jid?.split('@')[0])

  if (!prem.length) {
    return conn.sendMessage(m.chat, { text: '▢ *لا يوجد مستخدمون مميزون حالياً*' }, { quoted: m })
  }

  let teks = `▢ *المستخدمين البريميوم*\n─────────────\n`
  let mentions = []

  for (let num of prem) {
    const jid = num + '@s.whatsapp.net'
    mentions.push(jid)

    let name = `+${num}`
    try {
      const fetched = conn.getName(jid)
      if (fetched && fetched !== 'undefined' && fetched !== num) name = fetched
    } catch {}

    teks += `❈↲ ${name}\n`
  }

  await conn.sendMessage(m.chat, { text: teks, mentions }, { quoted: m })
}

handler.help = ['listprem']
handler.tags = ['main']
handler.command = ['listprem', 'المميزين', 'البريميوم']

export default handler
