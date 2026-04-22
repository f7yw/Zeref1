import chalk from 'chalk'

// ════════════════════════════════════════════════════════════════════
//  ⚙️  إعدادات اللعبة
// ════════════════════════════════════════════════════════════════════
const CFG = {
  MIN_PLAYERS:     4,
  MAX_PLAYERS:     15,
  LOBBY_TIMEOUT:   10 * 60 * 1000,   // 10 دقائق للوبي
  NIGHT_TIMEOUT:   75 * 1000,        // 75 ثانية للأفعال الليلية
  DISCUSS_TIMEOUT: 90 * 1000,        // 90 ثانية للنقاش
  VOTE_TIMEOUT:    60 * 1000,        // 60 ثانية للتصويت
}

// ════════════════════════════════════════════════════════════════════
//  🎭  تعريف الأدوار
// ════════════════════════════════════════════════════════════════════
const ROLE_DEF = {
  مافيا:  {
    team:  'mafia',
    emoji: '🔴',
    night: true,
    action: 'kill',
    desc:   'تعرف زملاءك وتقتل لاعباً كل ليلة في الخفاء.',
    tip:    'تعاون مع فريق المافيا وصوّتوا على هدف واحد.',
  },
  عراب:   {
    team:  'mafia',
    emoji: '👑',
    night: true,
    action: 'kill',
    desc:   'رأس المافيا — يبدو بريئاً تماماً عند تحقيق المحقق!',
    tip:    'استخدم غطاءك البريء للإفلات من الاشتباه.',
  },
  طبيب:   {
    team:  'town',
    emoji: '💚',
    night: true,
    action: 'save',
    desc:   'تنقذ لاعباً واحداً من القتل كل ليلة. لا يمكنك حماية نفس الشخص ليلتين متتاليتين.',
    tip:    'احمِ نفسك في البداية، ثم انتقل لحماية الشخصيات المهمة.',
  },
  محقق:   {
    team:  'town',
    emoji: '🔵',
    night: true,
    action: 'investigate',
    desc:   'تحقق في هوية لاعب واحد كل ليلة وتعرف هل هو مافيا أم بريء. العراب يبدو بريئاً دائماً!',
    tip:    'لا تكشف هويتك إلا عند الضرورة — أنت هدف رئيسي للمافيا.',
  },
  حارس:   {
    team:  'town',
    emoji: '🛡️',
    night: true,
    action: 'guard',
    desc:   'تحمي لاعباً من القتل كل ليلة — إذا استُهدف من تحميه، أنت من يموت بدلاً عنه!',
    tip:    'احمِ المحقق أو الطبيب — هم الأكثر خطراً على المافيا.',
  },
  مواطن:  {
    team:  'town',
    emoji: '⚪',
    night: false,
    action: null,
    desc:   'لا قدرة خاصة — قوتك الكاملة في التصويت والنقاش الذكي.',
    tip:    'راقب ردود الأفعال وتتبع من يتهرب من الأسئلة.',
  },
  مهرج:   {
    team:  'joker',
    emoji: '🃏',
    night: false,
    action: null,
    desc:   'هدفك الوحيد: اجعل المواطنين يطردونك بالتصويت! إذا طردتك المافيا ليلاً، تخسر.',
    tip:    'تصرف بشكل مريب تدريجياً — إذا كنت واضحاً جداً سيشكّون فيك.',
  },
}

// ════════════════════════════════════════════════════════════════════
//  🎲  توزيع الأدوار حسب عدد اللاعبين
// ════════════════════════════════════════════════════════════════════
function buildRoleList(count) {
  let roles = []

  if      (count === 4)  roles = ['مافيا','طبيب','مواطن','مواطن']
  else if (count === 5)  roles = ['مافيا','طبيب','محقق','مواطن','مواطن']
  else if (count === 6)  roles = ['مافيا','مافيا','طبيب','محقق','مواطن','مواطن']
  else if (count === 7)  roles = ['مافيا','مافيا','طبيب','محقق','حارس','مواطن','مواطن']
  else if (count === 8)  roles = ['عراب','مافيا','طبيب','محقق','حارس','مواطن','مواطن','مواطن']
  else if (count === 9)  roles = ['عراب','مافيا','مافيا','طبيب','محقق','حارس','مواطن','مواطن','مواطن']
  else if (count === 10) roles = ['عراب','مافيا','مافيا','طبيب','محقق','حارس','مهرج','مواطن','مواطن','مواطن']
  else {
    const mafiaTotal = Math.max(2, Math.floor(count / 3))
    roles.push('عراب')
    for (let i = 1; i < mafiaTotal; i++) roles.push('مافيا')
    roles.push('طبيب', 'محقق', 'حارس')
    if (count >= 12) roles.push('مهرج')
    while (roles.length < count) roles.push('مواطن')
  }

  // خلط عشوائي (Fisher-Yates)
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]]
  }

  return roles
}

// ════════════════════════════════════════════════════════════════════
//  📦  إدارة الجلسات
// ════════════════════════════════════════════════════════════════════
global.mafiaGames ??= {}

const getGame  = (chatId) => global.mafiaGames[chatId]
const setGame  = (chatId, g) => { global.mafiaGames[chatId] = g }
const delGame  = (chatId) => { delete global.mafiaGames[chatId] }

