let handler = async (m, { conn, command }) => {
  let chat = global.db.data.chats[m.chat];

  if (command === 'تشغيل') {
    chat.autoReply = true;
    return m.reply('تم تفعيل الردود التلقائية.');
  }

  if (command === 'ايقاف') {
    if (!handler.prems) return; // يمكن تعديل هذا حسب الصلاحيات
    chat.autoReply = false;
    return m.reply('تم تعطيل الردود التلقائية.');
  }
};

handler.help = ['تشغيل', 'ايقاف'];
handler.tags = ['owner'];
handler.command = /^$/i;
handler.prems = true; // فقط المالك يستطيع الإيقاف
handler.disabled = true

export default handler;
