import { isVip, initEconomy, logTransaction, fmt } from '../lib/economy.js'

// ─── كلمات المشنقة — مستوى ثانوي وجامعي ────────────────────────────────────
const HANGMAN_WORDS = [
  // علوم وتقنية
  { word: 'خوارزمية',    hint: '💻 تسلسل تعليمات حل مشكلة في البرمجة' },
  { word: 'بروتوكول',    hint: '🌐 مجموعة قواعد الشبكات (مثل HTTP)' },
  { word: 'قاعدةبيانات', hint: '🗄️ تخزين منظم للمعلومات' },
  { word: 'تشفير',       hint: '🔐 تحويل البيانات لحمايتها' },
  { word: 'ذكاءاصطناعي', hint: '🤖 محاكاة الذكاء البشري بالحاسوب' },
  { word: 'نانوتكنولوجي', hint: '🔬 تقنية تعمل على المستوى الذري' },
  { word: 'كروموسوم',    hint: '🧬 حامل المعلومات الوراثية' },
  { word: 'ميتابوليزم',  hint: '⚗️ العمليات الكيميائية الحيوية' },
  { word: 'فوتوسينسيس',  hint: '🌿 عملية التمثيل الضوئي' },
  { word: 'بلازما',      hint: '⚡ الحالة الرابعة للمادة' },
  // اقتصاد وإدارة
  { word: 'استثمار',     hint: '📈 توظيف المال لزيادة الثروة' },
  { word: 'تضخم',        hint: '💵 ارتفاع عام في مستوى الأسعار' },
  { word: 'احتكار',      hint: '🏢 سيطرة شركة وحيدة على السوق' },
  { word: 'ريادةاعمال',  hint: '🚀 إطلاق مشروع مبتكر من الصفر' },
  { word: 'ميزانية',     hint: '💰 خطة مالية مسبقة' },
  // فلسفة وعلم نفس
  { word: 'براغماتية',   hint: '🤔 فلسفة تقيس الحقيقة بالنتيجة' },
  { word: 'سيكولوجيا',   hint: '🧠 علم دراسة السلوك والعقل' },
  { word: 'فلسفة',       hint: '📖 حب الحكمة' },
  { word: 'ديمقراطية',   hint: '🗳️ نظام الحكم بصوت الشعب' },
  { word: 'ايديولوجية',  hint: '📜 منظومة أفكار سياسية' },
  // لغة وأدب
  { word: 'استعارة',     hint: '✍️ أداة بلاغية بدون أداة تشبيه' },
  { word: 'إبستيمولوجيا', hint: '📚 فلسفة المعرفة' },
  { word: 'بلاغة',       hint: '🗣️ علم جمال الأسلوب في العربية' },
  // رياضيات
  { word: 'احتمالية',    hint: '🎲 علم حساب فرص الأحداث' },
  { word: 'انتغرال',     hint: '∫ عملية التكامل في حساب التفاضل' },
  { word: 'مشتقة',       hint: '📐 معدل التغيير الفوري لدالة' },
  { word: 'مصفوفة',      hint: '🔢 جدول أرقام ذات صفوف وأعمدة' },
]

// ─── ألغاز الإيموجي — مستوى ثانوي وجامعي ────────────────────────────────────
const EMOJI_RIDDLES = [
  { emojis: '🧠⚡💡', answer: 'ذكاء اصطناعي', hint: 'تقنية تعلم الآلة' },
  { emojis: '📈💵🏦', answer: 'استثمار',      hint: 'توظيف المال' },
  { emojis: '🌍🔥😰', answer: 'تغير مناخي',   hint: 'ظاهرة الاحترار العالمي' },
  { emojis: '🔐💻👨‍💻', answer: 'أمن سيبراني', hint: 'حماية الأنظمة الرقمية' },
  { emojis: '🎓📜💼', answer: 'توظيف',        hint: 'الهدف بعد التخرج' },
  { emojis: '⚗️🔬🧪', answer: 'مختبر',        hint: 'مكان إجراء التجارب العلمية' },
  { emojis: '🌐📡🛰️', answer: 'إنترنت',       hint: 'شبكة التواصل العالمية' },
  { emojis: '💊🏥👨‍⚕️', answer: 'طب',           hint: 'علم الشفاء والعلاج' },
  { emojis: '⚖️👨‍⚖️📋', answer: 'قانون',       hint: 'تنظيم المجتمع بالأنظمة' },
  { emojis: '🚀🌌👨‍🚀', answer: 'فضاء',         hint: 'خارج كوكب الأرض' },
  { emojis: '🏛️🗳️📊', answer: 'سياسة',       hint: 'إدارة شؤون الدولة' },
  { emojis: '📱💬🌍', answer: 'تواصل اجتماعي', hint: 'منصات الإنترنت' },
  { emojis: '🔋☀️💨', answer: 'طاقة متجددة',  hint: 'شمس ورياح وماء' },
  { emojis: '🧬🔬💉', answer: 'بيولوجيا',     hint: 'علم الكائنات الحية' },
  { emojis: '📚📝🎓', answer: 'دراسة جامعية', hint: 'المرحلة بعد الثانوية' },
  { emojis: '💻🐛🔍', answer: 'debug',        hint: 'إيجاد الأخطاء في الكود' },
  { emojis: '🏦💳📉', answer: 'أزمة مالية',   hint: 'انهيار اقتصادي' },
  { emojis: '🌱🏭♻️', answer: 'استدامة',      hint: 'حفاظ على البيئة' },
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

function normalize(s) {
  return String(s || '').trim().toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/\s+/g, ' ').trim()
    .replace(/[أإآا]/g, 'ا')
    .replace(/ة/g, 'ه')
}

