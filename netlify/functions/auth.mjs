import { timingSafeEqual } from 'node:crypto'
import { clearSessionCookie, createSessionToken, getSessionSecret, hasValidSession, jsonResponse, sameOriginRequest, sessionCookie, SESSION_TTL_SECONDS } from '../lib/session.mjs'

function safeEquals(left, right) {
  const leftBytes = Buffer.from(left)
  const rightBytes = Buffer.from(right)
  return leftBytes.length === rightBytes.length && leftBytes.length > 0 && timingSafeEqual(leftBytes, rightBytes)
}

export default async function handler(request) {
  const secret = getSessionSecret()
  const adminPassword = process.env.SWEETIE_ADMIN_PASSWORD || ''
  const adminUsername = process.env.SWEETIE_ADMIN_USERNAME || 'admin'
  if (!secret || !adminPassword) return jsonResponse(503, { error: 'Sync authentication is not configured.' })

  if (request.method === 'GET') {
    const session = hasValidSession(request)
    if (!session || session.username !== adminUsername) return jsonResponse(401, { authenticated: false })
    const token = createSessionToken(adminUsername, secret)
    return jsonResponse(200, { authenticated: true, username: adminUsername, expiresIn: SESSION_TTL_SECONDS }, { 'set-cookie': sessionCookie(request, token) })
  }

  if (request.method !== 'POST' && request.method !== 'DELETE') return jsonResponse(405, { error: 'Method not allowed.' }, { allow: 'GET, POST, DELETE' })
  if (!sameOriginRequest(request)) return jsonResponse(403, { error: 'Requests must come from this site.' })

  if (request.method === 'DELETE') {
    return jsonResponse(200, { authenticated: false }, { 'set-cookie': clearSessionCookie(request) })
  }

  let credentials
  try {
    credentials = await request.json()
  } catch {
    return jsonResponse(400, { error: 'Invalid login request.' })
  }

  const validUsername = typeof credentials.username === 'string' && credentials.username === adminUsername
  const validPassword = typeof credentials.password === 'string' && safeEquals(credentials.password, adminPassword)
  if (!validUsername || !validPassword) return jsonResponse(401, { error: 'Incorrect username or password.' })

  const token = createSessionToken(adminUsername, secret)
  return jsonResponse(200, { authenticated: true, username: adminUsername, expiresIn: SESSION_TTL_SECONDS }, { 'set-cookie': sessionCookie(request, token) })
}
