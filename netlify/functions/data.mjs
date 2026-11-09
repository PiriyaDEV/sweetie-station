import { getStore } from '@netlify/blobs'
import { createSessionToken, getSessionSecret, hasValidSession, jsonResponse, sameOriginRequest, sessionCookie } from '../lib/session.mjs'

const SNAPSHOT_KEY = 'snapshot.json'
const MAX_SNAPSHOT_BYTES = 5 * 1024 * 1024

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function validSnapshot(snapshot) {
  return isRecord(snapshot)
    && snapshot.version === 1
    && isRecord(snapshot.localOrdersBySheet)
    && isRecord(snapshot.monthlyExpensesBySheet)
    && Array.isArray(snapshot.localSheets)
    && typeof snapshot.exchangeRate === 'number'
    && Number.isFinite(snapshot.exchangeRate)
    && snapshot.exchangeRate > 0
    && (snapshot.language === 'en' || snapshot.language === 'th')
}

export default async function handler(request) {
  const sessionSecret = getSessionSecret()
  const adminPassword = process.env.SWEETIE_ADMIN_PASSWORD || ''
  const adminUsername = process.env.SWEETIE_ADMIN_USERNAME || 'admin'
  if (!sessionSecret || !adminPassword) return jsonResponse(503, { error: 'Sync authentication is not configured.' })

  const session = hasValidSession(request)
  if (!session || session.username !== adminUsername) return jsonResponse(401, { error: 'Your session has expired. Please sign in again.' })
  const headers = { 'set-cookie': sessionCookie(request, createSessionToken(session.username, sessionSecret)) }

  if (request.method === 'GET') {
    try {
      const store = getStore('sweetie-station-sync', { region: 'us-east-2' })
      const snapshot = await store.get(SNAPSHOT_KEY, { type: 'json' })
      return jsonResponse(200, { snapshot: snapshot ?? null }, headers)
    } catch {
      return jsonResponse(500, { error: 'Could not read synced data.' }, headers)
    }
  }

  if (request.method !== 'PUT') return jsonResponse(405, { error: 'Method not allowed.' }, { ...headers, allow: 'GET, PUT' })
  if (!sameOriginRequest(request)) return jsonResponse(403, { error: 'Requests must come from this site.' }, headers)

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > MAX_SNAPSHOT_BYTES) return jsonResponse(413, { error: 'Sync snapshot is too large. Download a backup and reduce stored image data.' }, headers)

  let snapshot
  try {
    const body = await request.text()
    if (new TextEncoder().encode(body).length > MAX_SNAPSHOT_BYTES) return jsonResponse(413, { error: 'Sync snapshot is too large. Download a backup and reduce stored image data.' }, headers)
    snapshot = JSON.parse(body)
  } catch {
    return jsonResponse(400, { error: 'Invalid sync snapshot.' }, headers)
  }
  if (!validSnapshot(snapshot)) return jsonResponse(400, { error: 'Sync snapshot has an invalid shape.' }, headers)

  try {
    const store = getStore('sweetie-station-sync', { region: 'us-east-2' })
    snapshot.updatedAt = Date.now()
    const result = await store.setJSON(SNAPSHOT_KEY, snapshot)
    return jsonResponse(200, { ok: true, updatedAt: snapshot.updatedAt, etag: result.etag ?? null }, headers)
  } catch {
    return jsonResponse(500, { error: 'Could not save synced data.' }, headers)
  }
}
