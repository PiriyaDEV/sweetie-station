import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import test from 'node:test'

const savedEnv = Object.fromEntries([
  'SWEETIE_ADMIN_USERNAME', 'SWEETIE_ADMIN_PASSWORD', 'SWEETIE_SESSION_SECRET',
  'SWEETIE_SPREADSHEET_ID', 'GOOGLE_SERVICE_ACCOUNT_JSON',
].map((key) => [key, process.env[key]]))
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
Object.assign(process.env, {
  SWEETIE_ADMIN_USERNAME: 'qa-admin',
  SWEETIE_ADMIN_PASSWORD: 'qa-password',
  SWEETIE_SESSION_SECRET: 'direct-sheet-test-secret',
  SWEETIE_SPREADSHEET_ID: 'direct-test-spreadsheet',
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 'qa@example.invalid', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) }),
})

const salesRows = [
  ['วันที่', 'ชื่อไลน์', 'ชื่อจริง', 'รายการ', 'จำนวน', 'ราคาขาย', 'BANK', 'ราคามัดจำ', 'กำไรสุทธิ', 'ต้นทุน(บาท)', 'ต้นทุน(RMB)', 'Synthetic Formula'],
  ['8', 'Synthetic Line', 'Synthetic Existing Customer', 'Existing Item', '1', '80', '0', '80', '20', '60', '12', '=SUM(F2:G2)'],
]
const appRows = []
const sheetRows = new Map([['42', salesRows], ['77', appRows]])
const spreadsheet = {
  spreadsheetId: 'direct-test-spreadsheet',
  properties: { title: 'Synthetic Direct Write Workbook' },
  sheets: [
    { properties: { sheetId: 42, title: 'Synthetic Orders', gridProperties: { rowCount: 100, columnCount: 11 } } },
    { properties: { sheetId: 77, title: 'Sweetie App Data', gridProperties: { rowCount: 1000, columnCount: 7 } } },
  ],
}
const originalFetch = globalThis.fetch
let newSheetId = 88
let mockedRequests = 0

function getRowsByRange(url) {
  const range = decodeURIComponent(url.pathname.split('/values/')[1] ?? '').split('?')[0]
  const match = /^'((?:[^']|'')+)'!/.exec(range)
  if (!match) throw new Error(`Unexpected values range: ${range}`)
  const title = match[1].replaceAll("''", "'")
  const sheet = spreadsheet.sheets.find(({ properties }) => properties.title === title)
  if (!sheet) throw new Error(`Unknown synthetic tab: ${title}`)
  return { rows: sheetRows.get(String(sheet.properties.sheetId)), range: range.slice(match[0].length) }
}

function columnNumber(label) {
  return [...label.toUpperCase()].reduce((value, character) => value * 26 + character.charCodeAt(0) - 64, 0) - 1
}

function applyRange(url, values) {
  const { rows, range } = getRowsByRange(url)
  const match = /^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/i.exec(range)
  if (!match) throw new Error(`Unsupported synthetic update range: ${range}`)
  const startColumn = columnNumber(match[1])
  const startRow = Number(match[2]) - 1
  while (rows.length <= startRow) rows.push([])
  const lastRow = match[4] ? Number(match[4]) - 1 : startRow
  for (let rowIndex = startRow; rowIndex <= lastRow; rowIndex += 1) {
    while (rows.length <= rowIndex) rows.push([])
    const inputRow = values[rowIndex - startRow] ?? []
    for (let index = 0; index < inputRow.length; index += 1) rows[rowIndex][startColumn + index] = inputRow[index]
  }
}