const alive      = (g) => g.players.filter(p => p.alive)
const aliveMafia = (g) => alive(g).filter(p => ROLE_DEF[p.role].team === 'mafia')
const aliveTown  = (g) => alive(g).filter(p => ROLE_DEF[p.role].team === 'town')
const byJid      = (g, jid) => g.players.find(p => p.jid === jid)

function clearTimer(g) {
  if (g.timer) { clearTimeout(g.timer); g.timer = null }
}

// ════════════════════════════════════════════════════════════════════
//  🏆  شروط الفوز
// ════════════════════════════════════════════════════════════════════
function checkWin(g) {
  const mafia = aliveMafia(g).length
  const town  = aliveTown(g).length
  if (mafia === 0) return 'town'
  if (mafia >= town) return 'mafia'
  return null
}

// ════════════════════════════════════════════════════════════════════
//  📋  مساعدات العرض
// ════════════════════════════════════════════════════════════════════
function aliveListStr(g) {
  return alive(g).map((p, i) => `  *${i + 1}.* ${p.name}`).join('\n')
}

function fullRosterStr(g) {
  return g.players.map(p => {
    const def    = ROLE_DEF[p.role]
    const status = p.alive ? '✅' : '☠️'
    return `${status} ${def.emoji} ${p.name} — *${p.role}*`
  }).join('\n')
}

// ════════════════════════════════════════════════════════════════════
//  🏁  إنهاء اللعبة
// ════════════════════════════════════════════════════════════════════
async function endGame(conn, g, winner, note = '') {
  clearTimer(g)
  const chatId = g.chatId

  let winBanner = ''
  if (winner === 'town') {
    winBanner = `🎉 *أهل القرية انتصروا!*
🕊️ تم القضاء على المافيا... القرية بأمان.`
  } else if (winner === 'mafia') {
    winBanner = `😈 *المافيا انتصرت!*
🌑 سيطر المجرمون على القرية في صمت مطبق.`
  } else if (winner === 'joker') {
    winBanner = `🃏 *المهرج فاز!*
😂 خدع الجميع وحقّق هدفه المجنون!`
  }

  const roster = fullRosterStr(g)
  const msg = [
    `╔══════════════════════════════`,
    `║  🎮 *انتهت لعبة المافيا!*`,
    `╠══════════════════════════════`,
    `║`,
    winBanner.split('\n').map(l => `║  ${l}`).join('\n'),
    note ? `║\n║  📌 ${note}` : '',
    `║`,
    `║  📋 *كشف الأدوار الكامل:*`,
    roster.split('\n').map(l => `║  ${l}`).join('\n'),
    `║`,
    `╚══════════════════════════════`,
    `🔄 لبدء جولة جديدة: *.مافيا*`,
  ].filter(Boolean).join('\n')

  await conn.sendMessage(chatId, { text: msg })
  delGame(chatId)
}

// ════════════════════════════════════════════════════════════════════
//  🌙  مرحلة الليل
// ════════════════════════════════════════════════════════════════════
async function startNight(conn, g) {
  clearTimer(g)
  g.state       = 'night'
  g.phase++
  g.nightActions = { save: null, investigate: null, guard: null }
  g.mafiaVotes  = {}
  g.nightDone   = {}

  const aliveCount = alive(g).length

  const nightMsg = [
    `🌙 *الليل يحلّ على القرية...*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🔇 *صمت تام* — الجميع نائمون إلا من يعملون في الظلام.`,
    ``,
    `🌑 *الليلة رقم ${g.phase}*  •  ${aliveCount} لاعب حيّ`,
    ``,
    `_📩 سيتلقى أصحاب الأدوار رسائل خاصة..._`,
    `_⏰ لديهم 75 ثانية للتصرف قبل حلول الفجر._`,
  ].join('\n')

  await conn.sendMessage(g.chatId, { text: nightMsg })
  await pause(2500)
  await sendNightDMs(conn, g)

  g.timer = setTimeout(() => resolveNight(conn, g), CFG.NIGHT_TIMEOUT)
}

