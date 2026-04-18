/**
 * Economy System — SHADOW Bot
 * Central helpers for energy, coins, fees, formatting
 */

export const MAX_ENERGY = 100
export const ENERGY_REGEN_MS = 3 * 60 * 1000  // 1 energy per 3 minutes (full in 5h)

export const FEES = {
  ai:        5,   // energy cost for ChatGPT
  hd:        10,  // energy cost for image enhance
  translate: 2,   // energy cost for translation
  sticker:   1,   // energy cost per sticker
}

export const ROLES = [
  { min: 0,  label: '🌱 مبتدئ' },
  { min: 5,  label: '⚔️ محارب' },
  { min: 10, label: '🏅 متقدم' },
  { min: 20, label: '🥇 محترف' },
  { min: 30, label: '🌟 بطل' },
  { min: 50, label: '👑 أسطورة' },
]

export function getRole(level) {
  let role = ROLES[0].label
  for (const r of ROLES) if (level >= r.min) role = r.label
  return role
}

/**
 * Returns true if the given JID belongs to an owner, mod, or premium member.
 * These users bypass all energy/resource limits.
 */
export function isVip(jid) {
  if (!jid) return false
  const num = String(jid).replace(/@.*/, '').replace(/\D/g, '')

  // Check owner array  [number, name, isDev]
  for (const entry of (global.owner || [])) {
    const ownerNum = String(Array.isArray(entry) ? entry[0] : entry).replace(/\D/g, '')
    if (ownerNum && ownerNum === num) return true
  }

  // Check prems, mods, suittag arrays (plain numbers)
  for (const arr of [global.prems, global.mods, global.suittag]) {
    for (const n of (arr || [])) {
      if (String(n).replace(/\D/g, '') === num) return true
    }
  }

  // Check DB premium time
  const userData = global.db?.data?.users?.[jid]
  if (userData?.premiumTime > 0) return true

  return false
}

/**
 * Compute current energy applying regen since last sync.
 * Mutates user object in place. Returns current energy.
 */
export function syncEnergy(user) {
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

/**
 * Returns milliseconds until next energy regen tick.
 */
export function msToNextRegen(user) {
  const now = Date.now()
  const lastRegen = user.lastEnergyRegen || now
  return ENERGY_REGEN_MS - ((now - lastRegen) % ENERGY_REGEN_MS)
}

/**
 * Deduct energy. Pass senderJid to auto-bypass for VIP users.
 * Returns false if not enough energy, true on success / VIP bypass.
 */
export function deductEnergy(user, amount, senderJid = null) {
  if (senderJid && isVip(senderJid)) return true   // VIP = unlimited
  syncEnergy(user)
  if (user.energy < amount) return false
  user.energy -= amount
  return true
}

/**
 * Ensure all economy fields exist on a user object.
 * VIP users get a perpetually full energy bar.
 */
export function initEconomy(user, senderJid = null) {
  if (!('money' in user)  || user.money  == null) user.money  = 100
  if (!('bank' in user)   || user.bank   == null) user.bank   = 0
  if (!('energy' in user) || user.energy == null) user.energy = MAX_ENERGY
  if (!('lastEnergyRegen' in user)) user.lastEnergyRegen = Date.now()
  if (!('lastDaily' in user)) user.lastDaily = 0
  if (!('lastWork'  in user)) user.lastWork  = 0
  if (!('totalEarned' in user)) user.totalEarned = 0
  if (!('totalSpent'  in user)) user.totalSpent  = 0

  // VIP always has full energy
  if (senderJid && isVip(senderJid)) {
    user.energy = MAX_ENERGY
    user.lastEnergyRegen = Date.now()
  }
  return user
}

export function fmt(n) {
  return Number(n || 0).toLocaleString('en') + ' 🪙'
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
