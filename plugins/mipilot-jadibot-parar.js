let handler  = async (m, { conn }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
    if (global.conn.user.jid == conn.user.jid)conn.ws.close();
    
  }
  handler.help = ['berhenti','stop']
  handler.tags = ['General']
  handler.command = /^(إعادة)$/i
  handler.owner = true
  handler.mods = false
  handler.premium = false
  handler.group = false
  handler.private = false
  
  handler.admin = false
  handler.botAdmin = false
  
  handler.fail = null
  
  export default handler