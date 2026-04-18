let handler = async (m, { usedPrefix, command }) => {
  await m.reply(`❌ أمر تحميل الفيديو معطّل حالياً.\nجرب ${usedPrefix}بحث_يوتيوب للبحث عن الفيديو.`)
}
handler.help = []
handler.tags = ['downloader']
handler.command = /^(فيديو|video|dl|تحميل)$/i
handler.disabled = true
export default handler
