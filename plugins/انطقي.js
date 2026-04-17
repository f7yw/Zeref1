import { createRequire } from 'module'
import { readFileSync, unlinkSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const gttsFactory = require('node-gtts')

const defaultLang = 'ja'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const baseDir = typeof global.__dirname === 'function' ? global.__dirname(import.meta.url) : __dirname
const tmpDir = join(baseDir, '../tmp')

if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true })

let handler = async (m, { conn, args, usedPrefix, command }) => {
  let lang = args[0]
  let text = args.slice(1).join(' ')

  if ((args[0] || '').length !== 2) {
    lang = defaultLang
    text = args.join(' ')
  }

  if (!text && m.quoted?.text) text = m.quoted.text
  if (!text && m.quoted?.caption) text = m.quoted.caption
  if (!text && m.quoted?.body) text = m.quoted.body
  if (!text && m.quoted?.msg?.caption) text = m.quoted.msg.caption
  if (!text && m.quoted?.msg?.text) text = m.quoted.msg.text

  if (!text) {
    throw `كتابة نص لتحويله إلى صوتية\nمثل\n*${usedPrefix + command} ja مرحبا*`
  }

  let res
  try {
    res = await tts(text, lang)
  } catch (e) {
    try {
      res = await tts(text, defaultLang)
    } catch (err) {
      m.reply(String(err || e))
      return
    }
  }

  if (res) {
    await conn.sendFile(m.chat, res, 'tts.wav', '', m, true)
  }
}

handler.help = ['tts <لغة> <نص>']
handler.tags = ['tools']
handler.command = /^(g?tts|انطقي)$/i

export default handler

function tts(text, lang = 'ja') {
  return new Promise((resolve, reject) => {
    try {
      const engine = gttsFactory(lang)
      const filePath = join(
        tmpDir,
        `${Date.now()}-${Math.random().toString(16).slice(2)}.wav`
      )

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