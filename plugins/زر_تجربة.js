/**
 * .ازرار / .buttons / .قائمه_ازرار
 * ─────────────────────────────────────────────────────────────────────────────
 * يرسل قائمة منسدلة عبر listMessage (مدعومة على معظم نسخ واتساب الرسمي
 * وWhatsApp Business). كل عنصر يحمل rowId يبدأ بنقطة (مثل ".البنك") —
 * عند اختياره يتحوّل عبر parser الردود التفاعلية في handler.js إلى أمر
 * فعلي يدخل المسار العادي للأوامر.
 *
 * إن لم يدعم العميل listMessage يقوم البوت بالعودة إلى رسالة نصية بديلة.
 */

let handler = async (m, { conn }) => {
  const text =
`╭───『 🎛️ *لوحة الأزرار* 』
│
│ اختر من القائمة بالأسفل لتنفيذ
│ الأمر فوراً عبر parser التفاعل.
│
╰────────`

  const sections = [{
    title: 'الأوامر السريعة',
    rows: [
      { title: '💰 رصيدي',     description: 'عرض رصيدك في البنك',    rowId: '.البنك' },
      { title: '📖 آية قرآنية', description: 'اقتباس قرآني عشوائي',    rowId: '.قران'  },
      { title: '📋 القائمة',    description: 'فتح قائمة الأوامر الكاملة', rowId: '.اوامر' },
    ]
  }]

  const listMessage = {
    text,
    footer:    'ZEREF • قائمة تفاعلية',
    title:     '🎛️ ZEREF',
    buttonText: 'اضغط هنا للاختيار',
    sections
  }

  try {
    await conn.sendMessage(m.chat, listMessage, { quoted: m })
  } catch (e) {
    // Fallback نصّي
    await conn.sendMessage(m.chat, {
      text:
`${text}

🔢 *اختر بإرسال أحد الأوامر:*
• .البنك   — رصيدك
• .قران    — آية قرآن
• .اوامر   — القائمة الكاملة`
    }, { quoted: m })
  }
}

handler.help    = ['ازرار', 'buttons']
handler.tags    = ['main']
handler.command = /^(ازرار|أزرار|buttons|قائمه[_\s]?ازرار|قائمة[_\s]?ازرار)$/i

export default handler
