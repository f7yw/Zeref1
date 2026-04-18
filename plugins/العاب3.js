// games: hangman, number-guess, 20-questions style, word-scramble-ar, emoji-riddle

const HANGMAN_WORDS = [
  { word: 'قمر',    hint: '🌙 جسم سماوي' },
  { word: 'نجم',    hint: '⭐ يضيء الليل' },
  { word: 'بحر',    hint: '🌊 مياه واسعة' },
  { word: 'جبل',    hint: '⛰️ تضاريس عالية' },
  { word: 'شمس',    hint: '☀️ مصدر الضوء' },
  { word: 'وردة',   hint: '🌹 زهرة جميلة' },
  { word: 'نسر',    hint: '🦅 طائر كبير' },
  { word: 'ليمون',  hint: '🍋 فاكهة حامضة' },
  { word: 'برتقال', hint: '🍊 فاكهة برتقالية' },
  { word: 'فيل',    hint: '🐘 أكبر حيوان بري' },
  { word: 'أسد',    hint: '🦁 ملك الغابة' },
  { word: 'طاولة',  hint: '🪑 أثاث منزلي' },
  { word: 'مدرسة',  hint: '🏫 مكان التعليم' },
  { word: 'حاسوب',  hint: '💻 جهاز إلكتروني' },
  { word: 'قطار',   hint: '🚂 وسيلة نقل' }
]

const EMOJI_RIDDLES = [
  { emojis: '🚗💨', answer: 'سيارة', hint: 'وسيلة نقل تسير بسرعة' },
  { emojis: '🌧️☔', answer: 'مطر', hint: 'يسقط من السماء' },
  { emojis: '📚✏️', answer: 'دراسة', hint: 'تعلم وكتابة' },
  { emojis: '🌙⭐', answer: 'ليل', hint: 'وقت النوم' },
  { emojis: '☀️🏖️', answer: 'صيف', hint: 'فصل حار' },
  { emojis: '❤️💔', answer: 'حب', hint: 'شعور قوي' },
  { emojis: '🎂🕯️', answer: 'عيد ميلاد', hint: 'احتفال سنوي' },
  { emojis: '🏠🔑', answer: 'منزل', hint: 'مكان السكن' },
  { emojis: '🐟🌊', answer: 'سمكة', hint: 'تسبح في الماء' },
  { emojis: '🎵🎶', answer: 'موسيقى', hint: 'أصوات منسجمة' }
]

const HANGMAN_STAGES = [
  '```\n  ____\n |    |\n |\n |\n |\n_|_```',
  '```\n  ____\n |    |\n |    O\n |\n |\n_|_```',
  '```\n  ____\n |    |\n |    O\n |    |\n |\n_|_```',
  '```\n  ____\n |    |\n |    O\n |   /|\n |\n_|_```',
  '```\n  ____\n |    |\n |    O\n |   /|\\\n |\n_|_```',
  '```\n  ____\n |    |\n |    O\n |   /|\\\n |   /\n_|_```',
  '```\n  ____\n |    |\n |    O\n |   /|\\\n |   / \\\n_|_  خسرت!```'
]