function giveReward(m, amount = 200) {
  const user = global.db.data.users[m.sender] ||= {}
  initEconomy(user)
  user.money = (user.money || 0) + amount
  user.exp   = (user.exp || 0) + 30
  user.totalEarned = (user.totalEarned || 0) + amount
  logTransaction(user, 'earn', amount, '🎮 جائزة لعبة')
  global.db.write().catch(() => {})
  return user
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────
let handler = async (m, { conn, args, command, usedPrefix }) => {
  const vipStatus = global.tierBadge ? global.tierBadge(m.sender) : (isVip(m.sender) ? '💎 مميز' : '👤 عادي')
  conn.games3 = conn.games3 || {}
  const chatId = m.chat
  const senderId = m.sender

  // ===== HANGMAN =====
  if (/^(شنقه|hangman)$/i.test(command)) {
    const gameKey = `hang_${chatId}`
    const existing = conn.games3[gameKey]
    const sub = (args[0] || '').trim()

    if (sub === 'ايقاف' || sub === 'stop') {
      if (existing) {
        delete conn.games3[gameKey]
        return m.reply(`⛔ تم إيقاف لعبة المشنقة.\nالكلمة كانت: *${existing.word}*`)
      }
      return m.reply('لا توجد لعبة جارية.')
    }

    if (!existing) {
      const picked = HANGMAN_WORDS[Math.floor(Math.random() * HANGMAN_WORDS.length)]
      conn.games3[gameKey] = {
        word: picked.word, hint: picked.hint,
        guessed: [], wrong: 0, startedBy: senderId,
        msgId: null
      }
      const g = conn.games3[gameKey]
      const display = [...picked.word].map(c => g.guessed.includes(c) ? c : '_').join(' ')
      const sent = await conn.reply(m.chat,
        `🎮 *لعبة المشنقة*\n${HANGMAN_STAGES[0]}\n\n💡 *تلميح:* ${picked.hint}\n🔤 الكلمة: *${display}*\n\n💬 اكتب حرفاً واحداً للتخمين (بدون أمر)\nلإيقاف: *${usedPrefix}شنقه ايقاف*`, m)
      g.msgId = sent?.key?.id
      return
    }

    // إذا كان المستخدم يطلب الحالة فقط (بدون حرف)
    const g = existing
    if (!sub || sub.length !== 1 || /\s/.test(sub)) {
      const display = [...g.word].map(c => g.guessed.includes(c) ? c : '_').join(' ')
      return m.reply(`${HANGMAN_STAGES[g.wrong]}\n\n💡 *تلميح:* ${g.hint}\n🔤 الكلمة: *${display}*\nالأحرف المجربة: ${g.guessed.join(', ') || 'لا شيء'}`)
    }
    return _hangmanGuess(conn, m, gameKey, sub)
  }

  // ===== NUMBER GUESS =====
  if (/^(خمن_رقم|numguess)$/i.test(command)) {
    const gameKey = `num_${senderId}_${chatId}`
    const sub = (args[0] || '').trim()

    if (!conn.games3[gameKey]) {
      conn.games3[gameKey] = {
        answer: Math.floor(Math.random() * 100) + 1,
        tries: 0, expiresAt: Date.now() + 3 * 60 * 1000, msgId: null
      }
      const sent = await conn.reply(m.chat,
        `🎲 *لعبة تخمين الرقم*\n\nفكرت برقم من 1 إلى 100\n\n💬 اكتب رقماً مباشرة أو ردّ على الرسالة\n⏳ عندك 3 دقائق!`, m)
      conn.games3[gameKey].msgId = sent?.key?.id
      return
    }

    const g = conn.games3[gameKey]
    if (Date.now() > g.expiresAt) {
      const ans = g.answer
      delete conn.games3[gameKey]
      return m.reply(`⏰ انتهى الوقت! كان الرقم: *${ans}*`)
    }

    const guess = parseInt(sub)
    if (isNaN(guess)) return m.reply(`💬 اكتب رقماً فقط مثلاً: *50*`)
    return _numGuessProcess(conn, m, gameKey, guess)
  }

  // ===== EMOJI RIDDLE =====
  if (/^(ايموجي|emoji_riddle)$/i.test(command)) {
    const gameKey = `emoji_${chatId}`
    const existing = conn.games3[gameKey]

    if (!existing) {
      const picked = EMOJI_RIDDLES[Math.floor(Math.random() * EMOJI_RIDDLES.length)]
      const sent = await conn.reply(m.chat,
        `🤔 *لغز الإيموجي*\n\n${picked.emojis}\n\n💡 تلميح: ${picked.hint}\n\n💬 اكتب الجواب مباشرة أو ردّ على هذه الرسالة\n⏳ دقيقتان!`, m)
      conn.games3[gameKey] = {
        ...picked,
        expiresAt: Date.now() + 2 * 60 * 1000,
        msgId: sent?.key?.id
      }
      return
    }

    if (Date.now() > existing.expiresAt) {
      const ans = existing.answer
      delete conn.games3[gameKey]
      return m.reply(`⏰ انتهى الوقت! الجواب كان: *${ans}*`)
    }

    // عرض الحالة الحالية
    return m.reply(`${existing.emojis}\n\n💡 تلميح: ${existing.hint}\n💬 اكتب الجواب مباشرة`)
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
      conn.games3[gameKey] = {
        lastWord: starter, used: [starter], lastPlayer: null, msgId: null
      }
      const sent = await conn.reply(m.chat,
        `🔗 *لعبة الوصلة*\n\nقاعدة: كل كلمة تبدأ بآخر حرف من الكلمة السابقة\n\nأبدأ بكلمة: *${starter}*\nآخر حرف: *${[...starter].pop()}*\n\n💬 اكتب كلمة تبدأ بـ *${[...starter].pop()}* مباشرة`, m)
      conn.games3[gameKey].msgId = sent?.key?.id
      return
    }

    const g = conn.games3[gameKey]
    if (!word) return m.reply(`الكلمة الأخيرة: *${g.lastWord}*\n اكتب كلمة تبدأ بـ *${[...g.lastWord].pop()}*`)
    return _wordChainProcess(conn, m, gameKey, word)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// handler.all — يلتقط الردود والنصوص لجميع الألعاب
// ─────────────────────────────────────────────────────────────────────────────
handler.all = async function (m) {
  if (!this.games3) return
  if (m.isBaileys) return

  const rawText = (m.text || '').trim()
  if (!rawText) return
  if (global.prefix?.test?.(rawText)) return   // تجاهل الأوامر

  const chatId = m.chat
  const senderId = m.sender

  // ── لغز الإيموجي ──────────────────────────────────────────────────────────
  const emojiGame = this.games3[`emoji_${chatId}`]
  if (emojiGame) {
    if (Date.now() > emojiGame.expiresAt) {
      const ans = emojiGame.answer
      delete this.games3[`emoji_${chatId}`]
      await this.reply(m.chat, `⏰ انتهى الوقت! الجواب كان: *${ans}*`, m)
      return
    }

    const norm = normalize(rawText)
    const ans  = normalize(emojiGame.answer)
    if (norm.includes(ans) || ans.includes(norm)) {
      delete this.games3[`emoji_${chatId}`]
      const user = giveReward(m, 200)
      await this.reply(m.chat,
        `🏆 *صحيح!* الجواب هو: *${emojiGame.answer}* 🎉\n\n@${senderId.split('@')[0]} مبروك!\n💰 +${fmt(200)} | ⭐ +30 XP\n💼 رصيدك: ${fmt(user.money)}`,
        m, { mentions: [senderId] })
      return
    }
    // رد خاطئ — لا نرسل رسالة لكل حرف لتجنب الفوضى في المجموعات
    // نرد فقط إذا كان reply مباشر على رسالة السؤال
    const isDirectReply = m.quoted && emojiGame.msgId && m.quoted.id === emojiGame.msgId
    if (isDirectReply) {
      await this.reply(m.chat, `❌ إجابة خاطئة، حاول مجدداً!\n${emojiGame.emojis}`, m)
    }
    return
  }

  // ── تخمين الرقم ────────────────────────────────────────────────────────────
  const numGame = this.games3[`num_${senderId}_${chatId}`]
  if (numGame) {
    if (Date.now() > numGame.expiresAt) {
      const ans = numGame.answer
      delete this.games3[`num_${senderId}_${chatId}`]
      await this.reply(m.chat, `⏰ انتهى الوقت! كان الرقم: *${ans}*`, m)
      return
    }
    const guess = parseInt(rawText)
    if (!isNaN(guess)) {
      await _numGuessProcess(this, m, `num_${senderId}_${chatId}`, guess)
    }
    return
  }

  // ── لعبة المشنقة ───────────────────────────────────────────────────────────
  const hangGame = this.games3[`hang_${chatId}`]
  if (hangGame && rawText.length === 1 && /[\u0621-\u064A]/.test(rawText)) {
    await _hangmanGuess(this, m, `hang_${chatId}`, rawText)
    return
  }

  // ── لعبة الوصلة ────────────────────────────────────────────────────────────
  const chainGame = this.games3[`chain_${chatId}`]
  if (chainGame && rawText.length >= 2 && !/\s/.test(rawText)) {
    await _wordChainProcess(this, m, `chain_${chatId}`, rawText)
    return
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// دوال المساعدة
// ─────────────────────────────────────────────────────────────────────────────
async function _hangmanGuess(conn, m, gameKey, letter) {
  const g = conn.games3[gameKey]
  if (!g) return
  const senderId = m.sender

  if (g.guessed.includes(letter)) {
    return conn.reply(m.chat, `❗ جربت الحرف "*${letter}*" من قبل.\nالأحرف المجربة: ${g.guessed.join(', ')}`, m)
  }

  g.guessed.push(letter)
  const inWord = g.word.includes(letter)
  if (!inWord) g.wrong++

  const display = [...g.word].map(c => g.guessed.includes(c) ? c : '_').join(' ')
  const won = !display.includes('_')

  if (won) {
    delete conn.games3[gameKey]
    giveReward(m, 300)
    return conn.reply(m.chat,
      `${HANGMAN_STAGES[g.wrong]}\n\n🏆 *صحيح! الكلمة هي: ${g.word}*\nمبروك @${senderId.split('@')[0]} 🎉\n💰 +300 🪙 | ⭐ +30 XP`,
      m, { mentions: [senderId] })
  }
  if (g.wrong >= 6) {
    delete conn.games3[gameKey]
    return conn.reply(m.chat, `${HANGMAN_STAGES[6]}\n\n💀 خسرت! الكلمة كانت: *${g.word}*`, m)
  }

  return conn.reply(m.chat,
    `${HANGMAN_STAGES[g.wrong]}\n\n${inWord ? '✅ حرف صحيح!' : `❌ الحرف "*${letter}*" غير موجود (${6 - g.wrong} محاولات متبقية)`}\n\n💡 تلميح: ${g.hint}\n🔤 الكلمة: *${display}*\nالأحرف المجربة: ${g.guessed.join(', ')}`, m)
}

async function _numGuessProcess(conn, m, gameKey, guess) {
  const g = conn.games3[gameKey]
  if (!g) return

  g.tries++
  if (guess === g.answer) {
    delete conn.games3[gameKey]
    const user = giveReward(m, 150)
    return conn.reply(m.chat,
      `🏆 *صحيح!* الرقم هو *${g.answer}*\nعدد المحاولات: ${g.tries}\n💰 +${fmt(150)} | ⭐ +30 XP\n💼 رصيدك: ${fmt(user.money)}`, m)
  }

  const diff = Math.abs(guess - g.answer)
  const hint = diff <= 3 ? '🔥 ساخن جداً!' : diff <= 10 ? '🌡️ دافئ' : diff <= 25 ? '❄️ بارد' : '🧊 بارد جداً'
  return conn.reply(m.chat,
    `${guess > g.answer ? '⬇️ أصغر' : '⬆️ أكبر'} — ${hint}\nالمحاولة رقم: ${g.tries}`, m)
}

async function _wordChainProcess(conn, m, gameKey, word) {
  const g = conn.games3[gameKey]
  if (!g) return

  const firstChar = word[0]
  const expectedChar = [...g.lastWord].pop()

  if (firstChar !== expectedChar) {
    return conn.reply(m.chat, `❌ الكلمة يجب أن تبدأ بحرف *${expectedChar}*\nالكلمة الأخيرة كانت: *${g.lastWord}*`, m)
  }
  if (g.used.includes(word)) {
    return conn.reply(m.chat, `❌ الكلمة *${word}* استُخدمت من قبل!`, m)
  }

  g.used.push(word)
  g.lastWord = word
  g.lastPlayer = m.sender
  giveReward(m, 50)
  return conn.reply(m.chat,
    `✅ *${word}* — جيد! 💰 +50\n\nاكتب كلمة تبدأ بـ *${[...word].pop()}*\nعدد الكلمات: ${g.used.length}`, m)
}

handler.help = ['شنقه', 'خمن_رقم', 'ايموجي', 'وصله']
handler.tags = ['game']
handler.command = /^(شنقه|hangman|خمن_رقم|numguess|ايموجي|emoji_riddle|وصله|وصلة|wordchain)$/i
export default handler