globalThis.fetch = async (input, options = {}) => {
  mockedRequests += 1
  const url = new URL(String(input))
  if (url.hostname === 'oauth2.googleapis.com') return Response.json({ access_token: 'synthetic-direct-token', expires_in: 3600 })
  assert.equal(url.hostname, 'sheets.googleapis.com', 'all workbook calls must be intercepted')

  if (url.pathname.endsWith('/spreadsheets:batchUpdate') || url.pathname.endsWith('/spreadsheets/direct-test-spreadsheet:batchUpdate')) {
    const body = JSON.parse(options.body ?? '{}')
    const replies = []
    for (const request of body.requests ?? []) {
      const props = request.addSheet?.properties
      if (props) {
        const sheetId = newSheetId++
        spreadsheet.sheets.push({ properties: { ...props, sheetId } })
        sheetRows.set(String(sheetId), [])
        replies.push({ addSheet: { properties: { sheetId, title: props.title } } })
      }
      const insertion = request.insertDimension?.range
      if (insertion) {
        const rows = sheetRows.get(String(insertion.sheetId))
        const count = insertion.endIndex - insertion.startIndex
        rows.splice(insertion.startIndex, 0, ...Array.from({ length: count }, () => []))
      }
      const deletion = request.deleteDimension?.range
      if (deletion) {
        const rows = sheetRows.get(String(deletion.sheetId))
        rows.splice(deletion.startIndex, deletion.endIndex - deletion.startIndex)
      }
    }
    return Response.json({ replies })
  }

  if (url.pathname.endsWith('/values:batchUpdate')) {
    const body = JSON.parse(options.body ?? '{}')
    for (const entry of body.data ?? []) {
      const quotedTitle = entry.range.split('!')[0]
      const syntheticUrl = new URL(`https://sheets.googleapis.com/v4/spreadsheets/direct-test-spreadsheet/values/${encodeURIComponent(quotedTitle + '!' + entry.range.split('!')[1])}`)
      applyRange(syntheticUrl, entry.values)
    }
    return Response.json({ totalUpdatedCells: (body.data ?? []).reduce((sum, entry) => sum + entry.values.flat().length, 0) })
  }

  if (url.pathname.includes('/values/') && url.pathname.endsWith(':append')) {
    const { rows } = getRowsByRange(url)
    const body = JSON.parse(options.body ?? '{}')
    const firstRowNumber = rows.length + 1
    rows.push(...body.values.map((row) => [...row]))
    const endColumn = String.fromCharCode(64 + Math.min(body.values[0].length, 26))
    return Response.json({ updates: { updatedRange: `'Synthetic Orders'!A${firstRowNumber}:${endColumn}${rows.length}` } })
  }

  if (url.pathname.includes('/values/')) {
    const { rows, range } = getRowsByRange(url)
    if (options.method === 'PUT') {
      const body = JSON.parse(options.body ?? '{}')
      applyRange(url, body.values)
      return Response.json({ updatedCells: body.values?.[0]?.length ?? 0 })
    }
    if (range.startsWith('A1:')) return Response.json({ values: rows.length ? [rows[0]] : [] })
    return Response.json({ values: rows })
  }

  if (url.pathname.endsWith('/spreadsheets/direct-test-spreadsheet')) return Response.json(spreadsheet)
  throw new Error(`Unexpected intercepted Sheets API request: ${options.method ?? 'GET'} ${url.pathname}`)
}

