import { createHmac, timingSafeEqual } from 'node:crypto'

// LINE signs the raw request body with the channel secret (HMAC-SHA256, base64).
export function validLineSignature(rawBody, signature, channelSecret) {
  if (!signature || !channelSecret) return false
  const expected = createHmac('sha256', channelSecret).update(rawBody).digest()
  let received
  try { received = Buffer.from(signature, 'base64') } catch { return false }
  return received.length === expected.length && timingSafeEqual(received, expected)
}

// Read-only: only displayName and pictureUrl are used. Returns null if the user
// blocked the OA or is unknown (LINE answers 404).
export async function fetchLineProfile(userId, accessToken, fetchImpl = fetch) {
  const response = await fetchImpl(`https://api.line.me/v2/bot/profile/${encodeURIComponent(userId)}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) return null
  const body = await response.json().catch(() => null)
  if (!body || typeof body.displayName !== 'string') return null
  return { lineUserId: userId, displayName: body.displayName, pictureUrl: typeof body.pictureUrl === 'string' ? body.pictureUrl : '' }
}

export function userIdsFromEvents(events) {
  const ids = new Set()
  for (const event of Array.isArray(events) ? events : []) {
    const userId = event?.source?.userId
    if ((event?.type === 'follow' || event?.type === 'message') && typeof userId === 'string' && /^U[0-9a-f]{32}$/.test(userId)) ids.add(userId)
  }
  return [...ids]
}
