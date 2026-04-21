import { isVip } from '../lib/economy.js'
import cp, { exec as _exec } from 'child_process'
import { promisify } from 'util'
let exec = promisify(_exec).bind(cp)

let handler = async (m, { conn, isROwner, usedPrefix, command, text }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
await m.reply(global.wait)
    if (!isROwner) return
    let ar = Object.keys(plugins)
    let ar1 = ar.map(v => v.replace('.js', ''))
    if (!text) throw `اممم... ما البرنامج المساعد الذي تبحث عنه?\n\nمثال:\n${usedPrefix + command} المطور`
    if (!ar1.includes(text)) return m.reply(`*🗃️ غير معثور عليه!*\n==================================\n\n${ar1.map(v => ' ' + v).join`\n`}\n👤 العضوية: ${vipStatus}`)
    let o
    try {
        o = await exec('cat plugins/' + text + '.js')
    } catch (e) {
        o = e
    } finally {
        let { stdout, stderr } = o
        if (stdout.trim()) m.reply(stdout)
        if (stderr.trim()) m.reply(stderr)
    }
}
handler.help = ['getplugin'].map(v => v + ' <text>')
handler.tags = ['owner']
handler.command = /^(ملف)$/i
handler.rowner = true

export default handler
