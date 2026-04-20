import { initEconomy, fmt, isVip } from '../lib/economy.js'

// ─── Utility ─────────────────────────────────────────────────────────────────
const msToStr = ms => {
  if (!ms || ms <= 0) return 'غير محدد'
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const parts = []
  if (d) parts.push(`${d}ي`)
  if (h) parts.push(`${h}س`)
  if (m) parts.push(`${m}د`)
  return parts.join(' ') || 'أقل من دقيقة'
}

let handler = async (m, { conn, usedPrefix, command, isOwner, participants }) => {
  const user = global.db.data.users[m.sender]

  // ── تقرير_المال / balance_report ──────────────────────────────────────────
  if (/^(تقرير_المال|تقرير-المال|balance_report)$/i.test(command)) {
    if (!user) return m.reply('❌ أرسل أي أمر أولاً لتسجيل حسابك.')
    initEconomy(user)

    const txns = Array.isArray(user.transactions) ? user.transactions.slice(-5).reverse() : []
    const txnLines = txns.length
      ? txns.map(t => `│ ${t.type === 'earn' ? '📈' : '📉'} ${fmt(t.amount)} — ${t.note || '—'}`).join('\n')
      : '│ لا توجد معاملات مسجلة بعد.'

    const totalNet = (user.totalEarned || 0) - (user.totalSpent || 0)

    return m.reply(`
╭────『 📊 تقرير المال 』────
│
│ 💰 المحفظة:      ${fmt(user.money)}
│ 🏦 البنك:        ${fmt(user.bank)}
│ 💎 الماس:        ${user.diamond || 0}
│ 💵 إجمالي مكتسب: ${fmt(user.totalEarned || 0)}
│ 💸 إجمالي منفق:  ${fmt(user.totalSpent || 0)}
│ 📈 الصافي:       ${fmt(totalNet)}
│
│ ─── آخر 5 معاملات ───
${txnLines}
│
│ 🏦 للتفاصيل: ${usedPrefix}معاملاتي
╰──────────────────`.trim())
  }

  // ── مراجعة_البريم / premium_review ──────────────────────────────────────
  if (/^(مراجعة_البريم|مراجعة-البريم|premium_review|بريم_معلومات)$/i.test(command)) {
    if (!user) return m.reply('❌ سجّل أولاً.')
    initEconomy(user)

    const vip    = isVip(m.sender)
    const exp    = user.premiumTime || 0
    const now    = Date.now()
    const left   = exp - now
    const expStr = exp > 0 ? (left > 0 ? `✅ ينتهي بعد ${msToStr(left)}` : '❌ منتهي') : '—'

    return m.reply(`
╭────『 👑 مراجعة البريم 』────
│
│ 🏷️ الحالة:      ${vip ? '✅ مميز (VIP)' : '❌ عادي'}
│ ⏳ الانتهاء:    ${expStr}
│ ♾️ موارد مفتوحة: ${user.infiniteResources ? 'نعم — يتخطى حدود الطاقة' : 'لا'}
│
│ 💰 المحفظة:    ${fmt(user.money)}
│ 🏦 البنك:      ${fmt(user.bank)}
│ 💎 الماس:      ${user.diamond || 0}
│ ⚡ الطاقة:     ${user.energy || 0}/100
│
│ 💡 للترقية تواصل مع المالك.
╰──────────────────`.trim())
  }

  // ── احصائيات_القروب / group_stats ────────────────────────────────────────
  if (/^(احصائيات_القروب|احصائيات-القروب|group_stats|نشاط_القروب2)$/i.test(command)) {
    if (!m.isGroup) return m.reply('❌ هذا الأمر للقروبات فقط.')

    const chatData  = global.db.data.chats[m.chat] || {}
    const msgStats  = chatData.messageStats || {}
    const total     = participants?.length || 0
    const admins    = (participants || []).filter(p => p.admin).length

    // Top 5 active in group
    const top5 = Object.entries(msgStats)
      .sort((a, b) => (b[1] || 0) - (a[1] || 0))
      .slice(0, 5)

    const topLines = top5.length
      ? top5.map(([jid, count], i) => `│ ${i + 1}. @${jid.split('@')[0]} — ${count} رسالة`).join('\n')
      : '│ لا توجد بيانات رسائل بعد.'

    const allUsers = Object.values(global.db.data.users || {})
    const totalMoneyInGroup = top5.reduce((sum, [jid]) => {
      const u = global.db.data.users[jid]
      return sum + ((u?.money || 0) + (u?.bank || 0))
    }, 0)

    return conn.reply(
      m.chat,
      `╭────『 📊 إحصائيات القروب 』────
│
│ 👥 الأعضاء:     ${total}
│ 🛡️ المشرفون:   ${admins}
│ 🤖 البوت:      نشط ✅
│ 🔗 الحماية:    ${chatData.antiLink ? '✅ مفعلة' : '❌ معطلة'}
│ 🌍 الترجمة:    ${chatData.globalTranslate?.enabled ? '✅ ' + chatData.globalTranslate.to : '❌'}
│ 👋 الترحيب:    ${chatData.welcome ? '✅' : '❌'}
│
│ ─── 🏆 أكثر 5 نشاطاً ───
${topLines}
│
│ 💰 إجمالي ثروة أنشط 5: ${fmt(totalMoneyInGroup)}
│
╰──────────────────`,
      m,
      { mentions: top5.map(([jid]) => jid) }
    )
  }

  // ── احصائياتي_مفصل / user_stats ──────────────────────────────────────────
  if (/^(احصائياتي_مفصل|احصائياتي-مفصل|user_stats|إحصائياتي_مفصل)$/i.test(command)) {
    if (!user) return m.reply('❌ سجّل أولاً.')
    initEconomy(user)

    const totalMsgs = user.messages?.total || 0
    const joinedAgo = user.regTime && user.regTime > 0
      ? msToStr(Date.now() - user.regTime) + ' مضت'
      : 'غير مسجل'

    return m.reply(`
╭────『 📋 إحصائياتك المفصلة 』────
│
│ 👤 الاسم:       ${user.name || m.pushName || '—'}
│ 🎂 العمر:       ${user.age > 0 ? user.age : '—'}
│ 📅 التسجيل:     ${joinedAgo}
│
│ 🏆 المستوى:     ${user.level || 0}
│ ✨ XP:          ${user.exp || 0}
│ 💬 الرسائل:     ${totalMsgs}
│
│ ─── 💰 الاقتصاد ───
│ 💰 المحفظة:     ${fmt(user.money)}
│ 🏦 البنك:       ${fmt(user.bank)}
│ 💎 الماس:       ${user.diamond || 0}
│ ⚡ الطاقة:      ${user.energy || 0}/100
│ 💵 مكتسب كلياً: ${fmt(user.totalEarned || 0)}
│ 💸 منفق كلياً:  ${fmt(user.totalSpent || 0)}
│
│ ─── 👑 العضوية ───
│ الحالة:         ${isVip(m.sender) ? '✅ VIP' : '❌ عادي'}
│
╰──────────────────`.trim())
  }

  // ── اخطاء / error_log ─────────────────────────────────────────────────────
  if (/^(اخطاء|سجل_اخطاء|error_log)$/i.test(command)) {
    if (!isOwner) throw '❌ هذا الأمر للمالك فقط.'

    const errors = global._recentErrors || []
    if (!errors.length) return m.reply('✅ لا توجد أخطاء مسجلة حديثاً.')

    const lines = errors.slice(-10).reverse()
      .map((e, i) => `${i + 1}. [${new Date(e.time || Date.now()).toLocaleTimeString('ar')}]\n   ${e.plugin || '—'}: ${e.message || e}`)
      .join('\n\n')

    return m.reply(`╭────『 ⚠️ آخر الأخطاء 』────\n│\n${lines}\n│\n╰──────────────────`)
  }

  // ── نسخة_احتياطية / backup ─────────────────────────────────────────────────
  if (/^(نسخة_احتياطية|نسخ_احتياطي|backup_copy)$/i.test(command)) {
    if (!isOwner) throw '❌ هذا الأمر للمالك فقط.'

    try {
      const data = JSON.stringify(global.db.data, null, 2)
      const buf  = Buffer.from(data)
      const ts   = new Date().toISOString().replace(/[:.]/g, '-')
      await conn.sendMessage(m.chat, {
        document: buf,
        fileName: `shadow-backup-${ts}.json`,
        mimetype: 'application/json',
        caption: `✅ نسخة احتياطية من قاعدة البيانات\n📅 ${new Date().toLocaleString('ar')}\n👥 المستخدمون: ${Object.keys(global.db.data.users || {}).length}\n💬 القروبات: ${Object.keys(global.db.data.chats || {}).length}`
      }, { quoted: m })
    } catch (e) {
      throw `❌ فشل إنشاء النسخة الاحتياطية: ${e.message}`
    }
  }
}

handler.help    = ['تقرير_المال', 'مراجعة_البريم', 'احصائيات_القروب', 'احصائياتي_مفصل', 'اخطاء', 'نسخة_احتياطية']
handler.tags    = ['tools']
handler.command = /^(تقرير_المال|تقرير-المال|balance_report|مراجعة_البريم|مراجعة-البريم|premium_review|بريم_معلومات|احصائيات_القروب|احصائيات-القروب|group_stats|نشاط_القروب2|احصائياتي_مفصل|احصائياتي-مفصل|user_stats|إحصائياتي_مفصل|اخطاء|سجل_اخطاء|error_log|نسخة_احتياطية|نسخ_احتياطي|backup_copy)$/i

export default handler
