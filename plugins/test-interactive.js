/**
 * اختبار الردود التفاعلية (أزرار + قائمة)
 * — يبعث رسالة فيها أزرار سريعة + قائمة منسدلة
 * — كل زر/صف ID يطابق أمر فعلي بالبوت ليُختبر التوجيه
 *
 * بعد الإصلاح في handler.js → parseInteractiveResponse():
 *   ضغط أي زر يُحوَّل إلى m.text = '.<id>' ويعمل كأمر عادي.
 */
import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'

const ROWS = [
  { id: 'بروفايل',  title: '👤 بروفايل',     description: 'عرض بروفايلك الكامل' },
  { id: 'رصيد',     title: '💰 رصيد',        description: 'فحص أموالك ومستواك' },
  { id: 'اوامر',    title: '📋 الأوامر',     description: 'قائمة كل الأوامر' },
  { id: 'فزوره',    title: '🔮 فزوره',       description: 'لعبة لغز جامعي' },
  { id: 'منشن',     title: '📣 منشن الكل',   description: 'مناداة جميع الأعضاء' },
  { id: 'الاهلي',   title: '🏆 نادي الأهلي', description: 'اختبار سريع' },
]

const handler = async (m, { conn }) => {
  const buttons = [
    { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '👤 بروفايل', id: 'بروفايل' }) },
    { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '💰 رصيد',    id: 'رصيد'    }) },
    { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '📋 اوامر',   id: 'اوامر'   }) },
    {
      name: 'single_select',
      buttonParamsJson: JSON.stringify({
        title: '📋 افتح القائمة',
        sections: [{
          title: 'اختر أمراً للتجربة',
          highlight_label: 'اختبار',
          rows: ROWS.map(r => ({ header: '', title: r.title, description: r.description, id: r.id })),
        }],
      }),
    },
  ]

  const msg = generateWAMessageFromContent(m.chat, {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2,
        },
        interactiveMessage: proto.Message.InteractiveMessage.create({
          body:   proto.Message.InteractiveMessage.Body.create({ text:
`🧪 *اختبار الردود التفاعلية*

اضغط أحد الأزرار أو افتح القائمة لتجربة التوجيه.
كل اختيار سيُنفَّذ كأمر طبيعي عبر معالج التفاعلية.` }),
          footer: proto.Message.InteractiveMessage.Footer.create({ text: 'ZEREF · Interactive Test' }),
          header: proto.Message.InteractiveMessage.Header.create({
            title: '⚡ ZEREF',
            subtitle: 'اختبار الأزرار والقوائم',
            hasMediaAttachment: false,
          }),
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
            buttons,
          }),
        }),
      },
    },
  }, { userJid: conn.user.id, quoted: m })

  await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
}

handler.help    = ['اختبار_تفاعلي', 'test_buttons']
handler.tags    = ['owner']
handler.command = /^(اختبار_تفاعلي|اختبار_ازرار|اختبار_قائمة|test_buttons|test_list)$/i

export default handler
