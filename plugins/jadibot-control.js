// ─── أوامر تحكّم متقدّمة بالبوتات الفرعية ────────────────────────────────────
// كل البيانات تُحفظ ويُعاد قراءتها من Supabase (السحاب).
//
//   .معلومات_فرعي [رقم]              — تفاصيل كاملة عن بوت فرعي
//   .اعادة_تشغيل_فرعي [رقم]          — قطع وإعادة وصل بوت فرعي
//   .مزامنة_سحابية [رقم|الكل]        — رفع جلسة(جلسات) الفرعي إلى السحاب فوراً
//   .حالة_البوتات                    — ملخّص سريع لجميع البوتات الفرعية
//   .بث_فرعي [رقم] [نص]              — بثّ نصّ من بوت فرعي إلى كل قروباته
//   .تجديد_كود [رقم]                 — توليد كود إقران جديد إن انقطع
// ─────────────────────────────────────────────────────────────────────────────

import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import {
  createSubBot, destroySubBot, listSubBots, getSubBotFeatures
} from '../lib/jadibot.js'

const JADIBOT_DIR = './jadibot'

function box(title, lines) {
  return `╭────『 ${title} 』────\n│\n│ ${lines.join('\n│ ')}\n│\n╰──────────────────`
}

function findConn(num) {
  return (global.conns || []).find(c => c.__subBotPhone === num)
}

function diskInfo(num) {
  const folder = join(JADIBOT_DIR, num)
  if (!existsSync(folder)) return { exists: false }
  let size = 0, fileCount = 0, latest = 0
  try {
    for (const f of readdirSync(folder)) {
      try {
        const st = statSync(join(folder, f))
        if (!st.isFile()) continue
        size += st.size
        fileCount++
        if (st.mtimeMs > latest) latest = st.mtimeMs
      } catch (_) {}
    }
  } catch (_) {}
  return { exists: true, size, fileCount, latest }
}

