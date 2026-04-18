let handler = async (m, { usedPrefix, command }) => {
  await m.reply(`❌ أمر تحميل الأغنية معطّل حالياً.\nجرب ${usedPrefix}بحث_يوتيوب للبحث عن الأغنية.`)
}
handler.help = []
handler.tags = ['downloader']
handler.command = /^(mp3|اغنيه|اغنية|اغنيه صوت|تحميل صوت|موسيقى|موسيقا)$/i
handler.disabled = true
export default handler
