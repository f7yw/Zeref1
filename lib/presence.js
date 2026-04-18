/**
 * Presence utility — realistic typing / recording delay
 * Usage:
 *   await typingDelay(conn, chatId, 1200)     // shows "typing..." for 1.2s
 *   await recordingDelay(conn, chatId, 2000)  // shows "recording..." for 2s
 */

export async function typingDelay(conn, chatId, ms = 1200) {
  try { await conn.sendPresenceUpdate('composing', chatId) } catch (_) {}
  await sleep(ms)
  try { await conn.sendPresenceUpdate('paused', chatId) } catch (_) {}
}

export async function recordingDelay(conn, chatId, ms = 2000) {
  try { await conn.sendPresenceUpdate('recording', chatId) } catch (_) {}
  await sleep(ms)
  try { await conn.sendPresenceUpdate('paused', chatId) } catch (_) {}
}

export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}