let handler = async (m, { conn, args, command, usedPrefix }) => {
  conn.games3 = conn.games3 || {}
  const chatId = m.chat
  const senderId = m.sender

  // ===== HANGMAN =====
  if (/^(شنقه|hangman)$/i.test(command)) {
    const existing = conn.games3[`hang_${chatId}`]
    const sub = (args[0] || '').trim()

    if (sub === 'ايقاف' || sub === 'stop') {
      if (existing) {
        delete conn.games3[`hang_${chatId}`]
        return m.reply(`⛔ تم إيقاف لعبة المشنقة.\nالكلمة كانت: *${existing.word}*`)
      }
      return m.reply('لا توجد لعبة جارية.')
    }

    if (!existing) {
      const picked = HANGMAN_WORDS[Math.floor(Math.random() * HANGMAN_WORDS.length)]
      conn.games3[`hang_${chatId}`] = {
        word: picked.word,
        hint: picked.hint,
        guessed: [],
        wrong: 0,
        startedBy: senderId
      }
      const g = conn.games3[`hang_${chatId}`]
      const display = [...picked.word].map(c => g.guessed.includes(c) ? c : '_').join(' ')
      return m.reply(`🎮 *لعبة المشنقة*\n${HANGMAN_STAGES[0]}\n\n💡 *تلميح:* ${picked.hint}\n🔤 الكلمة: *${display}*\n\nاكتب حرفاً واحداً للتخمين\nلإيقاف: *${usedPrefix}شنقه ايقاف*`)
    }

    const g = existing
    if (!sub || sub.length !== 1 || /\s/.test(sub)) {
      const display = [...g.word].map(c => g.guessed.includes(c) ? c : '_').join(' ')
      return m.reply(`${HANGMAN_STAGES[g.wrong]}\n\n💡 *تلميح:* ${g.hint}\n🔤 الكلمة: *${display}*\nالأحرف المجربة: ${g.guessed.join(', ') || 'لا شيء'}`)
    }

    const letter = sub
    if (g.guessed.includes(letter)) return m.reply(`❗ جربت الحرف "*${letter}*" من قبل.`)

    g.guessed.push(letter)
    const inWord = g.word.includes(letter)
    if (!inWord) g.wrong++

    const display = [...g.word].map(c => g.guessed.includes(c) ? c : '_').join(' ')
    const won = !display.includes('_')

    if (won) {
      delete conn.games3[`hang_${chatId}`]
      return m.reply(`${HANGMAN_STAGES[g.wrong]}\n\n🏆 *صحيح! الكلمة هي: ${g.word}*\nمبروك @${senderId.split('@')[0]} 🎉`, null, { mentions: [senderId] })
    }
    if (g.wrong >= 6) {
      delete conn.games3[`hang_${chatId}`]
      return m.reply(`${HANGMAN_STAGES[6]}\n\n💀 خسرت! الكلمة كانت: *${g.word}*`)
    }

    return m.reply(`${HANGMAN_STAGES[g.wrong]}\n\n${inWord ? '✅ حرف صحيح!' : `❌ الحرف "*${letter}*" غير موجود (${6 - g.wrong} محاولات متبقية)`}\n\n💡 تلميح: ${g.hint}\n🔤 الكلمة: *${display}*\nالأحرف المجربة: ${g.guessed.join(', ')}`)
  }

  // ===== NUMBER GUESS =====
  if (/^(خمن_رقم|numguess)$/i.test(command)) {
    const gameKey = `num_${senderId}_${chatId}`
    const sub = (args[0] || '').trim()

    if (!conn.games3[gameKey]) {
      const max = 100
      conn.games3[gameKey] = { answer: Math.floor(Math.random() * max) + 1, tries: 0, max, expiresAt: Date.now() + 3 * 60 * 1000 }
      return m.reply(`🎲 *لعبة تخمين الرقم*\n\nفكرت برقم من 1 إلى 100\nكم عدده؟\n\nاكتب: *${usedPrefix}${command} رقمك*\n⏳ عندك 3 دقائق!`)
    }

    const g = conn.games3[gameKey]
    if (Date.now() > g.expiresAt) {
      const ans = g.answer
      delete conn.games3[gameKey]
      return m.reply(`⏰ انتهى الوقت! كان الرقم: *${ans}*`)
    }

    const guess = parseInt(sub)
    if (isNaN(guess)) return m.reply('اكتب رقماً صحيحاً فقط')

    g.tries++

    if (guess === g.answer) {
      delete conn.games3[gameKey]
      return m.reply(`🏆 *صحيح!* الرقم هو *${g.answer}*\nعدد المحاولات: ${g.tries}`)
    }

    const diff = Math.abs(guess - g.answer)
    let hint = diff <= 3 ? '🔥 ساخن جداً!' : diff <= 10 ? '🌡️ دافئ' : diff <= 25 ? '❄️ بارد' : '🧊 بارد جداً'
    return m.reply(`${guess > g.answer ? '⬇️ أصغر' : '⬆️ أكبر'} — ${hint}\nالمحاولة رقم: ${g.tries}`)
  }

  // ===== EMOJI RIDDLE =====
  if (/^(ايموجي|emoji_riddle)$/i.test(command)) {
    const gameKey = `emoji_${chatId}`
    const existing = conn.games3[gameKey]
    const sub = (args.join(' ') || '').trim()

    if (!existing) {
      const picked = EMOJI_RIDDLES[Math.floor(Math.random() * EMOJI_RIDDLES.length)]
      conn.games3[gameKey] = { ...picked, expiresAt: Date.now() + 2 * 60 * 1000 }
      return m.reply(`🤔 *لغز الإيموجي*\n\n${picked.emojis}\n\n💡 تلميح: ${picked.hint}\n\nما هو الجواب؟ اكتب: *${usedPrefix}${command} جوابك*\n⏳ دقيقتان!`)
    }

    if (Date.now() > existing.expiresAt) {
      const ans = existing.answer
      delete conn.games3[gameKey]
      return m.reply(`⏰ انتهى الوقت! الجواب كان: *${ans}*`)
    }

    if (!sub) {
      return m.reply(`${existing.emojis}\n\n💡 تلميح: ${existing.hint}\nاكتب جوابك بعد الأمر`)
    }

    if (sub.includes(existing.answer) || existing.answer.includes(sub)) {
      delete conn.games3[gameKey]
      return m.reply(`🏆 *صحيح!* الجواب هو: *${existing.answer}* 🎉\nمبروك @${senderId.split('@')[0]}`, null, { mentions: [senderId] })
    }

    return m.reply(`❌ إجابة خاطئة، حاول مجدداً!\n${existing.emojis}`)
  }

  // ===== WORD CHAIN (وصلة) =====
  if (/^(وصله|وصلة|wordchain)$/i.test(command)) {
    const gameKey = `chain_${chatId}`
    const word = (args[0] || '').trim()

    if (word === 'ايقاف' || word === 'stop') {
      delete conn.games3[gameKey]
      return m.reply('⛔ تم إيقاف لعبة الوصلة.')
    }

    if (!conn.games3[gameKey]) {
      const starters = ['شمس','قمر','نجم','بحر','جبل','مدينة','دولة','حيوان','كتاب','فيلم']
      const starter = starters[Math.floor(Math.random() * starters.length)]
      conn.games3[gameKey] = { lastWord: starter, used: [starter], lastPlayer: null }
      return m.reply(`🔗 *لعبة الوصلة*\n\nقاعدة: كل كلمة تبدأ بآخر حرف من الكلمة السابقة\n\nأبدأ بكلمة: *${starter}*\nآخر حرف: *${[...starter].pop()}*\n\nاكتب كلمة تبدأ بـ *${[...starter].pop()}*`)
    }

    const g = conn.games3[gameKey]
    if (!word) return m.reply(`الكلمة الأخيرة: *${g.lastWord}*\nاكتب كلمة تبدأ بـ *${[...g.lastWord].pop()}*`)

    const firstChar = word[0]
    const expectedChar = [...g.lastWord].pop()

    if (firstChar !== expectedChar) return m.reply(`❌ الكلمة يجب أن تبدأ بحرف *${expectedChar}*`)
    if (g.used.includes(word)) return m.reply(`❌ الكلمة *${word}* استُخدمت من قبل!`)

    g.used.push(word)
    g.lastWord = word
    g.lastPlayer = senderId
    return m.reply(`✅ *${word}* — جيد!\n\nاكتب كلمة تبدأ بـ *${[...word].pop()}*\nعدد الكلمات: ${g.used.length}`)
  }
}

handler.help = ['شنقه', 'خمن_رقم', 'ايموجي', 'وصله']
handler.tags = ['game']
handler.command = /^(شنقه|hangman|خمن_رقم|numguess|ايموجي|emoji_riddle|وصله|وصلة|wordchain)$/i
export default handler
