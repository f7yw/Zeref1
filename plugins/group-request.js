import { isVip } from '../lib/economy.js'
let handler = async (m, { conn, text, command }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  global.db.data.groupRequests ||= {}
  global.db.data.groupRequestCooldown ||= {}

  const cmd = (command || '').toLowerCase()
  const input = (text || '').trim()
  const now = Date.now()

  sweepExpiredRequests()

  // ===== طلب =====
  if (cmd === 'طلب' || cmd === 'joinrequest') {
    const invite = extractInvite(input)
    if (!invite) throw '❌ أرسل رابط مجموعة صحيح'

    const last = global.db.data.groupRequestCooldown[m.sender] || 0
    if (now - last < 5 * 60 * 1000) {
      const wait = Math.ceil((5 * 60 * 1000 - (now - last)) / 1000)
      throw `⏳ انتظر ${wait} ثانية قبل إرسال طلب جديد`
    }

    const duplicate = Object.entries(global.db.data.groupRequests).find(([_, r]) =>
      r.status === 'pending' &&
      r.from === m.sender &&
      r.code === invite.code
    )

    if (duplicate) {
      const [id] = duplicate
      return m.reply(`✅ عندك طلب معلّق بالفعل\n🆔 ID: ${id}\n👤 العضوية: ${vipStatus}`)
    }

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6).toUpperCase()

    const req = {
      id,
      from: m.sender,
      fromName: m.pushName || m.sender.split('@')[0],
      link: invite.link,
      code: invite.code,
      reason: invite.reason || '',
      status: 'pending',
      createdAt: now,
      expiresAt: now + 24 * 60 * 60 * 1000,
      decidedBy: null,
      decidedAt: null
    }

    global.db.data.groupRequests[id] = req
    global.db.data.groupRequestCooldown[m.sender] = now

    await notifyOwners(conn, req)

    return m.reply(
`✅ تم تسجيل الطلب

🆔 ID: ${id}
⏳ بانتظار موافقة المالك\n👤 العضوية: ${vipStatus}`
    )
  }

  // ===== قبول =====
  if (cmd === 'قبول' || cmd === 'accept') {
    if (!isOwner(m)) throw '❌ هذا الأمر للمالك فقط'

    const id = input.split(/\s+/)[0]
    if (!id) throw '❌ اكتب: قبول <ID>'

    const req = global.db.data.groupRequests[id]
    if (!req) throw '❌ الطلب غير موجود'

    if (req.status !== 'pending') {
      throw `❌ تم التعامل مع الطلب مسبقًا: ${req.status}`
    }

    if (now > req.expiresAt) {
      req.status = 'expired'
      throw '❌ انتهت صلاحية الطلب'
    }

    try {
      await conn.groupAcceptInvite(req.code)
      req.status = 'approved'
      req.decidedBy = m.sender
      req.decidedAt = now

      await safeNotify(conn, req.from, `✅ تمت الموافقة على طلبك\n🆔 ID: ${req.id}`)
      return m.reply(`✅ تم قبول الطلب\n🆔 ID: ${req.id}\n👤 العضوية: ${vipStatus}`)
    } catch (e) {
      console.error(e)
      req.status = 'failed'
      req.decidedBy = m.sender
      req.decidedAt = now
      throw '❌ فشل قبول الدعوة'
    }
  }

  // ===== رفض =====
  if (cmd === 'رفض' || cmd === 'reject') {
    if (!isOwner(m)) throw '❌ هذا الأمر للمالك فقط'

    const id = input.split(/\s+/)[0]
    if (!id) throw '❌ اكتب: رفض <ID>'

    const req = global.db.data.groupRequests[id]
    if (!req) throw '❌ الطلب غير موجود'

    if (req.status !== 'pending') {
      throw `❌ تم التعامل مع الطلب مسبقًا: ${req.status}`
    }

    req.status = 'rejected'
    req.decidedBy = m.sender
    req.decidedAt = now

    await safeNotify(conn, req.from, `❌ تم رفض طلبك\n🆔 ID: ${req.id}`)
    return m.reply(`❌ تم رفض الطلب\n🆔 ID: ${req.id}\n👤 العضوية: ${vipStatus}`)
  }

  // ===== قائمة =====
  if (cmd === 'طلبات' || cmd === 'list') {
    if (!isOwner(m)) throw '❌ هذا الأمر للمالك فقط'

    const reqs = Object.entries(global.db.data.groupRequests)
      .filter(([_, r]) => r.status === 'pending')
      .sort((a, b) => a[1].createdAt - b[1].createdAt)

    if (!reqs.length) return m.reply('لا يوجد طلبات معلقة')

    let txt = '📋 الطلبات المعلقة:\n\n'
    for (const [id, r] of reqs) {
      const mins = Math.max(1, Math.ceil((r.expiresAt - now) / 60000))
      txt += `🆔 ${id}\n👤 ${r.fromName}\n🔗 ${r.link}\n⏳ تبقى: ${mins} دقيقة\n`
      if (r.reason) txt += `📝 السبب: ${r.reason}\n`
      txt += '\n'
    }

    return m.reply(txt.trim())
  }

  return true
}

handler.help = ['طلب <رابط>', 'قبول <id>', 'رفض <id>', 'طلبات']
handler.tags = ['group']
handler.command = /^(طلب|joinrequest|قبول|accept|رفض|reject|طلبات|list)$/i
handler.register = false
handler.limit = false

export default handler

function extractInvite(text = '') {
  const match = text.match(/(?:https?:\/\/)?chat\.whatsapp\.com\/([0-9A-Za-z]+)/i)
  if (!match) return null

  return {
    code: match[1],
    link: match[0].startsWith('http') ? match[0] : `https://${match[0]}`,
    reason: text.replace(match[0], '').trim()
  }
}

function isOwner(m) {
  const senderNum = m.sender.split('@')[0].replace(/\D/g, '')
  const owners = global.owner || global.owners || []
  return owners.some(item => {
    const num = Array.isArray(item) ? item[0] : item
    return String(num).replace(/\D/g, '') === senderNum
  })
}

function getOwnerJids() {
  const owners = global.owner || global.owners || []
  const out = []
  for (const item of owners) {
    const num = Array.isArray(item) ? item[0] : item
    if (!num) continue
    out.push(String(num).replace(/\D/g, '') + '@s.whatsapp.net')
    out.push(String(num).replace(/\D/g, '') + '@lid')
  }
  return [...new Set(out)]
}

async function notifyOwners(conn, req) {
  const owners = getOwnerJids()
  const text =
`📩 طلب دخول جديد

🆔 ID: ${req.id}
👤 من: ${req.fromName} (${req.from.split('@')[0]})
🔗 الرابط: ${req.link}
${req.reason ? `📝 السبب: ${req.reason}\n` : ''}⏳ الصلاحية: 24 ساعة

للتحكم:
- قبول ${req.id}
- رفض ${req.id}`

  for (const owner of owners) {
    try {
      await conn.sendMessage(owner, { text }, { quoted: null })
    } catch (e) {
      console.error('[notifyOwners]', e)
    }
  }
}

async function safeNotify(conn, jid, text) {
  try {
    await conn.sendMessage(jid, { text }, { quoted: null })
  } catch (e) {
    console.error('[safeNotify]', e)
  }
}

function sweepExpiredRequests() {
  if (!global.db?.data?.groupRequests) return

  const now = Date.now()
  for (const req of Object.values(global.db.data.groupRequests)) {
    if (req.status === 'pending' && now > req.expiresAt) {
      req.status = 'expired'
      req.decidedAt = now
    }
  }
}