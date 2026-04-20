let handler = async (m, { conn }) => {
  let prem = global.prems
    .map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
    .filter(v => v != conn.user.jid)

  let teks = `▢ *المستخدمين البريميوم*\n─────────────\n`

  for (let jid of prem) {
    let name = jid.split('@')[0]

    try {
      name = await conn.getName(jid)
    } catch {}

    teks += `❈↲ ${name}\n`
  }

  await conn.sendMessage(
    m.chat,
    {
      text: teks,
      mentions: prem
    },
    { quoted: m }
  )
}

handler.help = ['listprem']
handler.tags = ['main']
handler.command = ['listprem', 'المميزين', 'البريميوم']

export default handler