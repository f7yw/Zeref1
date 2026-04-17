import { xpRange } from '../lib/levelling.js'
import fetch from 'node-fetch'

function clockString(ms) {
  let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
  let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
  let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}

let handler = async (m, { conn, usedPrefix }) => {
  await conn.sendMessage(m.chat, { react: { text: '📋', key: m.key } })

  const user = global.db.data.users[m.sender] || {}
  const { exp = 0, limit = 0, level = 1, role = 'مستخدم', diamond = 0 } = user
  const { xp, max } = xpRange(level, global.multiplier)
  const uptime = clockString(process.uptime() * 1000)
  const name = m.pushName || 'مستخدم'
  const p = usedPrefix
  const more = String.fromCharCode(8206)
  const readMore = more.repeat(850)

  // ─── User stats header ───────────────────────────────
  const stats = `
╔══〘 🌟 *SHADOW - Bot* 🌟 〙══╗
║
║  👤 *${name}*
║  🏆 المستوى: *${level}* │ الرتبة: *${role}*
║  ⭐ XP: *${xp} / ${max}*
║  🪙 عملات: *${limit}* │ 💎 ماس: *${diamond || 0}*
║  ⏱️ وقت التشغيل: *${uptime}*
║
╚══〘 📋 *الأوامر* 〙══╝`.trim()

  // ─── Full command list ────────────────────────────────
  const menu = `
┌─〘 📖 *القرآن الكريم* 〙─
│  ${p}اذكار الصباح  ⟵ أذكار الصباح
│  ${p}اذكار المساء  ⟵ أذكار المساء
│  ${p}ايه           ⟵ آية الكرسي
│  ${p}قران          ⟵ آية عشوائية
└──────────────────────

┌─〘 🤖 *الذكاء الاصطناعي* 〙─
│  ${p}ai / ${p}بوت  ⟵ محادثة AI
│  ${p}جوده           ⟵ رفع جودة الصورة
│  ${p}شخصية          ⟵ تحليل شخصية أنيمي
└──────────────────────

┌─〘 🎮 *الألعاب* 〙─
│  ${p}اكس        ⟵ إكس أو (Tic Tac Toe)
│  ${p}لو         ⟵ لعبة لو خيروك
│  ${p}فزوره      ⟵ فزورة عشوائية
│  ${p}رياضيات    ⟵ تحدي رياضيات
│  ${p}رياضه      ⟵ لعبة رياضة
│  ${p}سوال       ⟵ سؤال عشوائي
│  ${p}علم        ⟵ خمّن العلم
│  ${p}رهان       ⟵ لعبة الرهان (Slot)
│  ${p}تخمين      ⟵ تخمين الشخصية
│  ${p}خمن        ⟵ خمّن الجواب
└──────────────────────

┌─〘 😄 *ترفيه وطرائف* 〙─
│  ${p}ذكاء       ⟵ نسبة ذكائك
│  ${p}جمال       ⟵ نسبة جمالك
│  ${p}حظ         ⟵ حظك اليوم
│  ${p}قلب        ⟵ رسالة قلب
│  ${p}صراحه      ⟵ سؤال بصراحة
│  ${p}نصيحه      ⟵ نصيحة عشوائية
│  ${p}مقولات     ⟵ اقتباسات أنيمي
│  ${p}زخرفه      ⟵ زخرفة نص
│  ${p}احرف       ⟵ تحويل الأحرف
│  ${p}قط         ⟵ صور قطط عشوائية
│  ${p}كلب        ⟵ صور كلاب عشوائية
│  ${p}انمي       ⟵ بحث عن أنيمي
└──────────────────────

┌─〘 🛠️ *أدوات* 〙─
│  ${p}ترجم        ⟵ ترجمة أي نص
│  ${p}ذكرني       ⟵ ضبط تذكير
│  ${p}قائمتي      ⟵ قائمة تذكيراتي
│  ${p}منبه        ⟵ ضبط منبّه
│  ${p}كود         ⟵ توليد QR Code
│  ${p}احذف        ⟵ حذف رسالة
│  ${p}ارسل_ورد    ⟵ إرسال رسالة خاصة
│  ${p}اختفاء      ⟵ وضع الاختفاء AFK
│  ${p}حساب        ⟵ عمليات حسابية
└──────────────────────

┌─〘 💰 *الاقتصاد* 〙─
│  ${p}البنك        ⟵ رصيدك ومستواك
│  ${p}عمل          ⟵ اعمل واحصل على عملات
│  ${p}لفل          ⟵ تفاصيل مستواك
│  ${p}شراء-الماس   ⟵ شراء الماس بالعملات
│  ${p}شراء         ⟵ شراء عملات إضافية
└──────────────────────

┌─〘 📊 *معلومات* 〙─
│  ${p}الضعوم     ⟵ حالة البوت وإحصائياته
│  ${p}التوقيت    ⟵ التوقيت الحالي
│  ${p}رابطي      ⟵ رابط واتساب الخاص بك
│  ${p}بلاغ       ⟵ إرسال بلاغ للمالك
│  ${p}المالك     ⟵ معلومات مالك البوت
└──────────────────────

┌─〘 👑 *أوامر المالك* 〙─
│  ${p}addprem      ⟵ إضافة مستخدم مميز
│  ${p}المميزين     ⟵ قائمة المميزين
│  ${p}بان          ⟵ حظر مستخدم
│  ${p}رفع-البان    ⟵ رفع الحظر
│  ${p}فك_البلوكات  ⟵ فك جميع البلوكات
│  ${p}البلوكات     ⟵ قائمة البلوكات
│  ${p}تشغيل        ⟵ تشغيل أو إيقاف البوت
│  ${p}إعادة        ⟵ إعادة تشغيل البوت
└──────────────────────

❖ *${global.wm}*`.trim()

  try {
    let thumb = global.imagen4
    try {
      const res = await fetch('https://telegra.ph/file/d7ae77d1178f9de50825c.jpg')
      thumb = Buffer.from(await res.arrayBuffer())
    } catch { /* use local fallback */ }

    await conn.sendMessage(m.chat, {
      image: global.imagen4,
      caption: stats,
      mentions: [m.sender],
      contextInfo: {
        mentionedJid: [m.sender],
        externalAdReply: {
          showAdAttribution: true,
          mediaType: 'IMAGE',
          title: '『 𝐒𝐇𝐀𝐃𝐎𝐖 - Bot 』',
          body: `المستوى ${level} │ ⭐ ${xp}/${max} XP`,
          thumbnail: thumb,
          sourceUrl: global.md
        }
      }
    }, { quoted: m })

    await conn.sendMessage(m.chat, {
      text: menu + readMore,
      mentions: [m.sender],
      contextInfo: {
        externalAdReply: {
          showAdAttribution: true,
          mediaType: 'IMAGE',
          title: '📋 قائمة الأوامر',
          body: global.wm,
          thumbnail: thumb,
          sourceUrl: global.md
        }
      }
    }, { quoted: m })

  } catch (e) {
    console.error('[MENU ERROR]', e)
    await conn.reply(m.chat, stats + '\n\n' + menu, m)
  }
}

handler.command = /^(اوامر|أوامر|المهام|مهام|menu|قائمة)$/i
handler.exp = 0
handler.fail = null
export default handler
