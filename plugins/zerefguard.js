/**
 * plugins/zerefguard.js — أوامر إدارة نظام الحماية ZerefGuard
 * مطور فقط.
 */
import Guard from '../lib/zerefguard.js'

function isOwnerSender(m) {
  const num = (m.sender || '').replace(/\D/g, '')
  return (global.owner || []).some(o =>
    Array.isArray(o)
      ? String(o[0]).replace(/\D/g, '') === num
      : String(o).replace(/\D/g, '') === num
  )
}

function fmtChanges(changes) {
  if (!changes?.length) return '—'
  const ico = { modified: '✏️', missing: '🗑️', added: '➕' }
  return changes.map(c => `${ico[c.type] || '•'} ${c.type}: ${c.file}`).join('\n')
}

const handler = async (m, { command, args }) => {
  if (!isOwnerSender(m)) return m.reply('🔒 ZerefGuard: للمطور فقط')

  const cmd = String(command || '').toLowerCase()

  if (/^guard$|^حماية$/.test(cmd)) {
    const r = Guard.checkIntegrity()
    if (!r.sealed) {
      return m.reply(
        `🛡️ *ZerefGuard*\n\n` +
        `الحالة: ⚠️ غير مختوم\n` +
        `لا يوجد بيان مرجعي بعد.\n\n` +
        `لختم النسخة الحالية كمرجع:\n*.guard_seal*`
      )
    }
    const head = r.ok ? '✅ سليم' : (r.tampered ? '🚨 بيان مفسد' : '⚠️ تغييرات مرصودة')
    return m.reply(
      `🛡️ *ZerefGuard*\n\n` +
      `الحالة: ${head}\n` +
      `الملفات المحميّة: ${r.fileCount || 0}\n` +
      (r.sealedAt ? `تاريخ الختم: ${new Date(r.sealedAt).toLocaleString('ar')}\n` : '') +
      (r.changes?.length ? `\n*التغييرات:*\n${fmtChanges(r.changes)}\n\n_لإعادة الختم:_ *.guard_seal*` : '')
    )
  }

  if (/^guard[_\s]?seal$|^ختم[_\s]?الحماية$/.test(cmd)) {
    const mf = Guard.sealManifest()
    return m.reply(
      `🛡️ *تم ختم البيان*\n\n` +
      `📦 ${Object.keys(mf.files).length} ملف محميّ\n` +
      `🕒 ${new Date(mf.ts).toLocaleString('ar')}\n\n` +
      `أي تعديل لاحق على ملفات النواة سيُكتشف فوراً.`
    )
  }

  if (/^guard[_\s]?check$|^فحص[_\s]?الحماية$/.test(cmd)) {
    const r = Guard.checkIntegrity()
    if (!r.sealed) return m.reply('⚠️ لم يُختم بعد. شغّل: *.guard_seal*')
    if (r.ok) return m.reply(`✅ سلامة الكود مؤكدة\n📦 ${r.fileCount} ملف`)
    return m.reply(
      `🚨 *تنبيه سلامة*\n\n` +
      `${r.changes.length} تغييرات:\n${fmtChanges(r.changes)}\n\n` +
      `_لإعادة الختم بعد المراجعة:_ *.guard_seal*`
    )
  }

  if (/^guard[_\s]?unseal$|^الغاء[_\s]?الحماية$/.test(cmd)) {
    if ((args[0] || '').toLowerCase() !== 'تأكيد' && (args[0] || '').toLowerCase() !== 'confirm') {
      return m.reply('⚠️ هذا يلغي الختم نهائياً.\n\nأكّد بـ: *.guard_unseal تأكيد*')
    }
    Guard.unsealManifest()
    return m.reply('🗑️ تم إلغاء ختم ZerefGuard')
  }
}

handler.help = ['guard', 'guard_seal', 'guard_check', 'guard_unseal']
handler.tags = ['owner']
// أزيل (حماية) لتجنّب التعارض مع plugins/security.js (حماية الروابط/الإعلانات). هنا حماية الملفات.
handler.command = /^(guard|guard[_\s]?seal|guard[_\s]?check|guard[_\s]?unseal|حماية[_\s]?الملفات|ختم[_\s]?الحماية|فحص[_\s]?الحماية|الغاء[_\s]?الحماية)$/i
handler.rowner = true

export default handler
