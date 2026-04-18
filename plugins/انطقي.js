import { createRequire } from 'module'
import { readFileSync, unlinkSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const gttsFactory = require('node-gtts')

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const tmpDir = join(__dirname, '../tmp')

if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true })

let handler = async function (m, { conn, args, usedPrefix, command }) {
  let lang = args[0]
  let text = args.slice(1).join(' ')

  // إذا لم يحدد لغة، اجعلها العربية افتراضياً
  if (!args[0] || args[0].length !== 2) {
    lang = 'ar'
    text = args.join(' ')
  }

  // جلب النص من الرسالة المقتبسة إذا لم يكتب نصاً
  if (!text && m.quoted) {
    text = m.quoted.text || m.quoted.caption || m.quoted.description || ''
  }

  if (!text) throw `*مثال:* ${usedPrefix + command} ar مرحبا بك`

  try {
    let res = await tts(text, lang)
    if (res) {
      // إرسال الملف كبصمة صوت (PTT)
      await conn.sendFile(m.chat, res, 'tts.opus', null, m, true)
    }
  } catch (e) {
    console.error(e)
    m.reply('حدث خطأ أثناء تحويل النص إلى صوت')
  }
}

handler.help = ['tts <لغة> <نص>']
handler.tags = ['tools']
handler.command = /^(g?tts|انطقي|نطق)$/i

export default handler

function tts(text, lang = 'ar') {
  return new Promise((resolve, reject) => {
    try {
      const engine = gttsFactory(lang)
      const filePath = join(tmpDir, `${Date.now()}.wav`)
      engine.save(filePath, text, () => {
        try {
          const buffer = readFileSync(filePath)
          unlinkSync(filePath)
          resolve(buffer)
        } catch (e) {
          reject(e)
        }
      })
    } catch (e) {
      reject(e)
    }
  })
}