// ─── إرسال رسائل الليل الخاصة ───────────────────────────────────────
async function sendNightDMs(conn, g) {
  const aliveP    = alive(g)
  const mafiaTeam = aliveP.filter(p => ROLE_DEF[p.role].team === 'mafia')
  const nonMafia  = aliveP.filter(p => ROLE_DEF[p.role].team !== 'mafia')

  // ── المافيا ──────────────────────────────────────────────────────
  const teammatesStr = mafiaTeam.map(p => `${ROLE_DEF[p.role].emoji} ${p.name}`).join('\n    ')
  const targetsStr   = nonMafia.map((p, i) => `  *${i + 1}.* ${p.name}`).join('\n')

  for (const mp of mafiaTeam) {
    const label = mp.role === 'عراب' ? '👑 *أنت العراب*' : '🔴 *أنت مافيا*'
    const dm = [
      `🌑 *الليلة ${g.phase} — دور المافيا*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      label,
      ``,
      `👥 *زملاؤك في المافيا:*`,
      `    ${teammatesStr}`,
      ``,
      `🎯 *اختر الضحية الليلة:*`,
      targetsStr,
      ``,
      `↩️ _ردّ على هذه الرسالة برقم اختيارك._`,
    ].join('\n')

    try {
      const sent = await conn.sendMessage(mp.jid, { text: dm })
      mp.nightMsgId = sent?.key?.id ?? null
    } catch (e) {
      console.error(chalk.red('[MAFIA] DM-Mafia error'), mp.name, e.message)
    }
  }

  // ── الطبيب ──────────────────────────────────────────────────────
  const doctor = aliveP.find(p => p.role === 'طبيب')
  if (doctor) {
    const saveList = aliveP.map((p, i) => {
      const blocked = g.lastSaved === p.jid ? ' _(محظور — نجّيته أمس)_' : ''
      return `  *${i + 1}.* ${p.name}${blocked}`
    }).join('\n')

    const dm = [
      `💚 *الليلة ${g.phase} — دور الطبيب*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🏥 *من تريد حماية الليلة؟*`,
      ``,
      saveList,
      ``,
      `💡 _لا يمكنك حماية نفس الشخص ليلتين متتاليتين._`,
      `↩️ _ردّ على هذه الرسالة برقم اختيارك._`,
    ].join('\n')

    try {
      const sent = await conn.sendMessage(doctor.jid, { text: dm })
      doctor.nightMsgId = sent?.key?.id ?? null
    } catch (e) {
      console.error(chalk.red('[MAFIA] DM-Doctor error'), e.message)
    }
  }

  // ── المحقق ──────────────────────────────────────────────────────
  const detective = aliveP.find(p => p.role === 'محقق')
  if (detective) {
    const others    = aliveP.filter(p => p.jid !== detective.jid)
    const invList   = others.map((p, i) => `  *${i + 1}.* ${p.name}`).join('\n')

    const dm = [
      `🔵 *الليلة ${g.phase} — دور المحقق*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🔍 *من تحقق في هويته الليلة؟*`,
      ``,
      invList,
      ``,
      `💡 _ستعرف هل هو مشبوه (مافيا) أم بريء._`,
      `⚠️ _تنبيه: العراب يبدو بريئاً دائماً!_`,
      `↩️ _ردّ على هذه الرسالة برقم اختيارك._`,
    ].join('\n')

    try {
      const sent = await conn.sendMessage(detective.jid, { text: dm })
      detective.nightMsgId = sent?.key?.id ?? null
    } catch (e) {
      console.error(chalk.red('[MAFIA] DM-Detective error'), e.message)
    }
  }

  // ── الحارس ──────────────────────────────────────────────────────
  const bodyguard = aliveP.find(p => p.role === 'حارس')
  if (bodyguard) {
    const others    = aliveP.filter(p => p.jid !== bodyguard.jid)
    const guardList = others.map((p, i) => `  *${i + 1}.* ${p.name}`).join('\n')

    const dm = [
      `🛡️ *الليلة ${g.phase} — دور الحارس*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💪 *من تحمي بجسدك الليلة؟*`,
      ``,
      guardList,
      ``,
      `⚔️ _إذا استُهدف من تحميه، أنت من يموت بدلاً عنه!_`,
      `↩️ _ردّ على هذه الرسالة برقم اختيارك._`,
    ].join('\n')

    try {
      const sent = await conn.sendMessage(bodyguard.jid, { text: dm })
      bodyguard.nightMsgId = sent?.key?.id ?? null
    } catch (e) {
      console.error(chalk.red('[MAFIA] DM-Bodyguard error'), e.message)
    }
  }
}

// ─── حل الليل ────────────────────────────────────────────────────────
async function resolveNight(conn, g) {
  clearTimer(g)
  if (g.state !== 'night') return
  g.state = 'resolving'

  const aliveP = alive(g)

  // ── تحديد هدف المافيا بالأغلبية ─────────────────────────────────
  let killTargetJid = null
  const mafiaVoteEntries = Object.values(g.mafiaVotes)
  if (mafiaVoteEntries.length > 0) {
    const tally = {}
    for (const t of mafiaVoteEntries) tally[t] = (tally[t] || 0) + 1
    killTargetJid = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0]
  }

  const { save, investigate, guard } = g.nightActions
  const events = []
  let actualDead = null

  if (killTargetJid) {
    const victim    = byJid(g, killTargetJid)
    const isGuarded = guard === killTargetJid
    const isSaved   = save  === killTargetJid

    if (isGuarded) {
      const bg = aliveP.find(p => p.role === 'حارس')
      if (bg) {
        bg.alive   = false
        actualDead = bg
        events.push(`⚔️ *الحارس ضحّى بنفسه!*`)
        events.push(`   *${bg.name}* مات وهو يحمي ${victim?.name || 'زميله'}.`)
        events.push(`   دوره كان: ${ROLE_DEF[bg.role].emoji} *${bg.role}*`)
        if (isSaved) {
          g.lastSaved = killTargetJid
          events.push(`   (كان الطبيب أيضاً يحمي المستهدف في نفس الليلة)`)
        }
      }
    } else if (isSaved) {
      events.push(`💊 *أنقذ الطبيب أحداً من الموت الليلة!*`)
      events.push(`   القرية نجت من مصيبة — لكن المافيا لم تتوقف.`)
      g.lastSaved = killTargetJid
    } else if (victim) {
      victim.alive = false
      actualDead   = victim
      events.push(`💀 *وجد أهل القرية صباحاً جثة!*`)
      events.push(`   *${victim.name}* لقي حتفه خلال الليل.`)
      events.push(`   دوره كان: ${ROLE_DEF[victim.role].emoji} *${victim.role}*`)
      g.lastSaved = null
    }
  } else {
    events.push(`😌 *ليلة هادئة...*`)
    events.push(`   لم يجرِ أي هجوم هذه الليلة.`)
    g.lastSaved = null
  }

  // ── نتيجة تحقيق المحقق (رسالة خاصة) ──────────────────────────
  const detective = aliveP.find(p => p.role === 'محقق' && p.alive)
  if (detective && investigate) {
    const target    = byJid(g, investigate)
    if (target) {
      const isSuspect = target.role === 'مافيا'  // العراب يبدو بريئاً
      const result    = isSuspect
        ? `🔴 *مشبوه! — يبدو أنه مافيا*`
        : `🟢 *يبدو بريئاً*`

      const invResult = [
        `🔵 *نتيجة تحقيقك — الليلة ${g.phase}*`,
        `━━━━━━━━━━━━━━━━━━━━━━━━`,
        `🔍 حقّقت في: *${target.name}*`,
        `النتيجة: ${result}`,
        ``,
        `⚠️ _تذكّر: العراب يبدو بريئاً دائماً — لا تثق بنتيجة واحدة._`,
      ].join('\n')

      try { await conn.sendMessage(detective.jid, { text: invResult }) } catch (e) {}
    }
  }

  // ── رسالة الفجر في المجموعة ─────────────────────────────────────
  const aliveNow  = alive(g)
  const aliveList = aliveNow.map(p => `  ✅ ${p.name}`).join('\n') || '  _لا أحياء_'

  const dawnMsg = [
    `🌅 *الفجر يطلع على القرية...*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    ...events,
    ``,
    `👥 *الأحياء (${aliveNow.length}):*`,
    aliveList,
  ].join('\n')

  await conn.sendMessage(g.chatId, { text: dawnMsg })

  // ── فحص الفوز ────────────────────────────────────────────────────
  const win = checkWin(g)
  if (win) return endGame(conn, g, win)

  await pause(2500)
  await startDiscuss(conn, g)
}

// ════════════════════════════════════════════════════════════════════
//  ☀️  مرحلة النقاش
// ════════════════════════════════════════════════════════════════════
async function startDiscuss(conn, g) {
  clearTimer(g)
  g.state    = 'discuss'
  g.dayVotes  = {}
  g.voteMsgId = null

  const aliveP  = alive(g)
  const list    = aliveListStr(g)

  const discussMsg = [
    `☀️ *النهار — وقت المداولة*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🗣️ ناقشوا من تشتبهون بأنه المافيا!`,
    ``,
    `👥 *الأحياء (${aliveP.length}):*`,
    list,
    ``,
    `⏰ _لديكم 90 ثانية للنقاش، ثم يبدأ التصويت..._`,
  ].join('\n')

  await conn.sendMessage(g.chatId, { text: discussMsg })
  g.timer = setTimeout(() => startVote(conn, g), CFG.DISCUSS_TIMEOUT)
}

// ════════════════════════════════════════════════════════════════════
//  🗳️  مرحلة التصويت
// ════════════════════════════════════════════════════════════════════
async function startVote(conn, g) {
  clearTimer(g)
  g.state    = 'vote'
  g.dayVotes  = {}

  const aliveP = alive(g)
  const list   = aliveP.map((p, i) => `  *${i + 1}.* ${p.name}`).join('\n')

  const voteMsg = [
    `🗳️ *وقت التصويت!*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📋 *من تعتقد أنه المافيا؟*`,
    ``,
    list,
    ``,
    `↩️ *ردّ على هذه الرسالة برقم المشتبه به*`,
    `⏰ _60 ثانية — التصويت سري!_`,
  ].join('\n')

  const sent = await conn.sendMessage(g.chatId, { text: voteMsg })
  g.voteMsgId = sent?.key?.id ?? null
  g.timer = setTimeout(() => resolveVote(conn, g), CFG.VOTE_TIMEOUT)
}

// ─── حل التصويت ──────────────────────────────────────────────────────
async function resolveVote(conn, g) {
  clearTimer(g)
  if (g.state !== 'vote') return
  g.state = 'resolving'

  const aliveP  = alive(g)
  const votes   = g.dayVotes || {}

  // إحصاء الأصوات
  const tally = {}
  for (const targetJid of Object.values(votes)) {
    tally[targetJid] = (tally[targetJid] || 0) + 1
  }

  const tallyStr = aliveP
    .filter(p => tally[p.jid])
    .sort((a, b) => (tally[b.jid] || 0) - (tally[a.jid] || 0))
    .map(p => `  ${p.name}: *${tally[p.jid]} صوت*`)
    .join('\n') || '  _لا أصوات مسجّلة_'

  // لا أحد صوّت
  if (Object.keys(tally).length === 0) {
    await conn.sendMessage(g.chatId, {
      text: [
        `😶 *لم يصوّت أحد!*`,
        ``,
        `🌙 بدء الليل...`,
      ].join('\n')
    })
    await pause(2000)
    return startNight(conn, g)
  }

  // إيجاد الأعلى أصوات
  const sorted    = Object.entries(tally).sort((a, b) => b[1] - a[1])
  const maxVotes  = sorted[0][1]
  const topTied   = sorted.filter(([, v]) => v === maxVotes)

  // تعادل
  if (topTied.length > 1) {
    await conn.sendMessage(g.chatId, {
      text: [
        `⚖️ *نتيجة التصويت — اليوم ${g.phase}*`,
        `━━━━━━━━━━━━━━━━━━━━━━━━`,
        `📊 *الأصوات:*`,
        tallyStr,
        ``,
        `🤝 *تعادل!* — لم يُطرد أحد.`,
        ``,
        `🌙 بدء الليل...`,
      ].join('\n')
    })
    await pause(2000)
    return startNight(conn, g)
  }

  const eliminatedJid = topTied[0][0]
  const eliminated    = byJid(g, eliminatedJid)
  if (!eliminated) return startNight(conn, g)

  eliminated.alive = false

  const resultMsg = [
    `⚖️ *نتيجة التصويت — اليوم ${g.phase}*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `📊 *الأصوات:*`,
    tallyStr,
    ``,
    `🚪 *تم طرد:* ${eliminated.name}`,
    `🎭 *دوره كان:* ${ROLE_DEF[eliminated.role].emoji} *${eliminated.role}*`,
  ].join('\n')

  await conn.sendMessage(g.chatId, { text: resultMsg })

  // المهرج يفوز إذا طُرد بالتصويت
  if (eliminated.role === 'مهرج') {
    await pause(1000)
    return endGame(conn, g, 'joker', `${eliminated.name} كان المهرج السري! 🎊`)
  }

  const win = checkWin(g)
  if (win) return endGame(conn, g, win)

  await pause(2500)
  return startNight(conn, g)
}

// ════════════════════════════════════════════════════════════════════
//  📨  معالجة اختيارات الليل
// ════════════════════════════════════════════════════════════════════
async function handleNightDM(conn, g, player, num) {
  const aliveP = alive(g)
  const role   = player.role

  if (ROLE_DEF[role].team === 'mafia') {
    const targets = aliveP.filter(p => ROLE_DEF[p.role].team !== 'mafia')
    const target  = targets[num - 1]
    if (!target) {
      await conn.sendMessage(player.jid, { text: `❌ رقم غير صالح. اختر بين 1 و ${targets.length}` })
      return
    }
    g.mafiaVotes[player.jid]  = target.jid
    g.nightDone[player.jid]   = true
    await conn.sendMessage(player.jid, { text: `✅ اخترت *${target.name}* هدفاً. انتظر بقية فريقك أو انتهاء المدة.` })
    await checkAllNightDone(conn, g)

  } else if (role === 'طبيب') {
    const target = aliveP[num - 1]
    if (!target) {
      await conn.sendMessage(player.jid, { text: `❌ رقم غير صالح. اختر بين 1 و ${aliveP.length}` })
      return
    }
    if (g.lastSaved === target.jid) {
      await conn.sendMessage(player.jid, { text: `⚠️ لا يمكنك حماية *${target.name}* ليلتين متتاليتين! اختر شخصاً آخر.` })
      return
    }
    g.nightActions.save       = target.jid
    g.nightDone[player.jid]   = true
    await conn.sendMessage(player.jid, { text: `✅ ستحمي *${target.name}* هذه الليلة. 🙏` })
    await checkAllNightDone(conn, g)

  } else if (role === 'محقق') {
    const others = aliveP.filter(p => p.jid !== player.jid)
    const target = others[num - 1]
    if (!target) {
      await conn.sendMessage(player.jid, { text: `❌ رقم غير صالح. اختر بين 1 و ${others.length}` })
      return
    }
    g.nightActions.investigate = target.jid
    g.nightDone[player.jid]    = true
    await conn.sendMessage(player.jid, { text: `✅ ستحقق في *${target.name}*. ستصلك النتيجة مع الفجر. 🔍` })
    await checkAllNightDone(conn, g)

  } else if (role === 'حارس') {
    const others = aliveP.filter(p => p.jid !== player.jid)
    const target = others[num - 1]
    if (!target) {
      await conn.sendMessage(player.jid, { text: `❌ رقم غير صالح. اختر بين 1 و ${others.length}` })
      return
    }
    g.nightActions.guard      = target.jid
    g.nightDone[player.jid]   = true
    await conn.sendMessage(player.jid, { text: `✅ ستحمي *${target.name}* بجسدك الليلة. ⚔️` })
    await checkAllNightDone(conn, g)
  }
}

async function checkAllNightDone(conn, g) {
  if (g.state !== 'night') return
  const aliveP  = alive(g)
  const withNight = aliveP.filter(p => ROLE_DEF[p.role].night)
  if (withNight.every(p => g.nightDone[p.jid])) {
    clearTimer(g)
    await pause(1000)
    await resolveNight(conn, g)
  }
}

// ════════════════════════════════════════════════════════════════════
//  🛠️  مساعد التوقف
// ════════════════════════════════════════════════════════════════════
const pause = (ms) => new Promise(r => setTimeout(r, ms))

// ════════════════════════════════════════════════════════════════════
//  🎮  معالج الأوامر الرئيسي
// ════════════════════════════════════════════════════════════════════
let handler = async (m, { conn, command }) => {
  if (!m.isGroup) return m.reply('❌ لعبة المافيا تعمل فقط في المجموعات!')

  const chatId = m.chat
  const sender = m.sender
  const name   = m.pushName || sender.split('@')[0]
  const g      = getGame(chatId)

  // ══════════════════════════════════════════════════════════════
  //  .مافيا — فتح لوبي جديد
  // ══════════════════════════════════════════════════════════════
  if (/^(مافيا|mafia)$/i.test(command)) {
    if (g) {
      if (g.state === 'lobby') return m.reply(`⚠️ اللعبة في انتظار اللاعبين (${g.players.length}/${CFG.MAX_PLAYERS}).\nأرسل *.انضم* للانضمام!`)
      return m.reply('⚠️ هناك لعبة جارية بالفعل في هذه المجموعة!')
    }

    const newGame = {
      chatId,
      host:        sender,
      state:       'lobby',
      phase:       0,
      players:     [{ jid: sender, name, alive: true, role: null, nightMsgId: null }],
      mafiaVotes:  {},
      nightActions: { save: null, investigate: null, guard: null },
      nightDone:   {},
      dayVotes:    {},
      voteMsgId:   null,
      lastSaved:   null,
      timer:       null,
    }
    setGame(chatId, newGame)

    // إغلاق اللوبي تلقائياً بعد 10 دقائق
    newGame.timer = setTimeout(async () => {
      const current = getGame(chatId)
      if (current && current.state === 'lobby') {
        delGame(chatId)
        await conn.sendMessage(chatId, { text: '⏰ انتهى وقت الانتظار — تم إلغاء اللعبة لعدم اكتمال اللاعبين.' })
      }
    }, CFG.LOBBY_TIMEOUT)

    const lobbyMsg = [
      `🎮 *لعبة المافيا!*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `👑 المضيف: *${name}*`,
      ``,
      `📜 *فكرة اللعبة:*`,
      `• أهل القرية يحاولون كشف المافيا وطردها.`,
      `• المافيا تقتل لاعباً سراً كل ليلة.`,
      `• كل نهار يصوّت الجميع لطرد المشتبه به.`,
      `• المافيا تفوز إذا ساوت أو تجاوزت المواطنين.`,
      `• المدينة تفوز إذا قضت على المافيا كاملاً.`,
      ``,
      `🎭 *الأدوار:* مافيا 🔴  عراب 👑  طبيب 💚  محقق 🔵  حارس 🛡️  مواطن ⚪  مهرج 🃏`,
      ``,
      `📥 للانضمام: *.انضم*`,
      `▶️ لبدء اللعبة (${CFG.MIN_PLAYERS}+ لاعبين): *.بدء_مافيا*`,
      `⛔ للإلغاء: *.وقف_مافيا*`,
      ``,
      `👥 *اللاعبون (${CFG.MIN_PLAYERS}-${CFG.MAX_PLAYERS}):*`,
      `  1. ${name} 👑`,
    ].join('\n')

    await conn.sendMessage(chatId, { text: lobbyMsg }, { quoted: m })
    return
  }

  // ══════════════════════════════════════════════════════════════
  //  .انضم — الانضمام للوبي
  // ══════════════════════════════════════════════════════════════
  if (/^(انضم|انضمام|join|انضم_مافيا|join_mafia|join[_\s]?mafia|انضم[_\s]?لعبه)$/i.test(command)) {
    if (!g) return m.reply('❌ لا توجد لعبة نشطة. ابدأ بـ *.مافيا*')
    if (g.state !== 'lobby') return m.reply('❌ اللعبة بدأت بالفعل، لا يمكن الانضمام الآن.')
    if (g.players.find(p => p.jid === sender)) return m.reply('✅ أنت مسجّل بالفعل في اللعبة!')
    if (g.players.length >= CFG.MAX_PLAYERS) return m.reply(`❌ اللعبة ممتلئة (${CFG.MAX_PLAYERS} لاعب)!`)

    g.players.push({ jid: sender, name, alive: true, role: null, nightMsgId: null })

    const playerList = g.players
      .map((p, i) => `  ${i + 1}. ${p.name}${p.jid === g.host ? ' 👑' : ''}`)
      .join('\n')

    const ready = g.players.length >= CFG.MIN_PLAYERS
    await conn.sendMessage(chatId, {
      text: [
        `✅ *${name}* انضم للعبة!`,
        ``,
        `👥 *اللاعبون (${g.players.length}/${CFG.MAX_PLAYERS}):*`,
        playerList,
        ``,
        ready
          ? `✅ اكتمل الحد الأدنى — المضيف يمكنه إرسال *.بدء_مافيا*`
          : `⏳ ننتظر ${CFG.MIN_PLAYERS - g.players.length} لاعب(ين) إضافيين على الأقل...`,
      ].join('\n')
    }, { quoted: m })
    return
  }

  // ══════════════════════════════════════════════════════════════
  //  .بدء_مافيا — بدء اللعبة
  // ══════════════════════════════════════════════════════════════
  if (/^(بدء_مافيا|start_mafia)$/i.test(command)) {
    if (!g) return m.reply('❌ لا توجد لعبة. ابدأ بـ *.مافيا*')
    if (g.state !== 'lobby') return m.reply('❌ اللعبة بدأت بالفعل!')

    const isHost  = g.host === sender
    const isOwner = global.owner?.some(o => String(o[0]) === sender.split('@')[0])
    if (!isHost && !isOwner) return m.reply('❌ فقط المضيف يمكنه بدء اللعبة!')
    if (g.players.length < CFG.MIN_PLAYERS) return m.reply(`❌ تحتاج ${CFG.MIN_PLAYERS - g.players.length} لاعب(ين) إضافيين على الأقل.`)

    clearTimer(g)

    // توزيع الأدوار
    const roles = buildRoleList(g.players.length)
    g.players.forEach((p, i) => { p.role = roles[i] })

    const startMsg = [
      `🎭 *بدأت لعبة المافيا!*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `👥 *اللاعبون (${g.players.length}):*`,
      g.players.map((p, i) => `  ${i + 1}. ${p.name}`).join('\n'),
      ``,
      `📩 _تم إرسال الأدوار بشكل سري لكل لاعب..._`,
      `🌙 _بدء الليلة الأولى خلال ثوانٍ..._`,
    ].join('\n')

    await conn.sendMessage(chatId, { text: startMsg }, { quoted: m })

    // إرسال الدور بشكل خاص لكل لاعب
    for (const p of g.players) {
      const def = ROLE_DEF[p.role]
      const teammates = (def.team === 'mafia')
        ? g.players
            .filter(x => ROLE_DEF[x.role].team === 'mafia' && x.jid !== p.jid)
            .map(x => `${ROLE_DEF[x.role].emoji} ${x.name}`)
            .join('\n  ') || '_(أنت وحدك في الفريق)_'
        : null

      const roleMsg = [
        `🎭 *دورك في لعبة المافيا*`,
        `━━━━━━━━━━━━━━━━━━━━━━━━`,
        `أنت: ${def.emoji} *${p.role}*`,
        `الفريق: ${def.team === 'mafia' ? '🔴 المافيا' : def.team === 'joker' ? '🃏 مستقل' : '🟢 أهل القرية'}`,
        ``,
        `📖 *وظيفتك:*`,
        def.desc,
        ``,
        `💡 *نصيحة:*`,
        def.tip,
        teammates ? `\n👥 *زملاؤك في المافيا:*\n  ${teammates}` : '',
        ``,
        `━━━━━━━━━━━━━━━━━━━━━━━━`,
        `🤫 _احتفظ بدورك سراً — لا تخبر أحداً!_`,
      ].filter(x => x !== '').join('\n')

      try {
        await conn.sendMessage(p.jid, { text: roleMsg })
      } catch (e) {
        console.error(chalk.red('[MAFIA] Role DM error:'), p.name, e.message)
      }
    }

    g.state = 'starting'
    await pause(5000)
    await startNight(conn, g)
    return
  }

  // ══════════════════════════════════════════════════════════════
  //  .لاعبين — عرض قائمة اللاعبين
  // ══════════════════════════════════════════════════════════════
  if (/^(لاعبين|لاعبون|players)$/i.test(command)) {
    if (!g) return m.reply('❌ لا توجد لعبة نشطة.')
    const list = g.players.map((p, i) => {
      const status = g.state === 'lobby' ? '🎮' : (p.alive ? '✅' : '☠️')
      return `  ${i + 1}. ${status} ${p.name}${p.jid === g.host ? ' 👑' : ''}`
    }).join('\n')
    const header = g.state === 'lobby'
      ? `🎮 *اللوبي — في انتظار البدء*`
      : `🎭 *اللعبة جارية — الليلة ${g.phase}*`
    return m.reply(`${header}\n━━━━━━━━━━━━━━━━━━━━━━━━\n👥 *اللاعبون (${g.players.length}):*\n${list}`)
  }

  // ══════════════════════════════════════════════════════════════
  //  .وقف_مافيا — إيقاف اللعبة
  // ══════════════════════════════════════════════════════════════
  if (/^(وقف_مافيا|stop_mafia|إيقاف_مافيا|الغاء_مافيا)$/i.test(command)) {
    if (!g) return m.reply('❌ لا توجد لعبة نشطة.')
    const isHost  = g.host === sender
    const isOwner = global.owner?.some(o => String(o[0]) === sender.split('@')[0])
    if (!isHost && !isOwner) return m.reply('❌ فقط المضيف أو المالك يمكنه إيقاف اللعبة!')
    clearTimer(g)
    delGame(chatId)
    return conn.sendMessage(chatId, {
      text: `⛔ *تم إيقاف لعبة المافيا* بواسطة *${name}*.`
    }, { quoted: m })
  }

  // ══════════════════════════════════════════════════════════════
  //  .قواعد_مافيا — عرض دليل اللعبة الكامل
  // ══════════════════════════════════════════════════════════════
  if (/^(قواعد_مافيا|rules_mafia|قواعد مافيا)$/i.test(command)) {
    const guide = [
      `📖 *دليل لعبة المافيا — الدليل الكامل*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `🎯 *الفكرة:*`,
      `القرية بها مجرمون مختبئون (المافيا). المواطنون يحاولون كشفهم وطردهم قبل أن يسيطروا.`,
      ``,
      `🎭 *الأدوار:*`,
      ...Object.entries(ROLE_DEF).map(([name, d]) =>
        `${d.emoji} *${name}* (${d.team === 'mafia' ? '🔴 مافيا' : d.team === 'joker' ? '🃏 مستقل' : '🟢 مدينة'})\n   ${d.desc}`
      ),
      ``,
      `🔄 *دورة اللعب:*`,
      `1️⃣ 🌙 *الليل:* أصحاب الأدوار يؤدون مهامهم سراً (75ث)`,
      `2️⃣ 🌅 *الفجر:* إعلان أحداث الليل`,
      `3️⃣ ☀️ *النقاش:* الجميع يناقشون المشتبه بهم (90ث)`,
      `4️⃣ 🗳️ *التصويت:* طرد المشتبه به بالأغلبية (60ث)`,
      `5️⃣ 🔁 تكرار حتى انتهاء اللعبة`,
      ``,
      `🏆 *شروط الفوز:*`,
      `🟢 *المدينة:* تقضي على جميع أفراد المافيا`,
      `🔴 *المافيا:* عددهم يساوي أو يتجاوز المواطنين`,
      `🃏 *المهرج:* يطرده المواطنون بالتصويت`,
      ``,
      `📝 *الأوامر:*`,
      `*.مافيا* — فتح لوبي جديد`,
      `*.انضم* — الانضمام للوبي`,
      `*.بدء_مافيا* — بدء اللعبة (المضيف فقط)`,
      `*.لاعبين* — عرض اللاعبين`,
      `*.وقف_مافيا* — إيقاف اللعبة`,
      `*.قواعد_مافيا* — هذا الدليل`,
    ].join('\n')

    return conn.sendMessage(chatId, { text: guide }, { quoted: m })
  }
}

