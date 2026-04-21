import { watchFile, unwatchFile } from 'fs'
import chalk from 'chalk'
import { fileURLToPath } from 'url'
import fs from 'fs'
import * as cheerio from 'cheerio'
import fetch from 'node-fetch'
import axios from 'axios'
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

// صور البوت - تأكد من وجود هذه الملفات فعليًا
global.imagen1 = fs.readFileSync('./Menu2.jpg')
global.imagen2 = fs.readFileSync('./src/nuevobot.jpg')
global.imagen3 = fs.readFileSync('./src/Pre Bot Publi.png')
global.imagen4 = fs.readFileSync('./Menu.png')

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

// توقيعات وخصائص إضافية
global.wm2 = `▸ ${dia} ${fecha}\n▸ aima - 𝙱𝚘𝚝`
global.gt = '★𝐒𝐇𝐀𝐃𝐎𝐖 - 𝙱𝚘𝚝★'
global.md = 'https://github.com/farisatif'
global.waitt = '*[❗] Ƈᴀʀɢᴀɴᴅᴏ, ᴀɢᴜᴀʀᴅᴇ ᴜɴ ᴍᴏᴍᴇɴᴛᴏ...*'
global.waittt = global.waitt
global.waitttt = global.waitt
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

// أنماط القوائم
global.cmenut = '❖––––––『'
global.cmenub = '┊✦ '
global.cmenuf = '╰━═┅═━––––––๑\n'
global.cmenua = '\n⌕ ❙❘❙❙❘❙❚❙❘❙❙❚❙❘❙❘❙❚❙❘❙❙❚❙❘❙❙❘❙❚❙❘ ⌕\n     '
global.dmenut = '*❖─┅──┅〈*'
global.dmenub = '*┊»*'
global.dmenub2 = '*┊*'
global.dmenuf = '*╰┅────────┅✦*'

// زخارف وروابط
global.htjava = '⫹⫺'
global.htki = '*⭑•̩̩͙⊱•••• ☪*'
global.htka = '*☪ ••••̩̩͙⊰•⭑*'
global.comienzo = '• • ◕◕════'
global.fin = '════◕◕ • •'

// التاريخ والوقت حسب منطقة محددة
global.botdate = `⫹⫺ Date :  ${moment.tz('America/Los_Angeles').format('DD/MM/YY')}`
global.bottime = `𝗧 𝗜 𝗠 𝗘 : ${moment.tz('America/Los_Angeles').format('HH:mm:ss')}`

// إعداد رسالة GIF وهمية
global.fgif = {
  key: { participant: '0@s.whatsapp.net' },
  message: {
    videoMessage: {
      title: wm,
      h: `Hmm`,
      seconds: 999999999,
      gifPlayback: true,
      caption: bottime,
      jpegThumbnail: fs.readFileSync('./Menu.png')
    }
  }
}

// إعدادات مضاعف اللعبة أو نقاط الترتيب
global.multiplier = 99

// تحديث الملف تلقائيًا عند التعديل
let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.redBright("Update 'config.js'"))
  import(`${file}?update=${Date.now()}`)
})
