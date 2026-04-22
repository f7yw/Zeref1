// ─────────────────────────────────────────────────────────────────────────────
// lib/botControl.js
// إدارة حالة البوت: تعطيل/تفعيل أوامر، وضع الصيانة، الوضع الخاص (VIP فقط)،
// واقتراح الأوامر الصحيحة عند الكتابة الخاطئة.
// كل شيء مُخزَّن في global.db.data.settings[botJid] ويُزامن إلى Supabase.
// ─────────────────────────────────────────────────────────────────────────────

/** تأكد من تهيئة بنية الإعدادات لبوت معيّن */
export function ensureBotState(botJid) {
  if (!botJid) return null
  global.db.data.settings = global.db.data.settings || {}
  const s = global.db.data.settings[botJid] = global.db.data.settings[botJid] || {}
  if (!Array.isArray(s.disabledCommands)) s.disabledCommands = []
  if (typeof s.maintenance !== 'boolean') s.maintenance = false
  if (typeof s.privateMode !== 'boolean') s.privateMode = false
  if (typeof s.suggestCommands !== 'boolean') s.suggestCommands = true
  return s
}

/** تطبيع اسم الأمر (إزالة البادئة، lowercase، تطبيع الأرقام العربية) */
export function normalizeCmd(raw = '') {
  const arabicDigits = { '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9' }
  return String(raw).trim().toLowerCase()
    .replace(/^[*/i!#$%+£¢€¥^°=¶∆×÷π√✓©®:;?&.\-.@aA]+/, '')
    .replace(/[٠-٩]/g, d => arabicDigits[d] || d)
    .trim()
}

/** هل الأمر معطّل لهذا البوت؟ */
export function isCommandDisabled(cmd, botJid) {
  const s = ensureBotState(botJid)
  if (!s) return false
  const c = normalizeCmd(cmd)
  return s.disabledCommands.includes(c)
}

/** عطّل أمراً */
export function disableCommand(cmd, botJid) {
  const s = ensureBotState(botJid)
  if (!s) return false
  const c = normalizeCmd(cmd)
  if (!c) return false
  if (!s.disabledCommands.includes(c)) {
    s.disabledCommands.push(c)
    if (typeof global.markDirty === 'function') global.markDirty()
    return true
  }
  return false
}

/** فعّل أمراً معطّلاً */
export function enableCommand(cmd, botJid) {
  const s = ensureBotState(botJid)
  if (!s) return false
  const c = normalizeCmd(cmd)
  const idx = s.disabledCommands.indexOf(c)
  if (idx === -1) return false
  s.disabledCommands.splice(idx, 1)
  if (typeof global.markDirty === 'function') global.markDirty()
  return true
}

/** قائمة الأوامر المعطّلة */
export function getDisabledCommands(botJid) {
  return ensureBotState(botJid)?.disabledCommands?.slice() || []
}

/** فعّل/عطّل وضع الصيانة (لا يعمل البوت إلا للمطور) */
export function setMaintenance(on, botJid) {
  const s = ensureBotState(botJid)
  if (!s) return false
  s.maintenance = !!on
  if (typeof global.markDirty === 'function') global.markDirty()
  return s.maintenance
}

export function isMaintenance(botJid) {
  return !!ensureBotState(botJid)?.maintenance
}

/** فعّل/عطّل الوضع الخاص (المطور + VIP فقط) */
export function setPrivateMode(on, botJid) {
  const s = ensureBotState(botJid)
  if (!s) return false
  s.privateMode = !!on
  if (typeof global.markDirty === 'function') global.markDirty()
  return s.privateMode
}

export function isPrivateMode(botJid) {
  return !!ensureBotState(botJid)?.privateMode
}

/** تشغيل/إيقاف اقتراح الأوامر */
export function setSuggest(on, botJid) {
  const s = ensureBotState(botJid)
  if (!s) return false
  s.suggestCommands = !!on
  if (typeof global.markDirty === 'function') global.markDirty()
  return s.suggestCommands
}

export function isSuggestEnabled(botJid) {
  const s = ensureBotState(botJid)
  return s ? !!s.suggestCommands : true
}

// ─────────────────────────────────────────────────────────────────────────────
// سجل الأوامر — يُبنى مرة واحدة عند الطلب (lazy) ثم يُحدَّث تلقائياً
// عند تحميل بلجن جديد أو تعديل (handler يُعيد التحميل تلقائياً عند watch).
// ─────────────────────────────────────────────────────────────────────────────
let _registry = null
let _registryHash = ''

/** يستخرج أسماء الأوامر من plugin.command (قد يكون string | array | RegExp) */
function extractCommandNames(cmdField) {
  if (!cmdField) return []
  const out = new Set()

  const fromString = (s) => {
    if (typeof s !== 'string') return
    const c = s.toLowerCase().trim()
    if (c) out.add(c)
  }

  // محاولة استخراج كلمات من نص RegExp
  const fromRegex = (re) => {
    try {
      const src = re.source || String(re)
      // نحاول التقاط القطع داخل  ^( ... )$  أو  ^( ... )(\W|$)
      const m = src.match(/\^[\(]?([^^$]+?)[\)]?[\$\(]/) || src.match(/\^[\(]?([^^$]+)[\)]?\$/)
      const inner = m ? m[1] : src
      // نزيل المراسي ونفصل بـ |
      const cleaned = inner
        .replace(/^[\^\(]+|[\$\)]+$/g, '')
        .replace(/\(\?:?[^)]*\)\??/g, '')      // remove non-capturing groups bits
      cleaned.split('|').forEach(part => {
        const word = part
          .replace(/\\[bswdSWD]/g, '')
          .replace(/[\^\$\(\)\[\]\{\}\?\+\*\.]/g, '')
          .replace(/\\(.)/g, '$1')
          .trim()
        if (word && /^[\u0600-\u06FFa-z0-9_\s]+$/i.test(word) && word.length <= 30) {
          // قد يحتوي على فراغات (مثل "اوامر القروب") — نأخذ الكلمة الأولى أيضاً
          out.add(word.toLowerCase())
          const first = word.split(/\s+/)[0].toLowerCase()
          if (first) out.add(first)
        }
      })
    } catch (_) {}
  }

  if (typeof cmdField === 'string') fromString(cmdField)
  else if (Array.isArray(cmdField)) {
    cmdField.forEach(c => {
      if (typeof c === 'string') fromString(c)
      else if (c instanceof RegExp) fromRegex(c)
    })
  } else if (cmdField instanceof RegExp) fromRegex(cmdField)

  return [...out]
}

/** يبني/يعيد سجل كل الأوامر المعروفة */
export function getCommandRegistry() {
  const plugins = global.plugins || {}
  const hash = Object.keys(plugins).sort().join('|')
  if (_registry && _registryHash === hash) return _registry

  const set = new Set()
  for (const name in plugins) {
    const p = plugins[name]
    if (!p || p.disabled) continue
    extractCommandNames(p.command).forEach(c => set.add(c))
    if (Array.isArray(p.help)) p.help.forEach(h => {
      const c = String(h || '').toLowerCase().trim()
      if (c && c.length <= 30 && /^[\u0600-\u06FFa-z0-9_]+$/.test(c)) set.add(c)
    })
  }
  _registry = [...set].filter(c => c.length >= 2)
  _registryHash = hash
  return _registry
}

/** يُبطل ذاكرة السجل (يُستدعى عند إعادة تحميل البلجنز) */
export function invalidateRegistry() {
  _registry = null
  _registryHash = ''
}

// ─────────────────────────────────────────────────────────────────────────────
// مسافة ليفنشتاين (قياس التشابه بين سلسلتين)
// ─────────────────────────────────────────────────────────────────────────────
function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const m = a.length, n = b.length
  let prev = new Array(n + 1)
  let curr = new Array(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    [prev, curr] = [curr, prev]
  }
  return prev[n]
}

/**
 * يقترح أقرب أمر للنص المُدخل.
 * يعيد مصفوفة (حتى 3) من الأوامر الأقرب — أو [] إن لم يجد قريباً.
 */
export function suggestCommands(input, max = 3) {
  const target = normalizeCmd(input)
  if (!target || target.length < 2) return []
  const registry = getCommandRegistry()
  if (!registry.length) return []

  // عتبة المسافة حسب طول النص: كلمات قصيرة عتبة أقل
  const threshold =
    target.length <= 3 ? 1 :
    target.length <= 6 ? 2 :
    target.length <= 10 ? 3 : 4

  const scored = []
  for (const cmd of registry) {
    if (cmd === target) return [cmd]
    // طول مختلف بفارق أكبر من العتبة — تخطَّ مبكراً
    if (Math.abs(cmd.length - target.length) > threshold) continue
    const d = levenshtein(target, cmd)
    if (d <= threshold) {
      // مكافأة للأوامر التي تبدأ بنفس الحرف
      const bonus = cmd[0] === target[0] ? -0.5 : 0
      scored.push({ cmd, score: d + bonus })
    } else if (cmd.includes(target) || target.includes(cmd)) {
      // تطابق جزئي
      scored.push({ cmd, score: threshold + 0.5 })
    }
  }

  scored.sort((a, b) => a.score - b.score)
  // إزالة التكرار مع الحفاظ على الترتيب
  const seen = new Set()
  const out = []
  for (const { cmd } of scored) {
    if (seen.has(cmd)) continue
    seen.add(cmd)
    out.push(cmd)
    if (out.length >= max) break
  }
  return out
}
