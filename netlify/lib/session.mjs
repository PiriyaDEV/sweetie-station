import { createHmac, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = 'sweetie_session'
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60

export function getSessionSecret() {
  return process.env.SWEETIE_SESSION_SECRET || ''
}

export function sameOriginRequest(request) {
  const origin = request.headers.get('origin')
  if (!origin) return false
  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

export function createSessionToken(username, secret, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ username, exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS })).toString('base64url')
  const signature = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

export function readSessionToken(cookieHeader, secret, now = Date.now()) {
  if (!cookieHeader || !secret) return null
  const cookie = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))
  if (!cookie) return null
  const token = cookie.slice(SESSION_COOKIE.length + 1)
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null
  const expected = createHmac('sha256', secret).update(payload).digest('base64url')
  const signatureBytes = Buffer.from(signature)
  const expectedBytes = Buffer.from(expected)
  if (signatureBytes.length !== expectedBytes.length || !timingSafeEqual(signatureBytes, expectedBytes)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (typeof data.username !== 'string' || typeof data.exp !== 'number' || data.exp <= Math.floor(now / 1000)) return null
    return { username: data.username, exp: data.exp }
  } catch {
    return null
  }
}

export function hasValidSession(request) {
  return readSessionToken(request.headers.get('cookie'), getSessionSecret())
}

export function sessionCookie(request, token) {
  const url = new URL(request.url)
  const secure = url.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https'
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_SECONDS}${secure ? '; Secure' : ''}`
}

export function clearSessionCookie(request) {
  const url = new URL(request.url)
  const secure = url.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https'
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure ? '; Secure' : ''}`
}

export function jsonResponse(statusCode, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  })
}
