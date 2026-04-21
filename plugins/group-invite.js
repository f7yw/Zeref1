/**
 * 📨 دعوة عضو للقروب
 * ─────────────────────
 * .دعوة <رقم/منشن>           → يحاول إضافته للقروب مباشرة. إذا منع
 *                              إعدادات الخصوصية، يرسل له رابط الدعوة في الخاص.
 * .دعوة_جماعية رقم1 رقم2 ...  → دعوة دفعة واحدة
 *
 * يحتاج: المُستدعي مشرف + البوت مشرف.
 */

function parseTargets(m, args, text) {
  const out = new Set()
  for (const j of (m.mentionedJid || [])) if (j) out.add(j)
  if (m.quoted?.sender) out.add(m.quoted.sender)
  // أرقام مكتوبة
  const digits = (text || args.join(' ') || '').match(/\d{7,15}/g) || []
  for (const d of digits) out.add(`${d}@s.whatsapp.net`)
  return [...out]
}

let handler = async (m, { conn, args, text, command, isAdmin, isBotAdmin }) => {
  if (!m.isGroup) throw '❌ هذا الأمر يعمل داخل القروبات فقط.'
  if (!isAdmin)    throw '❌ يجب أن تكون مشرفاً لاستخدام هذا الأمر.'
  if (!isBotAdmin) throw '❌ يجب أن أكون مشرفاً في القروب أولاً.'

  const targets = parseTargets(m, args, text)
  if (!targets.length) {
    return m.reply(
`╭───『 📨 دعوة للقروب 』
│
│ *الاستخدام:*
│ • .دعوة 9677xxxxxxxx
│ • .دعوة @عضو
│ • .دعوة 9677xxxxxxxx 9677yyyyyyyy
│
│ سأحاول إضافتهم مباشرة، وإن منعت إعداداتهم
│ ذلك → سأرسل لهم رابط الدعوة في الخاص.
╰────────`)
  }

  let inviteCode = null
  try { inviteCode = await conn.groupInviteCode(m.chat) } catch {}
  const inviteUrl = inviteCode ? `https://chat.whatsapp.com/${inviteCode}` : null

  let added = 0, sentLink = 0, failed = 0
  const lines = []
  let groupName = m.chat
  try { groupName = (await conn.groupMetadata(m.chat))?.subject || m.chat } catch {}

  for (const jid of targets) {
    try {
      const res = await conn.groupParticipantsUpdate(m.chat, [jid], 'add')
      const status = res?.[0]?.status
      // 200 = success ; 403/408 = needs invite link
      if (status === '200' || status === 200) {
        added++
        lines.push(`✅ @${jid.split('@')[0]} — أُضيف مباشرة`)
      } else if ((status === '403' || status === '408' || status === 403 || status === 408) && inviteUrl) {
        // أرسل له رابط الدعوة في الخاص
        try {
          await conn.sendMessage(jid, {
            text:
`📨 *دعوة لمجموعة*

تمّت دعوتك للانضمام إلى:
*${groupName}*

🔗 ${inviteUrl}

— الدعوة من قبل: @${m.sender.split('@')[0]}`,
            mentions: [m.sender]
          })
          sentLink++
          lines.push(`📩 @${jid.split('@')[0]} — أُرسل رابط الدعوة في خاصه`)
        } catch {
          failed++
          lines.push(`❌ @${jid.split('@')[0]} — تعذّر إرسال الرابط`)
        }
      } else {
        failed++
        lines.push(`⚠️ @${jid.split('@')[0]} — كود: ${status || 'unknown'}`)
      }
    } catch (e) {
      failed++
      lines.push(`❌ @${jid.split('@')[0]} — ${e?.message || 'فشل'}`)
    }
  }

  const summary =
`╭───『 📨 نتيجة الدعوة 』
│
│ ✅ أُضيفوا مباشرة: *${added}*
│ 📩 أُرسل لهم الرابط: *${sentLink}*
│ ❌ فشل: *${failed}*
│
│ ${lines.join('\n│ ')}
│
╰────────`
  await conn.sendMessage(m.chat, { text: summary, mentions: targets.concat([m.sender]) }, { quoted: m })
}

handler.command = /^(دعوة|دعوه|invite|دعوة_جماعية|invite_many)$/i
handler.help = ['دعوة <رقم/منشن>']
handler.tags = ['group']
handler.group = true

export default handler
