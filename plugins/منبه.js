import { isVip } from '../lib/economy.js'
let handler = async (m, { usedPrefix, command }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
    let txt = `🕰️ *قائمة أوامر المنبه:*\n
      ${usedPrefix}*ذكرني* [الوقت] [الرسالة] [مرة|يومي|اسبوعي|شهري]
      ↳ لإضافة تذكير جديد

      ${usedPrefix}*قائمتي*
      ↳ لعرض جميع التذكيرات الخاصة بك

      ${usedPrefix}*حذف_تذكير* [رقم]
      ↳ لحذف تذكير معين حسب رقمه

      ${usedPrefix}*حذف_الكل*
      ↳ لحذف جميع التذكيرات دفعة واحدة

      ${usedPrefix}*تعديل_تذكير* [رقم] [الوقت] [الرسالة] [التكرار]
      ↳ لتعديل تذكير معين

      📝 *ملاحظات:*
      - الوقت بصيغة 24 ساعة مثل 18:30
      - التكرار يجب أن يكون: مرة، يومي، اسبوعي، شهري`

    await m.reply(txt)
}

handler.command = /^(منبه)$/i
export default handler
