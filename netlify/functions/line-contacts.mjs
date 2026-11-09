import { getSessionSecret, hasValidSession, jsonResponse, sessionCookie, createSessionToken } from '../lib/session.mjs'
import { readLineContacts } from '../lib/google-sheets.mjs'

export default async function handler(request) {
  const secret = getSessionSecret()
  const adminUsername = process.env.SWEETIE_ADMIN_USERNAME || 'admin'
  if (!secret) return jsonResponse(503, { error: 'Google Sheets access is not configured.' })
  const session = hasValidSession(request)
  if (!session || session.username !== adminUsername) return jsonResponse(401, { error: 'Your session has expired. Please sign in again.' })
  const headers = { 'set-cookie': sessionCookie(request, createSessionToken(session.username, secret)) }
  if (request.method !== 'GET') return jsonResponse(405, { error: 'Method not allowed.' }, { ...headers, allow: 'GET' })
  try {
    return jsonResponse(200, { contacts: await readLineContacts() }, headers)
  } catch {
    return jsonResponse(502, { error: 'Could not read LINE contacts.' }, headers)
  }
}
