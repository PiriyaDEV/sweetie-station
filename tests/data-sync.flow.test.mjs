import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import test from 'node:test'

const environmentKeys = [
  'SWEETIE_ADMIN_USERNAME',
  'SWEETIE_ADMIN_PASSWORD',
  'SWEETIE_SESSION_SECRET',
  'SWEETIE_SPREADSHEET_ID',
  'GOOGLE_SERVICE_ACCOUNT_JSON',
]

const previousEnvironment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]))
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
process.env.SWEETIE_ADMIN_USERNAME = 'qa-admin'
process.env.SWEETIE_ADMIN_PASSWORD = 'qa-password'
process.env.SWEETIE_SESSION_SECRET = 'synthetic-session-secret'
process.env.SWEETIE_SPREADSHEET_ID = 'synthetic-spreadsheet'
process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
  client_email: 'qa@example.invalid',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
})

const appRows = []
const salesRows = [
  ['Order date', 'Customer', 'Item', 'Quantity', 'Sale price'],
  ['2026-11-09', 'Synthetic Customer', 'Synthetic Item', '2', '100'],
]
const spreadsheet = {
  spreadsheetId: 'synthetic-spreadsheet',
  properties: { title: 'Synthetic Test Workbook' },
  sheets: [
    { properties: { sheetId: 42, title: 'Synthetic Orders', gridProperties: { rowCount: 100, columnCount: 5 } } },
    { properties: { sheetId: 77, title: 'Sweetie App Data', gridProperties: { rowCount: 1000, columnCount: 7 } } },
  ],
}
let mockedExternalRequests = 0
const originalFetch = globalThis.fetch

function readValuesRange(range) {
  const [sheetRef, a1Range] = range.split('!')
  const title = sheetRef?.replaceAll("'", '').replaceAll("''", "'") ?? ''
  const rows = title === 'Sweetie App Data' ? appRows : salesRows
  const match = /^A(\d+):[A-Z]+(\d+)$/i.exec(a1Range ?? '')
  if (!match) throw new Error(`Unexpected batchGet range: ${range}`)
  return rows.slice(Number(match[1]) - 1, Number(match[2])).map((row) => [...row])
}

globalThis.fetch = async (input, options = {}) => {
  mockedExternalRequests += 1
  const url = new URL(String(input))
  if (url.hostname === 'oauth2.googleapis.com') {
    return Response.json({ access_token: 'synthetic-access-token', expires_in: 3600 })
  }
  assert.equal(url.hostname, 'sheets.googleapis.com', 'only mocked Sheets API calls are allowed')
  if (url.pathname.endsWith('/spreadsheets/synthetic-spreadsheet')) return Response.json(spreadsheet)
  if (url.pathname.endsWith('/values:batchGet')) {
    const ranges = url.searchParams.getAll('ranges')
    return Response.json({ valueRanges: ranges.map((range) => ({ range, values: readValuesRange(range) })) })
  }
  if (url.pathname.includes('/values/')) {
    const range = decodeURIComponent(url.pathname.split('/values/')[1] ?? '')
    return Response.json({ values: range.includes('Sweetie App Data') ? appRows : salesRows })
  }
  if (url.pathname.endsWith(':batchUpdate')) {
    const body = JSON.parse(options.body ?? '{}')
    for (const request of body.requests ?? []) {
      const rows = request.updateCells?.rows
      if (!rows) continue
      appRows.length = 0
      for (const row of rows) {
        const cells = row.values.map((cell) => {
          const value = cell.userEnteredValue
          if (value?.stringValue !== undefined) return value.stringValue
          if (value?.numberValue !== undefined) return String(value.numberValue)
          return ''
        })
        while (cells.length && cells.at(-1) === '') cells.pop()
        appRows.push(cells)
      }
    }
    return Response.json({ replies: [] })
  }
  throw new Error(`Unexpected mocked request: ${options.method ?? 'GET'} ${url.pathname}`)
}

