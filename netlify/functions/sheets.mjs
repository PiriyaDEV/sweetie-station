import { getSessionSecret, hasValidSession, jsonResponse, sessionCookie, createSessionToken, sameOriginRequest } from '../lib/session.mjs'
import { createWorksheetFromTemplate, readSheetCsvByGid } from '../lib/google-sheets.mjs'

export default async function handler(request) {
  const secret = getSessionSecret()
  const adminUsername = process.env.SWEETIE_ADMIN_USERNAME || 'admin'
  if (!secret) return jsonResponse(503, { error: 'Google Sheets access is not configured.' })

  const session = hasValidSession(request)
  if (!session || session.username !== adminUsername) return jsonResponse(401, { error: 'Your session has expired. Please sign in again.' })
  const headers = { 'set-cookie': sessionCookie(request, createSessionToken(session.username, secret)) }

  if (request.method === 'POST') {
    if (!sameOriginRequest(request)) return jsonResponse(403, { error: 'Requests must come from this site.' }, headers)
    let body
    try { body = await request.json() } catch { return jsonResponse(400, { error: 'Invalid sheet request.' }, headers) }
    if (!body || typeof body.name !== 'string' || !/^\d+$/.test(String(body.templateGid ?? ''))) {
      return jsonResponse(400, { error: 'A sheet name and valid template are required.' }, headers)
    }
    try {
      const sheet = await createWorksheetFromTemplate(body.name, body.templateGid)
      return jsonResponse(201, { ok: true, sheet }, headers)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create the Google Sheets tab.'
      const status = /invalid|already exists|not found|no header/i.test(message) ? 400 : 502
      return jsonResponse(status, { error: message }, headers)
    }
  }

  if (request.method !== 'GET') return jsonResponse(405, { error: 'Method not allowed.' }, { ...headers, allow: 'GET, POST' })
  const url = new URL(request.url)
  const gid = url.searchParams.get('gid') ?? ''
  const offset = Number(url.searchParams.get('offset') ?? 0)
  const limit = Number(url.searchParams.get('limit') ?? 120)
  if (!/^\d+$/.test(gid) || !Number.isFinite(offset) || offset < 0 || !Number.isFinite(limit) || limit < 1 || limit > 2000) {
    return jsonResponse(400, { error: 'Invalid sheet page request.' })
  }

  try {
    const csv = await readSheetCsvByGid(gid, offset, limit)
    return new Response(csv, {
      status: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'cache-control': 'no-store',
        ...headers,
      },
    })
  } catch {
    return jsonResponse(502, { error: 'Could not read the selected Google Sheet.' }, headers)
  }
}
