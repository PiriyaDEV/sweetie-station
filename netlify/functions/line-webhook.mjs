import { validLineSignature, fetchLineProfile, userIdsFromEvents } from '../lib/line.mjs'
import { upsertLineContact } from '../lib/google-sheets.mjs'

// Public endpoint called by LINE. Authenticated only by the x-line-signature header.
export default async function handler(request) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET || ''
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  if (!channelSecret || !accessToken) return new Response('LINE is not configured', { status: 503 })

  const rawBody = await request.text()
  if (!validLineSignature(rawBody, request.headers.get('x-line-signature'), channelSecret)) {
    return new Response('Invalid signature', { status: 401 })
  }

  let payload
  try { payload = JSON.parse(rawBody) } catch { return new Response('Bad request', { status: 400 }) }

  for (const userId of userIdsFromEvents(payload.events)) {
    try {
      const profile = await fetchLineProfile(userId, accessToken)
      if (profile) await upsertLineContact(profile)
    } catch {
      // Never fail the webhook: LINE would retry and disable it after repeated errors.
    }
  }
  return new Response('OK', { status: 200 })
}
