/**
 * Economy System — SHADOW Bot
 * Central helpers for energy, coins, fees, formatting
 */

export const MAX_ENERGY = 100
export const ENERGY_REGEN_MS = 3 * 60 * 1000  // 1 energy per 3 minutes

export const FEES = {
  ai:        5,
  hd:        10,
  translate: 2,
  sticker:   1,
}

export const ROLES = [
  { min: 0,   label: '🌱 مبتدئ' },
  { min: 5,   label: '⚔️ محارب' },
  { min: 10,  label: '🏅 متقدم' },
  { min: 20,  label: '🥇 محترف' },
  { min: 30,  label: '🌟 بطل' },
  { min: 50,  label: '👑 أسطورة' },
  { min: 75,  label: '💎 ماسي' },
  { min: 100, label: '🚀 أسطوري' },
]

export function getRole(level) {
  let role = ROLES[0].label
  for (const r of ROLES) if (level >= r.min) role = r.label
  return role
}

/**
 * Returns true if the given JID belongs to an owner, mod, or premium member.
 * Handles LID JIDs by resolving them via global.lidPhoneMap.
 */
export function isVip(jid) {
  if (!jid) return false
  // Resolve LID JID to phone JID if mapping exists
  const resolvedJid = (jid?.endsWith?.('@lid') && global.lidPhoneMap?.[jid])
    ? global.lidPhoneMap[jid]
    : jid
  const num = String(resolvedJid).replace(/@.*/, '').replace(/\D/g, '')
  for (const entry of (global.owner || [])) {
    const ownerNum = String(Array.isArray(entry) ? entry[0] : entry).replace(/\D/g, '')
    if (ownerNum && ownerNum === num) return true
  }
  for (const arr of [global.prems, global.mods, global.suittag]) {
    for (const n of (arr || [])) {
      if (String(n).replace(/\D/g, '') === num) return true
    }
  }
  const userData = global.db?.data?.users?.[resolvedJid] || global.db?.data?.users?.[jid]
  if (userData?.premiumTime > Date.now()) return true
  if (userData?.premium === true) return true
  return false
}

/**
 * Log a transaction. type: 'earn' | 'spend'
 */
export function logTransaction(user, type, amount, reason) {
  if (!Array.isArray(user.transactions)) user.transactions = []
  user.transactions.unshift({ type, amount: Math.abs(amount), reason, time: Date.now() })
  if (user.transactions.length > 30) user.transactions.length = 30
}

/**
 * Compute current energy applying regen. VIP users always have MAX.
 */
export function syncEnergy(user, jid = null) {
  if (jid && isVip(jid)) {
    user.energy = MAX_ENERGY
    user.lastEnergyRegen = Date.now()
    return MAX_ENERGY
  }
  const now = Date.now()
  if (!('energy' in user) || user.energy === undefined) user.energy = MAX_ENERGY
  if (!user.lastEnergyRegen) user.lastEnergyRegen = now
  const elapsed = now - user.lastEnergyRegen
  const regenAmount = Math.floor(elapsed / ENERGY_REGEN_MS)
  if (regenAmount > 0) {
    user.energy = Math.min(MAX_ENERGY, user.energy + regenAmount)
    user.lastEnergyRegen += regenAmount * ENERGY_REGEN_MS
  }
  return user.energy
}

export function msToNextRegen(user) {
  const now = Date.now()
  const lastRegen = user.lastEnergyRegen || now
  return ENERGY_REGEN_MS - ((now - lastRegen) % ENERGY_REGEN_MS)
}

/**
 * Deduct energy. VIP users bypass all costs.
 */
export function deductEnergy(user, amount, senderJid = null) {
  if (senderJid && isVip(senderJid)) {
    syncEnergy(user, senderJid)
    return true
  }
  syncEnergy(user)
  if (user.energy < amount) return false
  user.energy -= amount
  return true
}

/**
 * Ensure all economy fields exist on a user object.
 * VIP users get perpetually full energy.
 */
export function initEconomy(user, senderJid = null) {
  if (!('money'   in user) || user.money   == null) user.money   = 100
  if (!('bank'    in user) || user.bank    == null) user.bank    = 0
  if (!('diamond' in user) || user.diamond == null) user.diamond = 0
  if (!('energy'  in user) || user.energy  == null) user.energy  = MAX_ENERGY
  if (!('lastEnergyRegen' in user)) user.lastEnergyRegen = Date.now()
  if (!('lastDaily' in user)) user.lastDaily = 0
  if (!('lastWork'  in user)) user.lastWork  = 0
  if (!('totalEarned' in user)) user.totalEarned = 0
  if (!('totalSpent'  in user)) user.totalSpent  = 0
  if (!Array.isArray(user.transactions)) user.transactions = []
  if (senderJid && isVip(senderJid)) {
    user.energy = MAX_ENERGY
    user.lastEnergyRegen = Date.now()
  }
  return user
}

export function fmt(n) {
  return Number(n || 0).toLocaleString('en') + ' 🪙'
}

/**
 * Sync VIP status flags only — does NOT inflate money/bank.
 * infiniteResources = true bypasses energy & money checks in commands.
 */
export function syncVipResources(user, jid = null) {
  if (!jid || !isVip(jid)) return
  user.premium           = true
  user.premiumTime       = Math.max(user.premiumTime || 0, Date.now() + (10 * 365 * 24 * 60 * 60 * 1000))
  user.infiniteResources = true
  user.energy            = MAX_ENERGY
  user.lastEnergyRegen   = Date.now()
}

export function fmtEnergy(user, senderJid = null) {
  if (senderJid && isVip(senderJid)) return `${'█'.repeat(10)} ${MAX_ENERGY}/${MAX_ENERGY} ⚡ ∞`
  const e = syncEnergy(user)
  const pct = Math.floor((e / MAX_ENERGY) * 10)
  const bar = '█'.repeat(pct) + '░'.repeat(10 - pct)
  return `${bar} ${e}/${MAX_ENERGY} ⚡`
}

export function msToHuman(ms) {
  const s = Math.ceil(ms / 1000)
  if (s < 60) return `${s} ثانية`
  const m = Math.floor(s / 60), rem = s % 60
  if (m < 60) return `${m} دقيقة ${rem > 0 ? `و ${rem} ثانية` : ''}`
  const h = Math.floor(m / 60), remM = m % 60
  return `${h} ساعة${remM > 0 ? ` و ${remM} دقيقة` : ''}`
}