// ════════════════════════════════════════════════════════════════════
//  📡  اعتراض كل الرسائل (أفعال الليل + تصويت النهار)
// ════════════════════════════════════════════════════════════════════
handler.all = async function (m) {
  if (!m || !m.message) return

  const isGroup   = m.chat?.endsWith('@g.us')
  const isPrivate = !isGroup

  // ── رسائل الليل الخاصة ──────────────────────────────────────────
  if (isPrivate) {
    for (const g of Object.values(global.mafiaGames || {})) {
      if (g.state !== 'night') continue

      const player = g.players.find(p =>
        p.jid === m.sender &&
        p.alive &&
        ROLE_DEF[p.role]?.night
      )
      if (!player) continue
      if (g.nightDone[m.sender]) continue

      // التحقق من أنه يردّ على رسالة البوت الليلية
      const quotedId = m.quoted?.id
      if (!quotedId || quotedId !== player.nightMsgId) continue

      const num = parseInt((m.text || '').trim())
      if (isNaN(num) || num < 1) {
        await this.sendMessage(m.chat, { text: '❌ أرسل رقم اختيارك فقط.' })
        continue
      }

      await handleNightDM(this, g, player, num)
      break
    }
    return
  }

  // ── تصويت النهار في المجموعة ────────────────────────────────────
  if (isGroup) {
    const g = getGame(m.chat)
    if (!g || g.state !== 'vote') return

    const voter = g.players.find(p => p.jid === m.sender && p.alive)
    if (!voter) return

    const quotedId = m.quoted?.id
    if (!quotedId || quotedId !== g.voteMsgId) return

    if (g.dayVotes[m.sender]) {
      await this.sendMessage(m.chat, {
        text: `⚠️ *${voter.name}*، صوّتت بالفعل!`
      }, { quoted: m })
      return
    }

    const aliveP = alive(g)
    const num    = parseInt((m.text || '').trim())
    if (isNaN(num) || num < 1 || num > aliveP.length) {
      await this.sendMessage(m.chat, {
        text: `❌ اختر رقماً بين 1 و ${aliveP.length}`
      }, { quoted: m })
      return
    }

    const target = aliveP[num - 1]
    g.dayVotes[m.sender] = target.jid

    const voteCount = Object.keys(g.dayVotes).length
    await this.sendMessage(m.chat, {
      text: `🗳️ *${voter.name}* صوّت. (${voteCount}/${aliveP.length} صوتوا)`
    })

    // إنهاء التصويت إذا صوّت الجميع
    if (voteCount >= aliveP.length) {
      clearTimer(g)
      await resolveVote(this, g)
    }
  }
}

// ════════════════════════════════════════════════════════════════════
//  📌  إعدادات البلجن
// ════════════════════════════════════════════════════════════════════
handler.help    = ['مافيا - لعبة المافيا الاجتماعية الكاملة']
handler.tags    = ['game']
// ملاحظة: تمت إزالة (انضم|join|انضمام) لأنها تتعارض مع أمر إضافة البوت لقروب
// عبر رابط دعوة (plugins/owner-join.js). للانضمام للعبة المافيا استخدم:
//   .انضم_مافيا   .join_mafia
handler.command = /^(مافيا|mafia|انضم_مافيا|انضم[_\s]?لعبه|join_mafia|join[_\s]?mafia|بدء_مافيا|start_mafia|وقف_مافيا|stop_mafia|إيقاف_مافيا|الغاء_مافيا|لاعبين|لاعبون|players|قواعد_مافيا|rules_mafia)$/i

export default handler
