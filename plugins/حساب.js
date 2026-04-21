import { isVip } from '../lib/economy.js'
import moment from 'moment-timezone'
import PhoneNum from 'awesome-phonenumber'

const regionNames = new Intl.DisplayNames(['ar'], { type: 'region' })

let handler = async (m, { conn, text, usedPrefix, command: cmd }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  const getName = async (jid) => { try { return await conn.getName(jid) } catch { return jid.split('@')[0] } }
  let input = (m.quoted?.sender || m.mentionedJid?.[0] || text || '').trim()

  if (!input) {
    throw `📌 مثال: ${usedPrefix + cmd} @العضو`
  }

  // استخراج الرقم فقط ثم تحويله إلى JID
  const digits = input.replace(/\D/g, '')
  if (!digits) throw `⛔ أرسل رقمًا أو منشن صحيحًا`

  const jid = `${digits}@s.whatsapp.net`

  const exists = await conn.onWhatsApp(jid).catch(() => [])
  if (!exists?.[0]?.exists) throw '⛔ المستخدم غير موجود'

  const name = await conn.getName(jid).catch(() => digits)
  const img = await conn.profilePictureUrl(jid, 'image').catch(() => './src/avatar_contact.png')
  const statusObj = await conn.fetchStatus(jid).catch(() => null)
  const business = await conn.getBusinessProfile(jid).catch(() => null)

  const format = new PhoneNum(`+${digits}`)
  const regionCode = format.getRegionCode('international')
  const country = regionCode ? regionNames.of(regionCode) : null

  const statusText = statusObj?.status || '-'
  const statusDate = statusObj?.setAt ? moment(statusObj.setAt).locale('ar').format('LL') : '-'
  const phoneIntl = format.getNumber('international') || `+${digits}`

  const caption = `\t\t\t\t*▾ واتـســاب ▾*\n\n*° الدولة :* ${country?.toUpperCase() || '-'}\n*° الإسم :* ${name || '-'}\n*° الرقم :* ${phoneIntl}\n*° الرابط :* wa.me/${digits}\n*° المنشن :* @${digits}\n*° الأخبار :* ${statusText}\n*° تاريخ تعدیل الأخبار :* ${statusDate}\n\n${
    business
      ? `\t\t\t\t*▾ معلومات الأعمال ▾*\n\n*° معرف الأعمال :* ${business.wid || '-'}\n*° موقع إلكتروني :* ${business.website || '-'}\n*° بريد إلكتروني :* ${business.email || '-'}\n*° فئة :* ${business.category || '-'}\n*° الموقع :* ${business.address || '-'}\n*° الوصف :* ${business.description || '-'}`
      : '*حساب واتساب عادي*'
  }`

  const payload = { caption, mentions: [jid] }

  if (img && typeof img === 'string' && !img.includes('avatar_contact.png')) {
    await conn.sendMessage(
      m.chat,
      { image: { url: img }, ...payload },
      { quoted: m }
    )
  } else {
    await conn.sendMessage(
      m.chat,
      { text: caption, mentions: [jid] },
      { quoted: m }
    )
  }
}

handler.help = ['wastalk']
handler.tags = ['tools']
handler.command = /^(whatsapp|الحساب|حساب|واتس)$/i

export default handler