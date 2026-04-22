/**
 * .ازرار  / .buttons  / .قائمه_ازرار
 * ─────────────────────────────────────────────────────────────────────────────
 * يرسل لوحة أزرار تفاعلية عبر InteractiveMessage الحديث (NativeFlow / quick_reply).
 * عند الضغط على أي زر، يأتي الرد كـ interactiveResponseMessage فيه paramsJson
 * يحوي { id: '.أمر' } — يتم تحويله تلقائياً إلى أمر فعلي عبر parser
 * الردود التفاعلية في handler.js → ينفذ الأمر في المسار العادي.
 *
 * ملاحظة: واتساب الحديث لم يعد يدعم templateButtons/buttons القديم،
 * لذا نستخدم interactiveMessage الذي تدعمه نسخ واتساب الحالية.
 */

let handler = async (m, { conn }) => {
  const _bly = await import('@whiskeysockets/baileys')
  const proto = _bly.proto || _bly.default?.proto
  const generateWAMessageFromContent = _bly.generateWAMessageFromContent || _bly.default?.generateWAMessageFromContent
  if (!proto?.Message?.InteractiveMessage || !generateWAMessageFromContent) {
    return m.reply('⚠️ نسخة baileys الحالية لا تدعم الأزرار التفاعلية على هذا البوت.')
  }

  const text = `╭───『 🎛️ *لوحة الأزرار التفاعلية* 』
│
│ اضغط أي زر بالأسفل لتنفيذ الأمر فوراً.
│ يتم تمرير المعرّف عبر parser الردود
│ التفاعلية إلى مسار الأوامر الاعتيادي.
│
╰────────`

  const make = (display, id) => ({
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({ display_text: display, id })
  })

  const interactiveMsg = {
    body:   { text },
    footer: { text: 'ZEREF • أزرار تفاعلية' },
    header: { title: '🎛️ ZEREF', hasMediaAttachment: false },
    nativeFlowMessage: {
      buttons: [
        make('💰 رصيدي',     '.البنك'),
        make('📖 آية قرآنية', '.قران'),
        make('📋 القائمة',    '.اوامر'),
      ]
    }
  }

  const wrapped = generateWAMessageFromContent(
    m.chat,
    {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2
          },
          interactiveMessage: proto.Message.InteractiveMessage.create(interactiveMsg)
        }
      }
    },
    { userJid: conn.user.id, quoted: m }
  )

  await conn.relayMessage(m.chat, wrapped.message, { messageId: wrapped.key.id })
}

handler.help    = ['ازرار', 'buttons']
handler.tags    = ['main']
handler.command = /^(ازرار|أزرار|buttons|قائمه[_\s]?ازرار|قائمة[_\s]?ازرار)$/i

export default handler