test('synthetic order, sheet, image sync and read flows', async () => {
  try {
    const [{ default: dataHandler }, { default: sheetsHandler }, { createSessionToken }] = await Promise.all([
      import('../netlify/functions/data.mjs'),
      import('../netlify/functions/sheets.mjs'),
      import('../netlify/lib/session.mjs'),
    ])
    const token = createSessionToken('qa-admin', process.env.SWEETIE_SESSION_SECRET)
    const cookie = `sweetie_session=${token}`
    const dataUrl = 'data:image/png;base64,U1lOVEhFVElD'
    const sheetId = 'local-qa-sheet'
    const base = 'https://synthetic.local/.netlify/functions/data'
    const order = {
      id: 'qa-order-1', customerName: 'Synthetic Customer', lineName: 'Synthetic Line', day: 9,
      paymentStatus: 'ยังไม่ได้ชำระ', shippingStatus: 'ยังไม่ได้สั่ง', totalSales: 200, grossSales: 200,
      quantity: 2, isLocal: true, updatedAt: 1,
      lines: [{ itemName: 'Synthetic Item', quantity: 2, salePrice: 100, images: [dataUrl] }],
    }
    const snapshot = {
      version: 1,
      localOrdersBySheet: { [sheetId]: [order] },
      monthlyExpensesBySheet: {},
      monthlyExpenseRevisionsBySheet: {},
      localSheets: [{ id: sheetId, gid: '', titleKey: '', customName: 'QA November' }],
      exchangeRate: 5.02,
      language: 'en',
      updatedAt: 1,
    }
    const put = (nextSnapshot) => dataHandler(new Request(base, {
      method: 'PUT',
      headers: { cookie, origin: 'https://synthetic.local', 'content-type': 'application/json' },
      body: JSON.stringify(nextSnapshot),
    }))

    const created = await put(snapshot)
    assert.equal(created.status, 200)
    assert.equal((await created.json()).ok, true)

    const read = await dataHandler(new Request(base, { headers: { cookie } }))
    assert.equal(read.status, 200)
    const afterCreate = (await read.json()).snapshot
    assert.equal(afterCreate.localSheets[0].id, sheetId)
    assert.equal(afterCreate.localOrdersBySheet[sheetId][0].id, 'qa-order-1')
    assert.equal(afterCreate.localOrdersBySheet[sheetId][0].lines[0].images[0], dataUrl)

    const updatedSnapshot = structuredClone(snapshot)
    updatedSnapshot.localOrdersBySheet[sheetId][0].totalSales = 175
    updatedSnapshot.localOrdersBySheet[sheetId][0].updatedAt = 2
    updatedSnapshot.localSheets[0].customName = 'QA November Updated'
    updatedSnapshot.updatedAt = 2
    const updated = await put(updatedSnapshot)
    assert.equal(updated.status, 200)

    const readUpdated = await dataHandler(new Request(base, { headers: { cookie } }))
    const afterUpdate = (await readUpdated.json()).snapshot
    assert.equal(afterUpdate.localOrdersBySheet[sheetId][0].totalSales, 175)
    assert.equal(afterUpdate.localSheets[0].customName, 'QA November Updated')
    assert.equal(afterUpdate.localOrdersBySheet[sheetId][0].lines[0].images[0], dataUrl)

    const csv = await sheetsHandler(new Request('https://synthetic.local/.netlify/functions/sheets?gid=42&offset=0&limit=10', { headers: { cookie } }))
    assert.equal(csv.status, 200)
    assert.match(await csv.text(), /Synthetic Customer/)

    const unauthenticated = await dataHandler(new Request(base))
    assert.equal(unauthenticated.status, 401)
    const crossOrigin = await dataHandler(new Request(base, {
      method: 'PUT',
      headers: { cookie, origin: 'https://not-synthetic.local', 'content-type': 'application/json' },
      body: JSON.stringify(snapshot),
    }))
    assert.equal(crossOrigin.status, 403)
    assert.ok(mockedExternalRequests > 0)
  } finally {
    globalThis.fetch = originalFetch
    for (const key of environmentKeys) {
      if (previousEnvironment[key] === undefined) delete process.env[key]
      else process.env[key] = previousEnvironment[key]
    }
  }
})
