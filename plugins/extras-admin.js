/**
 * أوامر إضافية لمشرفي المجموعات:
 *   .قائمه_النشطين [عدد]   ← أكثر الأعضاء نشاطاً (افتراضياً 10)
 *   .قائمه_الصامتين [عدد]  ← الأعضاء الأقل نشاطاً
 *   .تنبيه <نص>            ← إعلان رسمي مزخرف لكل الأعضاء (مع منشن)
 *   .كلمة_اليوم <نص>       ← تعيين كلمة/اقتباس اليوم للقروب
 *   .قاعدة_القروب          ← عرض الكلمة/قاعدة اليوم
 */

let handler = async (m, { conn, command, text, isAdmin, isOwner, isBotAdmin, participants }) => {
  const c = String(command || '').toLowerCase().trim()
  if (!m.isGroup) return m.reply('❌ هذه الأوامر للمجموعات فقط.')
  if (!(isAdmin || isOwner)) return m.reply('🚫 هذا الأمر للمشرفين فقط.')

  const chat = global.db.data.chats[m.chat] = global.db.data.chats[m.chat] || {}

  // ───── قائمة النشطين / الصامتين ─────
  if (/^(قائمه_النشطين|قائمة_النشطين|نشطين|الأكثر_نشاطاً|الاكثر_نشاطا|topactive|active)$/i.test(c) ||
      /^(قائمه_الصامتين|قائمة_الصامتين|صامتين|الأقل_نشاطاً|الاقل_نشاطا|silent|inactive)$/i.test(c)) {
    const isSilent = /صامت|الأقل|الاقل|silent|inactive/i.test(c)
    const limit = Math.min(50, Math.max(3, parseInt(String(text||'').replace(/[^\d]/g,'')) || 10))

    // البيانات من السحاب (Supabase) — قراءة من نفس global.db المتزامن مع السحاب
    const users        = global.db.data.users || {}
    const messageStats = (global.db.data.chats?.[m.chat]?.messageStats) || {}

    const memberJids = (participants || [])
      .map(p => p?.id || p?.jid || p?.lid)
      .filter(j => typeof j === 'string' && j.includes('@'))

    // دالة لاستخراج عدد الرسائل الصحيح من البنية الكائنية
    const getMsgCount = (jid) => {
      const u = users[jid] || {}
      // الأولوية: عدّاد القروب نفسه (أدق) ثم عدّاد المستخدم في هذا القروب ثم الإجمالي
      const perChatStat   = Number(messageStats[jid]) || 0
      const perUserGroup  = Number(u.messages?.groups?.[m.chat]) || 0
      const totalMessages = Number(u.messages?.total) || 0
      const legacyCount   = Number(u.messageCount) || 0
      return perChatStat || perUserGroup || totalMessages || legacyCount || 0
    }

    const stats = memberJids.map(jid => ({
      jid,
      msgs: getMsgCount(jid),
      last: Number(users[jid]?.messages?.last) || 0
    }))

    stats.sort((a, b) => isSilent ? (a.msgs - b.msgs) : (b.msgs - a.msgs))
    const top = stats.slice(0, limit)

    const title = isSilent ? '🔕 *الأعضاء الأقل نشاطاً*' : '🔥 *الأعضاء الأكثر نشاطاً*'
    const totalMsgsAll = stats.reduce((a, s) => a + s.msgs, 0)
    let body = `${title}\n${'─'.repeat(28)}\n\n`
    top.forEach((u, i) => {
      const num   = String(u.jid || '').split('@')[0] || '—'
      const when  = u.last ? new Date(u.last).toLocaleDateString('ar-EG') : '—'
      body += `${String(i+1).padStart(2,' ')}. @${num}  —  *${u.msgs}* رسالة  ·  🕒 ${when}\n`
    })
    body += `\n📊 المعروض: *${top.length}* من *${stats.length}* عضو`
    body += `\n💬 إجمالي رسائل القروب المسجّلة: *${totalMsgsAll}*`
    body += `\n☁️ مصدر البيانات: قاعدة السحاب (Supabase)`

    return conn.sendMessage(m.chat, { text: body, mentions: top.map(u => u.jid) }, { quoted: m })
  }

  // ───── تنبيه (إعلان رسمي) ─────
  if (/^(تنبيه|اعلان_رسمي|إعلان_رسمي|announce|notice)$/i.test(c)) {
    const body = String(text || '').trim()
    if (!body) return m.reply('📌 *الاستخدام:* `.تنبيه <نص الإعلان>`')
    const mentions = (participants || []).map(p => p.id || p.jid).filter(Boolean)
    const senderName = (await conn.getName(m.sender).catch(()=>null)) || m.sender.split('@')[0]
    const msg =
`╭━━━『 📢 *تنبيه رسمي* 』━━━╮
│
│ ${body.split('\n').join('\n│ ')}
│
╰━━━━━━━━━━━━━━━━━━━━━╯
👤 من: *${senderName}*
🕒 ${new Date().toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'})}`
    return conn.sendMessage(m.chat, { text: msg, mentions }, { quoted: m })
  }

  // ───── كلمة اليوم (تعيين) ─────
  if (/^(كلمة_اليوم|كلمه_اليوم|قاعدة_اليوم|setrule)$/i.test(c)) {
    const t = String(text || '').trim()
    if (!t) return m.reply('📌 *الاستخدام:* `.كلمة_اليوم <اقتباس أو قاعدة>`')
    chat.dailyRule = t
    chat.dailyRuleAt = Date.now()
    chat.dailyRuleBy = m.sender
    if (typeof global.db.markDirty === 'function') global.db.markDirty()
    return m.reply(`✅ تم حفظ *كلمة/قاعدة اليوم*:\n\n📌 ${t}`)
  }

  // ───── عرض كلمة اليوم ─────
  if (/^(قاعدة_القروب|قاعده_القروب|قاعدة|كلمة_القروب|getrule)$/i.test(c)) {
    if (!chat.dailyRule) return m.reply('📌 لا توجد كلمة/قاعدة محفوظة. استخدم `.كلمة_اليوم <نص>` لإضافتها.')
    const when = chat.dailyRuleAt ? new Date(chat.dailyRuleAt).toLocaleString('ar-EG') : '—'
    return m.reply(
`📜 *كلمة/قاعدة القروب*

${chat.dailyRule}

🕒 آخر تحديث: ${when}`)
  }
}

handler.help    = ['قائمه_النشطين [عدد]','قائمه_الصامتين [عدد]','تنبيه <نص>','كلمة_اليوم <نص>','قاعدة_القروب']
handler.tags    = ['group']
handler.command = /^(قائمه_النشطين|قائمة_النشطين|نشطين|الأكثر_نشاطاً|الاكثر_نشاطا|topactive|active|قائمه_الصامتين|قائمة_الصامتين|صامتين|الأقل_نشاطاً|الاقل_نشاطا|silent|inactive|تنبيه|اعلان_رسمي|إعلان_رسمي|notice|كلمة_اليوم|كلمه_اليوم|قاعدة_اليوم|setrule|قاعدة_القروب|قاعده_القروب|كلمة_القروب|getrule)$/i
handler.group   = true
handler.admin   = true

export default handler
