import { getSessionSecret, hasValidSession, jsonResponse, sameOriginRequest, sessionCookie, createSessionToken } from '../lib/session.mjs'
import { writeOrderToSheet } from '../lib/google-sheets.mjs'

const MAX_ORDER_BYTES = 5 * 1024 * 1024

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export default async function handler(request) {
  const secret = getSessionSecret()
  const adminUsername = process.env.SWEETIE_ADMIN_USERNAME || 'admin'
  if (!secret) return jsonResponse(503, { error: 'Google Sheets access is not configured.' })

  const session = hasValidSession(request)
  if (!session || session.username !== adminUsername) return jsonResponse(401, { error: 'Your session has expired. Please sign in again.' })
  const headers = { 'set-cookie': sessionCookie(request, createSessionToken(session.username, secret)) }
  if (request.method !== 'POST' && request.method !== 'PUT') return jsonResponse(405, { error: 'Method not allowed.' }, { ...headers, allow: 'POST, PUT' })
  if (!sameOriginRequest(request)) return jsonResponse(403, { error: 'Requests must come from this site.' }, headers)

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > MAX_ORDER_BYTES) return jsonResponse(413, { error: 'Order data is too large.' }, headers)

  let body
  try {
    const raw = await request.text()
    if (new TextEncoder().encode(raw).length > MAX_ORDER_BYTES) return jsonResponse(413, { error: 'Order data is too large.' }, headers)
    body = JSON.parse(raw)
  } catch {
    return jsonResponse(400, { error: 'Invalid order request.' }, headers)
  }
  if (!isRecord(body) || !/^\d+$/.test(String(body.gid ?? '')) || !isRecord(body.order) || !Array.isArray(body.order.lines) || body.order.lines.length === 0) {
    return jsonResponse(400, { error: 'A sheet ID and at least one order item are required.' }, headers)
  }

  try {
    const result = await writeOrderToSheet(body.gid, body.order, request.method === 'PUT')
    return jsonResponse(request.method === 'POST' ? 201 : 200, { ok: true, ...result }, headers)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save the order to Google Sheets.'
    const status = /not found|no header|required .* columns|could not find|invalid|too large|has no items/i.test(message) ? 400 : 502
    return jsonResponse(status, { error: message }, headers)
  }
}
