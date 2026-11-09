import { getStore } from '@netlify/blobs'
import { jsonResponse, sameOriginRequest, sessionCookie, createSessionToken, getSessionSecret, hasValidSession } from '../lib/session.mjs'
import { readGoogleSnapshot, writeGoogleSnapshot } from '../lib/google-sheets.mjs'

const LEGACY_SNAPSHOT_KEY = 'snapshot.json'
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

async function readLegacyNetlifySnapshot() {
  try {
    const store = getStore('sweetie-station-sync', { region: 'us-east-2' })
    const snapshot = await store.get(LEGACY_SNAPSHOT_KEY, { type: 'json' })
    return validSnapshot(snapshot) ? snapshot : null
  } catch {
    return null
  }
}

async function readOrMigrateSnapshot() {
  const googleSnapshot = await readGoogleSnapshot()
  if (googleSnapshot) return googleSnapshot

  // Import the previous Netlify snapshot once, then Google Sheets becomes the source of truth.
  const legacySnapshot = await readLegacyNetlifySnapshot()
  if (!legacySnapshot) return null
  legacySnapshot.updatedAt = Date.now()
  await writeGoogleSnapshot(legacySnapshot)
  return legacySnapshot
}

export default async function handler(request) {
  const sessionSecret = getSessionSecret()
  const adminPassword = process.env.SWEETIE_ADMIN_PASSWORD || ''
  const adminUsername = process.env.SWEETIE_ADMIN_USERNAME || 'admin'
  if (!sessionSecret || !adminPassword) return jsonResponse(503, { error: 'Authentication is not configured.' })

  const session = hasValidSession(request)
  if (!session || session.username !== adminUsername) return jsonResponse(401, { error: 'Your session has expired. Please sign in again.' })
  const headers = { 'set-cookie': sessionCookie(request, createSessionToken(session.username, sessionSecret)) }

  if (request.method === 'GET') {
    try {
      const snapshot = await readOrMigrateSnapshot()
      return jsonResponse(200, { snapshot, storage: 'google-sheets' }, headers)
    } catch {
      return jsonResponse(500, { error: 'Could not read app data from Google Sheets.' }, headers)
    }
  }

  if (request.method !== 'PUT') return jsonResponse(405, { error: 'Method not allowed.' }, { ...headers, allow: 'GET, PUT' })
  if (!sameOriginRequest(request)) return jsonResponse(403, { error: 'Requests must come from this site.' }, headers)

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > MAX_SNAPSHOT_BYTES) return jsonResponse(413, { error: 'App data is too large. Download a backup and reduce stored image data.' }, headers)

  let snapshot
  try {
    const body = await request.text()
    if (new TextEncoder().encode(body).length > MAX_SNAPSHOT_BYTES) return jsonResponse(413, { error: 'App data is too large. Download a backup and reduce stored image data.' }, headers)
    snapshot = JSON.parse(body)
  } catch {
    return jsonResponse(400, { error: 'Invalid app data.' }, headers)
  }
  if (!validSnapshot(snapshot)) return jsonResponse(400, { error: 'App data has an invalid shape.' }, headers)

  try {
    snapshot.updatedAt = Date.now()
    const result = await writeGoogleSnapshot(snapshot)
    return jsonResponse(200, { ok: true, updatedAt: result.updatedAt, rowsWritten: result.rowsWritten, storage: 'google-sheets' }, headers)
  } catch {
    return jsonResponse(500, { error: 'Could not save app data to Google Sheets.' }, headers)
  }
}
