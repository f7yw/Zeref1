import { xpRange } from '../lib/levelling.js'
import { syncEnergy, fmtEnergy, fmt, getRole, initEconomy, msToHuman, MAX_ENERGY, isVip, logTransaction } from '../lib/economy.js'
import { initUser } from '../lib/userInit.js'

// ─── DAILY WORK COOLDOWN DISPLAY ────────────────────────────────────────────
function timeLeft(last, cooldown) {
  const rem = cooldown - (Date.now() - last)
  return rem > 0 ? msToHuman(rem) : null
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  const vipStatus = isVip(m.sender) ? '💎 مميز' : '❌ عادي'
  const user = global.db.data.users[m.sender] || (global.db.data.users[m.sender] = {})
  initUser(user, m.pushName, m.sender)

  if (!user.registered) {
    return m.reply(`╭────『 🔐 تسجيل مطلوب 』────\n│\n│ يجب التسجيل أولاً للوصول للبنك\n│\n│ 📌 اكتب: *${usedPrefix}تسجيل*\n│ وستحصل على مكافأة ترحيبية!\n│\n╰──────────────────`.trim())
  }

  initEconomy(user)

  const directAction = /^(ايداع|ودع|deposit|سحب|withdraw|سح|تحويل|حول|transfer)$/i.test(command)
  const sub = directAction ? command.toLowerCase() : (args[0] || '').toLowerCase()
  const dataArgs = directAction ? args : args.slice(1)

  // ── .ايداع <amount> ──────────────────────────────────────────────────────
  if (/^(ايداع|ودع|deposit)$/i.test(sub)) {
    const amount = parseInt(dataArgs[0])
    if (!amount || amount < 1) return m.reply(`*مثال:* ${usedPrefix}ايداع 500\n👤 العضوية: ${vipStatus}`)
    if (user.money < amount) return m.reply(`❌ ليس لديك ما يكفي!\n💰 محفظتك: ${fmt(user.money)}\n👤 العضوية: ${vipStatus}`)
    user.money -= amount
    user.bank += amount
    logTransaction(user, 'spend', amount, `🏦 إيداع في البنك`)
    return m.reply(`╭────『 🏦 إيداع ناجح 』────\n│\n│ ✅ تم إيداع ${fmt(amount)}\n│ 💰 المحفظة: ${fmt(user.money)}\n│ 🏦 البنك:   ${fmt(user.bank)}\n│\n╰──────────────────`.trim())
  }

  // ── .سحب <amount> ───────────────────────────────────────────────────────
  if (/^(سحب|withdraw|سح)$/i.test(sub)) {
    const amount = parseInt(dataArgs[0])
    if (!amount || amount < 1) return m.reply(`*مثال:* ${usedPrefix}سحب 500\n👤 العضوية: ${vipStatus}`)
    if (user.bank < amount) return m.reply(`❌ رصيد بنكك غير كافٍ!\n🏦 البنك: ${fmt(user.bank)}\n👤 العضوية: ${vipStatus}`)
    user.bank -= amount
    user.money += amount
    logTransaction(user, 'earn', amount, `🏦 سحب من البنك`)
    return m.reply(`╭────『 🏦 سحب ناجح 』────\n│\n│ ✅ تم سحب ${fmt(amount)}\n│ 💰 المحفظة: ${fmt(user.money)}\n│ 🏦 البنك:   ${fmt(user.bank)}\n│\n╰──────────────────`.trim())
  }

  // ── .تحويل @user <amount> ───────────────────────────────────────────────
  if (/^(تحويل|حول|transfer)$/i.test(sub)) {
    let target = m.mentionedJid?.[0] || (m.quoted?.sender)
    const amount = parseInt(dataArgs.find(arg => /^\d+$/.test(arg)) || args.find(arg => /^\d+$/.test(arg)))
    if (!target || !amount || amount < 1)
      return m.reply(`*مثال:* ${usedPrefix}تحويل @شخص 500\n📌 رسوم التحويل: 5٪\n👤 العضوية: ${vipStatus}`)
    if (target === m.sender) return m.reply('❌ لا يمكنك التحويل لنفسك.\n👤 العضوية: ' + vipStatus)
    if (user.money < amount) return m.reply(`❌ ليس لديك ما يكفي!\n💰 محفظتك: ${fmt(user.money)}\n👤 العضوية: ${vipStatus}`)
    const fee = Math.ceil(amount * 0.05)
    const net = amount - fee

    // ابحث عن المستلم حتى لو لم يكن مسجلاً (دعم @lid و @s.whatsapp.net)
    const users = global.db.data.users
    let targetKey = target
    if (!users[targetKey]) {
      // جرّب الصيغة البديلة
      if (target.endsWith('@lid')) {
        const phoneJid = global.lidPhoneMap?.[target]
        if (phoneJid && users[phoneJid]) targetKey = phoneJid
      } else if (target.endsWith('@s.whatsapp.net')) {
        const num = target.split('@')[0]
        for (const [lid, phone] of Object.entries(global.lidPhoneMap || {})) {
          if (phone === target || phone?.split('@')[0] === num) { targetKey = lid; break }
        }
      }
    }
    // إن لم يوجد، أنشئ السجل تلقائياً (التحويل مفتوح للجميع)
    if (!users[targetKey]) {
      users[targetKey] = {}
      initUser(users[targetKey], undefined, targetKey)
    }
    const targetUser = users[targetKey]
    initEconomy(targetUser)
    user.money -= amount
    targetUser.money += net
    user.totalSpent = (user.totalSpent || 0) + amount
    logTransaction(user, 'spend', amount, `💸 تحويل إلى @${target.split('@')[0]}`)
    logTransaction(targetUser, 'earn', net, `💸 استقبال تحويل من @${m.sender.split('@')[0]}`)
    await global.db.write()
    const notice = targetUser.registered ? '' : '\n📝 ملاحظة: المستلم غير مسجل، أُنشئ له حساب تلقائياً.'
    return m.reply(
      `╭────『 💸 تحويل ناجح 』────\n` +
      `│\n│ ✅ أرسلت ${fmt(amount)} إلى @${target.split('@')[0]}\n` +
      `│ 📋 رسوم 5٪: -${fmt(fee)}\n` +
      `│ 💵 وصل الطرف الآخر: ${fmt(net)}\n` +
      `│ 💰 محفظتك: ${fmt(user.money)}\n│\n╰──────────────────${notice}`,
      null, { mentions: [target] }
    )
  }

  // ── .بنك (default — show full stats) ─────────────────────────────────────
  const level  = user.level  || 1
  const exp    = user.exp    || 0
  const { xp, max } = xpRange(level, global.multiplier)
  const role   = getRole(level)
  const name   = m.pushName || 'مستخدم'
  const energyBar = fmtEnergy(user, m.sender)

  const workWait  = timeLeft(user.lastWork || user.lastwork || 0, 30 * 60 * 1000)
  const dailyWait = timeLeft(user.lastDaily || 0, 24 * 60 * 60 * 1000)

  const isVipUser = isVip(m.sender)
  await m.reply(
`╭────────『 🏦 بنك SHADOW 』────────
│
│ 👤 *الاسم:*    ${name}
│ 👑 *الرتبة:*   ${role}${isVipUser ? ' 👑 VIP' : ''}
│ 🏆 *المستوى:*  ${level}  (XP: ${exp} / ${max})
│
│ ─────── 💰 الأموال ───────
│ 💰 *المحفظة:*  ${fmt(user.money)}
│ 🏦 *البنك:*    ${fmt(user.bank)}
│ 💎 *الماس:*    ${user.diamond || 0} 💎
│
│ ─────── ⚡ الطاقة ───────
│ ${energyBar}
│
│ ─────── ⏳ الكولداون ───────
│ 🛠️ *عمل:*     ${workWait  ? 'متاح بعد ' + workWait  : '✅ متاح الآن'}
│ 🎁 *يومي:*    ${dailyWait ? 'متاح بعد ' + dailyWait : '✅ متاح الآن'}
│
│ ─── أوامر البنك ───
│ ${usedPrefix}ايداع <مبلغ>   ← إيداع في البنك
│ ${usedPrefix}سحب <مبلغ>     ← سحب من البنك
│ ${usedPrefix}تحويل @ش <م>   ← تحويل (رسوم 5٪)
│
╰────────────────────────────────`.trim()
  )
}

handler.help   = ['بنك', 'ايداع', 'سحب', 'تحويل']
handler.tags   = ['economy']
handler.command = /^(البنك|بنك|بنكي|رصيدي|حسابي|ايداع|سحب|تحويل|حول|deposit|withdraw|transfer)$/i
export default handler
