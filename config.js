import { watchFile, unwatchFile } from 'fs'
import chalk from 'chalk'
import { fileURLToPath } from 'url'
import fs from 'fs'
import moment from 'moment-timezone'

// معلومات المالكين
global.owner = [
          ['967778088098', '彡ℤ𝕖𝕣𝕖𝕗', true],
        ]

global.suittag = ['967778088098']
global.prems = ['967778088098']
global.reportes_solicitudes = ['967778088098']

// معلومات البوت والعلامة
global.packname = '𝐒𝐇𝐀𝐃𝐎𝐖-Bot'
global.author = '967778088098+'
global.wm = '𝐒𝐇𝐀𝐃𝐎𝐖 - Bot'
global.igfg = '𝐒𝐇𝐀𝐃𝐎𝐖 - Bot'
global.wait = '> *يرجى الأنتظار لحظه*\n> 🔗 *https://github.com/Farisatif*'

// مشرفين البوت
global.mods = ['967778088098']

// إعدادات الوقت والتاريخ
global.d = new Date(Date.now() + 3600000)
global.locale = 'es'
global.dia = d.toLocaleDateString(locale, { weekday: 'long' })
global.fecha = d.toLocaleDateString('es', { day: 'numeric', month: 'numeric', year: 'numeric' })
global.mes = d.toLocaleDateString('es', { month: 'long' })
global.año = d.toLocaleDateString('es', { year: 'numeric' })
global.tiempo = d.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true })

// روابط ومعلومات ثابتة
global.md = 'https://github.com/farisatif'
global.nomorown = '967778088098'
global.ownerLink = 'https://wa.me/967778088098'

global.pdoc = [
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/msword',
  'application/pdf',
  'text/rtf'
]

// إعدادات مضاعف اللعبة أو نقاط الترتيب
global.multiplier = 99

// تحديث الملف تلقائيًا عند التعديل
let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.redBright("Update 'config.js'"))
  import(`${file}?update=${Date.now()}`)
})