test('create/update orders, persist image cells, create a real tab', async () => {
  try {
    const [{ default: ordersHandler }, { default: sheetsHandler }, { createSessionToken }] = await Promise.all([
      import('../netlify/functions/orders.mjs'),
      import('../netlify/functions/sheets.mjs'),
      import('../netlify/lib/session.mjs'),
    ])
    const cookie = `sweetie_session=${createSessionToken('qa-admin', process.env.SWEETIE_SESSION_SECRET)}`
    const image = 'data:image/webp;base64,U1lOVEhFVElD'
    const order = {
      id: 'qa-order-direct-1', sheetRow: 0, day: '2026-11-09', lineName: 'Synthetic Direct Line',
      customerName: 'Synthetic Direct Customer', paymentStatus: 'ยังไม่ได้ชำระ', shippingStatus: 'ยังไม่ได้สั่ง',
      lines: [
        { row: 0, itemName: 'Synthetic First Item', quantity: 2, salePrice: 100, bankAmount: 20, depositAmount: 80, profitAmount: 30, costTHB: 70, costRMB: 14, images: [image], attributes: [] },
        { row: 0, itemName: 'Synthetic Second Item', quantity: 1, salePrice: 50, bankAmount: 0, depositAmount: 50, profitAmount: null, costTHB: null, costRMB: null, images: [], attributes: [] },
      ],
      totalSales: 150, grossSales: 150, exchangeRate: 5.02, isCampaign: true, campaignDiscount: 10,
    }
    const postOrder = (payload, method = 'POST') => ordersHandler(new Request('https://synthetic.local/api/orders', {
      method,
      headers: { cookie, origin: 'https://synthetic.local', 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }))

    const createResponse = await postOrder({ gid: '42', order })
    assert.equal(createResponse.status, 201)
    const created = await createResponse.json()
    assert.deepEqual(created.rowNumbers, [3, 4])
    const headers = salesRows[0]
    const orderIdColumn = headers.indexOf('Sweetie Order ID')
    const imageColumn = headers.indexOf('Sweetie Image Data')
    const formulaColumn = headers.indexOf('Synthetic Formula')
    salesRows[2][formulaColumn] = '=SUM(F3:G3)'
    assert.equal(salesRows[2][orderIdColumn], 'qa-order-direct-1')
    assert.equal(salesRows[2][imageColumn], JSON.stringify([image]))
    assert.equal(salesRows[2][headers.indexOf('Sweetie Campaign Discount')], 10)
    assert.equal(salesRows[2][headers.indexOf('Sweetie Payment Status')], 'ยังไม่ได้ชำระ')
    assert.equal(salesRows[2][headers.indexOf('Sweetie Shipping Status')], 'ยังไม่ได้สั่ง')
    assert.equal(salesRows[3][headers.indexOf('รายการ')], 'Synthetic Second Item')

    const retryResponse = await postOrder({ gid: '42', order })
    assert.equal(retryResponse.status, 201)
    assert.equal(salesRows.filter((row) => String(row[orderIdColumn] ?? '') === 'qa-order-direct-1').length, 2, 'retrying a create must update the same rows instead of duplicating them')

    const updatedOrder = structuredClone(order)
    updatedOrder.sheetRow = 3
    updatedOrder.lines[0].row = 3
    updatedOrder.lines[1].row = 4
    updatedOrder.lines.push({ row: 0, itemName: 'Synthetic Added Item', quantity: 1, salePrice: 25, bankAmount: 0, depositAmount: 25, profitAmount: null, images: [], attributes: [] })
    updatedOrder.lines[0].salePrice = 110
    const updateResponse = await postOrder({ gid: '42', order: updatedOrder }, 'PUT')
    assert.equal(updateResponse.status, 200)
    const updated = await updateResponse.json()
    assert.deepEqual(updated.rowNumbers, [3, 4, 5])
    assert.equal(salesRows[2][headers.indexOf('ราคาขาย')], 110)
    assert.equal(salesRows[4][headers.indexOf('รายการ')], 'Synthetic Added Item')
    assert.equal(salesRows[4][orderIdColumn], 'qa-order-direct-1')
    assert.equal(salesRows[2][formulaColumn], '=SUM(F3:G3)', 'updating known order cells must preserve unrelated formulas')

    const shortenedOrder = structuredClone(updatedOrder)
    shortenedOrder.lines.pop()
    const shortenResponse = await postOrder({ gid: '42', order: shortenedOrder }, 'PUT')
    assert.equal(shortenResponse.status, 200)
    assert.equal(salesRows.length, 4, 'removed item rows should be deleted so sheet row numbers stay accurate')
    assert.equal(salesRows.filter((row) => String(row[orderIdColumn] ?? '') === 'qa-order-direct-1').length, 2)

    const createSheetResponse = await sheetsHandler(new Request('https://synthetic.local/api/sheets', {
      method: 'POST',
      headers: { cookie, origin: 'https://synthetic.local', 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Synthetic QA Tab', templateGid: '42' }),
    }))
    assert.equal(createSheetResponse.status, 201)
    const sheetResult = await createSheetResponse.json()
    assert.equal(sheetResult.sheet.sheetId, '88')
    assert.equal(sheetRows.get('88')[0][0], 'วันที่')
    assert.ok(mockedRequests > 0)
  } finally {
    globalThis.fetch = originalFetch
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})