function fmtBytes(n) {
  if (!n) return '0 B'
  const u = ['B', 'KB', 'MB']
  let i = 0
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(1)} ${u[i]}`
}

function fmtAgo(ts) {
  if (!ts) return '—'
  const d = Date.now() - ts
  const s = Math.floor(d / 1000)
  if (s < 60)   return `${s} ث`
  if (s < 3600) return `${Math.floor(s / 60)} د`
  if (s < 86400) return `${Math.floor(s / 3600)} س`
  return `${Math.floor(s / 86400)} يوم`
}

let handler = async (m, { conn, args, command, usedPrefix }) => {
  const cmd = command.toLowerCase()

  // ─── معلومات بوت فرعي ───────────────────────────────────────────────
  if (/^(معلومات_فرعي|معلومات_فرعى|subbot_info|sub_info)$/i.test(cmd)) {
    const num = (args[0] || '').replace(/\D/g, '')
    if (!num) return m.reply(`📌 الاستخدام: *${usedPrefix}معلومات_فرعي 9677xxxxxxxx*`)
    const live = findConn(num)
    const disk = diskInfo(num)
    const cloud = global.db?.data?.jadibotSessions?.[num]
    const meta = global.db?.data?.jadibot?.[num]
    if (!disk.exists && !cloud && !meta) {
      return m.reply(`❌ لا يوجد بوت فرعي بالرقم +${num}`)
    }
    const groups = live?.chats ? Object.keys(live.chats).filter(j => j.endsWith('@g.us')).length : '—'
    return m.reply(box(`🤖 معلومات البوت +${num}`, [
      `🔌 الحالة:        ${live?.user ? '🟢 متصل' : '🔴 غير متصل'}`,
      `📅 أُنشئ في:      ${meta?.createdAt ? new Date(meta.createdAt).toLocaleString('ar') : '—'}`,
      `👤 المالك:        ${meta?.owner ? meta.owner.split('@')[0] : '—'}`,
      `🧩 المزايا:       ${getSubBotFeatures(num).join(' • ') || '—'}`,
      '',
      `💾 الجلسة (قرص):`,
      `   • الملفات:     ${disk.fileCount || 0}`,
      `   • الحجم:       ${fmtBytes(disk.size || 0)}`,
      `   • آخر تعديل:   ${disk.latest ? fmtAgo(disk.latest) + ' مضت' : '—'}`,
      '',
      `☁️ السحاب:`,
      `   • محفوظ:       ${cloud ? '✅' : '❌'}`,
      `   • آخر رفع:     ${cloud?.savedAt ? fmtAgo(cloud.savedAt) + ' مضت' : '—'}`,
      `   • عدد الملفات: ${cloud?.files ? Object.keys(cloud.files).length : 0}`,
      '',
      `💬 القروبات:      ${groups}`,
      `🆔 الـ JID:        ${live?.user?.id?.split(':')[0] || '—'}`,
    ]))
  }

  // ─── إعادة تشغيل بوت فرعي ───────────────────────────────────────────
  if (/^(اعادة_تشغيل_فرعي|إعادة_تشغيل_فرعي|restart_subbot|restartsubbot)$/i.test(cmd)) {
    const num = (args[0] || '').replace(/\D/g, '')
    if (!num) return m.reply(`📌 الاستخدام: *${usedPrefix}اعادة_تشغيل_فرعي 9677xxxxxxxx*`)
    const live = findConn(num)
    if (!live && !existsSync(join(JADIBOT_DIR, num))) {
      return m.reply(`❌ البوت +${num} غير موجود.`)
    }
    await m.reply(`🔄 جاري إعادة تشغيل البوت الفرعي +${num}…`)
    try {
      if (live) {
        try { live.ws?.close?.() } catch (_) {}
        try { live.end?.() } catch (_) {}
        global.conns = (global.conns || []).filter(c => c.__subBotPhone !== num)
      }
      await new Promise(r => setTimeout(r, 1500))
      const r = await createSubBot(num, global.db?.data?.jadibot?.[num]?.owner || null)
      if (r?.ok) {
        return m.reply(box('✅ إعادة التشغيل', [
          `🤖 البوت: +${num}`,
          `🔌 الحالة: ${r.status === 'reconnected' ? '🟢 متصل (من الجلسة المحفوظة)' : '⏳ بانتظار الإقران'}`,
          r.code ? `🔐 كود الإقران: ${r.code}` : '✅ لا حاجة لكود — اتصل تلقائياً.',
        ]))
      }
      return m.reply(`❌ فشل: ${r?.error || 'غير معروف'}`)
    } catch (e) {
      return m.reply(`❌ خطأ: ${e?.message || e}`)
    }
  }

  // ─── مزامنة سحابية فورية ────────────────────────────────────────────
  if (/^(مزامنة_سحابية|مزامنه_سحابيه|sync_cloud|backup_subbot)$/i.test(cmd)) {
    const target = (args[0] || '').toLowerCase()
    const all = !target || /^(الكل|all|كل)$/i.test(target)
    const targets = all
      ? readdirSync(JADIBOT_DIR).filter(d => existsSync(join(JADIBOT_DIR, d, 'creds.json')))
      : [target.replace(/\D/g, '')]

    if (!targets.length || !targets[0]) {
      return m.reply('❌ لا توجد بوتات فرعية للمزامنة.')
    }

    let ok = 0, fail = 0
    for (const num of targets) {
      try {
        const folder = join(JADIBOT_DIR, num)
        if (!existsSync(folder)) { fail++; continue }
        const files = {}
        for (const f of readdirSync(folder)) {
          const fp = join(folder, f)
          try {
            if (!statSync(fp).isFile()) continue
            files[f] = readFileSync(fp).toString('base64')
          } catch (_) {}
        }
        global.db.data.jadibotSessions = global.db.data.jadibotSessions || {}
        global.db.data.jadibotSessions[num] = { files, savedAt: Date.now() }
        ok++
      } catch (_) { fail++ }
    }

    // فرض الكتابة فوراً للسحاب
    try { await global.db.write() } catch (_) { global.markDirty?.() }

    return m.reply(box('☁️ مزامنة سحابية', [
      `✅ نجحت:  ${ok}`,
      `❌ فشلت:  ${fail}`,
      `📦 الإجمالي: ${targets.length}`,
      '',
      '💾 جميع جلسات البوتات الفرعية مرفوعة الآن إلى Supabase.',
    ]))
  }

  // ─── حالة سريعة لكل البوتات ─────────────────────────────────────────
  if (/^(حالة_البوتات|حاله_البوتات|subbots_status|status_subbots)$/i.test(cmd)) {
    const list = listSubBots()
    if (!list.length) return m.reply('📭 لا توجد بوتات فرعية.')
    const online = list.filter(b => b.online)
    const offline = list.filter(b => !b.online)
    const cloud = Object.keys(global.db?.data?.jadibotSessions || {}).length
    const lines = [
      `📊 الإجمالي:    ${list.length}`,
      `🟢 متصل:       ${online.length}`,
      `🔴 غير متصل:   ${offline.length}`,
      `☁️ في السحاب:  ${cloud}`,
      '',
      '── المتّصلون ──',
      ...(online.length ? online.map(b => `🟢 +${b.phone}  •  ${b.features.length} ميزة`) : ['  (لا أحد)']),
      '',
      '── غير المتّصلين ──',
      ...(offline.length ? offline.map(b => `🔴 +${b.phone}`) : ['  (لا أحد)']),
    ]
    return m.reply(box('🤖 حالة البوتات الفرعية', lines))
  }

  // ─── بثّ من بوت فرعي ────────────────────────────────────────────────
  if (/^(بث_فرعي|بث_فرعى|broadcast_subbot|broadcastsub)$/i.test(cmd)) {
    const num = (args[0] || '').replace(/\D/g, '')
    const text = args.slice(1).join(' ').trim()
    if (!num || !text) {
      return m.reply(
`📌 الاستخدام:
*${usedPrefix}بث_فرعي 9677xxxxxxxx الرسالة هنا*`)
    }
    const live = findConn(num)
    if (!live?.user) return m.reply(`❌ البوت +${num} غير متصل حالياً.`)
    const chats = Object.keys(live.chats || {}).filter(j => j.endsWith('@g.us'))
    if (!chats.length) return m.reply(`📭 البوت +${num} ليس عضواً في أي قروب.`)
    await m.reply(`📤 جاري البثّ من +${num} إلى ${chats.length} قروب…`)
    let sent = 0, failed = 0
    const stamped = `╭────『 📢 بثّ 』────\n│\n│ ${text.split('\n').join('\n│ ')}\n│\n╰──────────────────`
    for (const jid of chats) {
      try {
        await live.sendMessage(jid, { text: stamped })
        sent++
        await new Promise(r => setTimeout(r, 800))
      } catch (_) { failed++ }
    }
    return m.reply(box('📢 نتيجة البثّ', [
      `🤖 من البوت:   +${num}`,
      `✅ نجح:        ${sent}`,
      `❌ فشل:        ${failed}`,
      `📊 الإجمالي:   ${chats.length}`,
    ]))
  }

  // ─── تجديد كود إقران ────────────────────────────────────────────────
  if (/^(تجديد_كود|تجديد_الكود|regen_code|new_code)$/i.test(cmd)) {
    const num = (args[0] || '').replace(/\D/g, '')
    if (!num) return m.reply(`📌 الاستخدام: *${usedPrefix}تجديد_كود 9677xxxxxxxx*`)
    const live = findConn(num)
    if (live?.user) return m.reply(`✅ البوت +${num} متصل بالفعل — لا حاجة لكود جديد.`)
    // امسح الجلسة الفاشلة وأعد الإنشاء
    const folder = join(JADIBOT_DIR, num)
    if (existsSync(folder)) {
      try {
        for (const f of readdirSync(folder)) {
          try { (await import('fs')).rmSync(join(folder, f), { force: true }) } catch (_) {}
        }
      } catch (_) {}
    }
    await m.reply(`🔄 جاري توليد كود إقران جديد لـ +${num}…`)
    const r = await createSubBot(num, global.db?.data?.jadibot?.[num]?.owner || null)
    if (!r?.ok) return m.reply(`❌ فشل: ${r?.error || 'غير معروف'}`)
    return m.reply(box('🔐 كود إقران جديد', [
      `🤖 البوت:        +${num}`,
      `🔢 الكود:        ${r.code || '—'}`,
      `⏱️ الصلاحية:     ~60 ثانية`,
      '',
      '📋 الخطوات:',
      '  ① واتساب ← الأجهزة المرتبطة',
      '  ② ربط جهاز ← ربط برقم الهاتف',
      '  ③ أدخل الكود أعلاه',
    ]))
  }
}

handler.help = [
  'معلومات_فرعي [رقم]',
  'اعادة_تشغيل_فرعي [رقم]',
  'مزامنة_سحابية [رقم|الكل]',
  'حالة_البوتات',
  'بث_فرعي [رقم] [نص]',
  'تجديد_كود [رقم]',
]
handler.tags    = ['owner', 'jadibot']
handler.command = /^(معلومات_فرعي|معلومات_فرعى|subbot_info|sub_info|اعادة_تشغيل_فرعي|إعادة_تشغيل_فرعي|restart_subbot|restartsubbot|مزامنة_سحابية|مزامنه_سحابيه|sync_cloud|backup_subbot|حالة_البوتات|حاله_البوتات|subbots_status|status_subbots|بث_فرعي|بث_فرعى|broadcast_subbot|broadcastsub|تجديد_كود|تجديد_الكود|regen_code|new_code)$/i
handler.rowner  = true
handler.owner   = true

export default handler
