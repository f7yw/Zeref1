/**
 * Full user field initialization — single source of truth for all user fields.
 * Call this whenever you need to ensure a user object is fully populated.
 */
import { initEconomy, syncVipResources, MAX_ENERGY } from './economy.js'

export function initUser(user, displayName = '', senderJid = null) {
  // Identity
  if (!user.name && displayName)         user.name         = displayName
  if (!('registered' in user))           user.registered   = false
  if (!('regTime' in user) || !user.regTime || user.regTime === -1) user.regTime = 0

  // Moderation
  if (typeof user.warn !== 'number')     user.warn         = 0
  if (!('banned' in user))               user.banned       = false
  if (!user.bannedReason)                user.bannedReason = ''

  // Premium
  if (!('premium' in user))             user.premium      = false
  if (!('premiumTime' in user))         user.premiumTime  = 0

  // Levels
  if (typeof user.level !== 'number')    user.level        = 0
  if (typeof user.exp !== 'number')      user.exp          = 0
  if (typeof user.limit !== 'number')    user.limit        = 0
  if (typeof user.joincount !== 'number') user.joincount   = 0

  // Messages
  if (!user.messages || typeof user.messages !== 'object') {
    user.messages = { total: 0, groups: {}, last: 0 }
  }
  if (typeof user.messages.total !== 'number') user.messages.total = 0
  if (!user.messages.groups || typeof user.messages.groups !== 'object') user.messages.groups = {}

  // Last seen
  if (typeof user.lastseen !== 'number') user.lastseen = 0

  // AFK
  if (typeof user.afk !== 'number') user.afk = -1

  // Economy (money, bank, energy, regen timers, totalEarned, totalSpent, lastDaily, lastWork)
  initEconomy(user, senderJid)

  // VIP: set infinite resources in DB
  if (senderJid) syncVipResources(user, senderJid)

  return user
}
