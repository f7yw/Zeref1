/**
 * اختبار الردود التفاعلية (أزرار + قائمة)
 * — يبعث رسالة فيها أزرار سريعة + قائمة منسدلة
 * — كل زر/صف ID يطابق أمر فعلي بالبوت ليُختبر التوجيه
 */
import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'

const ROWS = [
  { id: 'بروفايل', title: '👤 بروفايل', description: 'عرض بروفايلك الكامل' },
  { id: 'رصيد',    title: '💰 رصيد',    description: 'فحص أموالك ومستواك' },
  { id: 'اوامر',   title: '📋 الأوامر', description: 'قائمة كل الأوامر' },
  { id: 'فزوره',   title: '🔮 فزوره',   description: 'لعبة لغز جامعي' },
  { id: 'منشن',    title: '📣 منشن',    description: 'مناداة الأعضاء' },
]

const handler = async (m, { conn }) => {
  // 1) رسالة معاينة نصية أولاً (تأكيد للمستخدم أن الأمر اشتغل)
  await m.reply(
`🧪 *اختبار الردود التفاعلية*

📤 جاري إرسال رسالة فيها أزرار + قائمة...
بعد وصولها اضغط أي زر أو افتح القائمة.`
  )

  const buttons = [
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({ display_text: '👤 بروفايل', id: '.بروفايل' }),
    },
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({ display_text: '💰 رصيد', id: '.رصيد' }),
    },
    {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({ display_text: '📋 اوامر', id: '.اوامر' }),
    },
    {
      name: 'single_select',
      buttonParamsJson: JSON.stringify({
        title: '📋 افتح القائمة',
        sections: [{
          title: 'اختر أمراً',
          rows: ROWS.map(r => ({
            header: '',
            title: r.title,
            description: r.description,
            id: '.' + r.id,
          })),
        }],
      }),
    },
  ]

  const interactiveMsg = {
    body: { text: '🧪 اختر أمراً للاختبار من الأزرار أو القائمة:' },
    footer: { text: 'ZEREF · Interactive Test' },
    header: { title: '⚡ اختبار', hasMediaAttachment: false },
    nativeFlowMessage: { buttons, messageParamsJson: '' },
  }

  try {
    const msg = generateWAMessageFromContent(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2,
            },
            interactiveMessage: proto.Message.InteractiveMessage.fromObject(interactiveMsg),
          },
        },
      },
      { userJid: conn.user.id, quoted: m }
    )

    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
    console.log('[TEST-INTERACTIVE] ✅ تم إرسال الرسالة التفاعلية إلى', m.chat)
  } catch (e) {
    console.error('[TEST-INTERACTIVE] ❌ فشل إرسال الرسالة التفاعلية:', e?.message || e)
    await m.reply(
`❌ *فشل إرسال الرسالة التفاعلية*

السبب: \`${e?.message || e}\`

⚠️ ملاحظة: واتساب قد لا يدعم عرض الأزرار/القوائم على بعض الإصدارات (خاصة الحسابات الشخصية بدلاً من Business). جرّب من حساب Business أو إصدار أحدث من واتساب.`
    )
  }
}

handler.help = ['اختبار_تفاعلي']
handler.tags = ['owner']
handler.command = /^(اختبار_تفاعلي|اختبار_ازرار|اختبار_قائمة|test_buttons|test_list)$/i

export default handler
