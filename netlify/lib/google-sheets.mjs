import { createSign } from 'node:crypto'

const SPREADSHEET_ID = process.env.SWEETIE_SPREADSHEET_ID || '1Y5z_jWtQd5-dxG_hWQlHYWNWtR4giR6k8tAwpmqRF5w'
const APP_DATA_SHEET = 'Sweetie App Data'
const APP_DATA_MARKER = 'SWEETIE_APP_DATA'
const MAX_CELL_CHARS = 30_000
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets'
let cachedToken
let cachedTokenExpiresAt = 0
let accessTokenPromise
let cachedSpreadsheetMetadata
let cachedSpreadsheetMetadataExpiresAt = 0
let spreadsheetMetadataPromise
const SHEET_PAGE_CACHE_TTL_MS = 10_000
const SHEET_PAGE_CACHE_MAX_ENTRIES = 240
const cachedSheetPages = new Map()

function encodeBase64Url(value) {
  return Buffer.from(value).toString('base64url')
}

function getCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('Google Sheets service account is not configured.')
  let credentials
  try {
    credentials = JSON.parse(raw)
  } catch {
    throw new Error('Google Sheets service account configuration is invalid.')
  }
  if (!credentials.client_email || !credentials.private_key) {
    throw new Error('Google Sheets service account configuration is incomplete.')
  }
  return credentials
}

async function getAccessToken() {
  if (cachedToken && cachedTokenExpiresAt > Date.now() + 60_000) return cachedToken
  if (accessTokenPromise) return accessTokenPromise
  accessTokenPromise = (async () => {
    const credentials = getCredentials()
    const issuedAt = Math.floor(Date.now() / 1000)
    const assertionHeader = encodeBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const assertionPayload = encodeBase64Url(JSON.stringify({
      iss: credentials.client_email,
      scope: SHEETS_SCOPE,
      aud: TOKEN_URL,
      iat: issuedAt,
      exp: issuedAt + 3600,
    }))
    const unsignedAssertion = `${assertionHeader}.${assertionPayload}`
    const signer = createSign('RSA-SHA256')
    signer.update(unsignedAssertion)
    signer.end()
    const assertion = `${unsignedAssertion}.${signer.sign(credentials.private_key, 'base64url')}`
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok || typeof body.access_token !== 'string') {
      throw new Error(`Google authentication failed (${response.status}).`)
    }
    cachedToken = body.access_token
    cachedTokenExpiresAt = Date.now() + (Number(body.expires_in) || 3600) * 1000
    return cachedToken
  })()
  try {
    return await accessTokenPromise
  } finally {
    accessTokenPromise = undefined
  }
}

async function sheetsRequest(path, options = {}) {
  const token = await getAccessToken()
  const method = options.method ?? 'GET'
  const shouldRetry = method === 'GET'
  let lastError
  for (let attempt = 0; attempt < (shouldRetry ? 3 : 1); attempt += 1) {
    let response
    try {
      response = await fetch(`https://sheets.googleapis.com/v4/${path}`, {
        ...options,
        headers: {
          authorization: `Bearer ${token}`,
          ...(options.body ? { 'content-type': 'application/json' } : {}),
          ...options.headers,
        },
      })
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Google Sheets request failed.')
      if (!shouldRetry || attempt === 2) throw lastError
      await new Promise((resolve) => setTimeout(resolve, Math.min(450 * (2 ** attempt) + Math.random() * 250, 3_000)))
      continue
    }

    const body = await response.json().catch(() => ({}))
    if (response.ok) return body
    const details = typeof body.error?.message === 'string' ? body.error.message : 'Google Sheets request failed.'
    lastError = new Error(details)
    const retryable = response.status === 429 || response.status === 500 || response.status === 502 || response.status === 503 || response.status === 504
    if (!shouldRetry || !retryable || attempt === 2) throw lastError
    const retryAfter = Number(response.headers.get('retry-after'))
    const delay = retryAfter > 0 ? Math.min(retryAfter * 1000, 4_000) : Math.min(450 * (2 ** attempt) + Math.random() * 250, 3_000)
    await new Promise((resolve) => setTimeout(resolve, delay))
  }
  throw lastError ?? new Error('Google Sheets request failed.')
}

async function getSpreadsheet() {
  if (cachedSpreadsheetMetadata && cachedSpreadsheetMetadataExpiresAt > Date.now()) return cachedSpreadsheetMetadata
  if (spreadsheetMetadataPromise) return spreadsheetMetadataPromise
  spreadsheetMetadataPromise = (async () => {
    const fields = encodeURIComponent('spreadsheetId,properties.title,sheets.properties(sheetId,title,gridProperties(rowCount,columnCount))')
    cachedSpreadsheetMetadata = await sheetsRequest(`spreadsheets/${encodeURIComponent(SPREADSHEET_ID)}?fields=${fields}`)
    cachedSpreadsheetMetadataExpiresAt = Date.now() + 5 * 60 * 1000
    return cachedSpreadsheetMetadata
  })()
  try {
    return await spreadsheetMetadataPromise
  } finally {
    spreadsheetMetadataPromise = undefined
  }
}

function csvCell(value) {
  const text = value == null ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export async function readSheetCsvByGid(gid, offset = 0, limit = 120) {
  if (!/^\d+$/.test(String(gid))) throw new Error('Invalid Google Sheets tab ID.')
  const safeOffset = Math.max(0, Math.floor(Number(offset) || 0))
  const safeLimit = Math.max(1, Math.min(2000, Math.floor(Number(limit) || 120)))
  const cacheKey = `${gid}:${safeOffset}:${safeLimit}`
  const cached = cachedSheetPages.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.csv
  if (cached) cachedSheetPages.delete(cacheKey)

  const spreadsheet = await getSpreadsheet()
  const sheet = spreadsheet.sheets?.find(({ properties }) => String(properties?.sheetId) === String(gid))?.properties
  if (!sheet?.title) throw new Error('Google Sheets tab was not found.')
  const lastColumnIndex = Math.max(0, Math.min(Number(sheet.gridProperties?.columnCount) || 702, 702) - 1)
  const endColumn = columnLabel(lastColumnIndex)
  const quotedTitle = quoteSheetTitle(sheet.title)
  const headerRange = `${quotedTitle}!A1:${endColumn}1`
  const pageStartRow = safeOffset + 2
  const pageEndRow = safeOffset + safeLimit + 1
  const pageRange = `${quotedTitle}!A${pageStartRow}:${endColumn}${pageEndRow}`
  const query = new URLSearchParams({ valueRenderOption: 'FORMATTED_VALUE' })
  query.append('ranges', headerRange)
  query.append('ranges', pageRange)
  const result = await sheetsRequest(`spreadsheets/${encodeURIComponent(SPREADSHEET_ID)}/values:batchGet?${query.toString()}`)
  const header = result.valueRanges?.[0]?.values?.[0] ?? []
  if (!header.length) return ''
  const pageRows = result.valueRanges?.[1]?.values ?? []
  const csv = [header, ...pageRows].map((row) => row.map(csvCell).join(',')).join('\r\n')
  cachedSheetPages.set(cacheKey, { csv, expiresAt: Date.now() + SHEET_PAGE_CACHE_TTL_MS })
  if (cachedSheetPages.size > SHEET_PAGE_CACHE_MAX_ENTRIES) cachedSheetPages.delete(cachedSheetPages.keys().next().value)
  return csv
}

function invalidateSheetPageCache(gid) {
  const prefix = `${gid}:`
  for (const key of cachedSheetPages.keys()) if (key.startsWith(prefix)) cachedSheetPages.delete(key)
}

function getSheetProperties(spreadsheet, gid) {
  return spreadsheet.sheets?.find(({ properties }) => String(properties?.sheetId) === String(gid))?.properties ?? null
}

function quoteSheetTitle(title) {
  return `'${String(title).replaceAll("'", "''")}'`
}

function columnLabel(index) {
  let value = index + 1
  let label = ''
  while (value > 0) {
    const remainder = (value - 1) % 26
    label = String.fromCharCode(65 + remainder) + label
    value = Math.floor((value - 1) / 26)
  }
  return label
}

export async function getSpreadsheetSheets() {
  const spreadsheet = await getSpreadsheet()
  return (spreadsheet.sheets ?? []).map(({ properties }) => ({
    sheetId: String(properties.sheetId),
    title: properties.title,
    rowCount: properties.gridProperties?.rowCount ?? 0,
    columnCount: properties.gridProperties?.columnCount ?? 0,
  }))
}

export async function readSheetValuesByGid(gid, a1Range = 'A:ZZ') {
  if (!/^\d+$/.test(String(gid))) throw new Error('Invalid Google Sheets tab ID.')
  const spreadsheet = await getSpreadsheet()
  const sheet = getSheetProperties(spreadsheet, gid)
  if (!sheet?.title) throw new Error('Google Sheets tab was not found.')
  const range = encodeURIComponent(`${quoteSheetTitle(sheet.title)}!${a1Range}`)
  const result = await sheetsRequest(`spreadsheets/${encodeURIComponent(SPREADSHEET_ID)}/values/${range}`)
  return { sheet, values: result.values ?? [] }
}

export async function updateSheetValuesByGid(gid, a1Range, values) {
  const { sheet } = await readSheetValuesByGid(gid, 'A1')
  const range = encodeURIComponent(`${quoteSheetTitle(sheet.title)}!${a1Range}`)
  return sheetsRequest(`spreadsheets/${encodeURIComponent(SPREADSHEET_ID)}/values/${range}?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values }),
  })
}

async function addAppColumnsIfMissing(gid, values, labels) {
  const header = [...(values[0] ?? [])]
  const added = []
  for (const label of labels) {
    if (header.includes(label)) continue
    header.push(label)
    added.push(label)
  }
  if (added.length) {
    const spreadsheet = await getSpreadsheet()
    const sheet = getSheetProperties(spreadsheet, gid)
    if (sheet && Number(sheet.gridProperties?.columnCount ?? 0) < header.length) {
      await sheetsRequest(`spreadsheets/${encodeURIComponent(SPREADSHEET_ID)}:batchUpdate`, {
        method: 'POST',
        body: JSON.stringify({ requests: [{ updateSheetProperties: { properties: { sheetId: sheet.sheetId, gridProperties: { columnCount: header.length } }, fields: 'gridProperties.columnCount' } }] }),
      })
      cachedSpreadsheetMetadata = undefined
      cachedSpreadsheetMetadataExpiresAt = 0
    }
    const endColumn = columnLabel(header.length - 1)
    await updateSheetValuesByGid(gid, `A1:${endColumn}1`, [header])
  }
  return header
}

export async function appendOrderRowsByGid(gid, headers, rows) {
  if (!/^\d+$/.test(String(gid)) || !Array.isArray(rows) || rows.length === 0) throw new Error('Invalid order rows.')
  const { sheet } = await readSheetValuesByGid(gid, 'A1')
  const endColumn = columnLabel(Math.max(0, headers.length - 1))
  const range = encodeURIComponent(`${quoteSheetTitle(sheet.title)}!A:${endColumn}`)
  const result = await sheetsRequest(`spreadsheets/${encodeURIComponent(SPREADSHEET_ID)}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: 'POST',
    body: JSON.stringify({ values: rows }),
  })
  return result.updates?.updatedRange ?? ''
}

export async function updateOrderRowsByGid(gid, rowNumbers, rows, insertCount = 0) {
  if (!/^\d+$/.test(String(gid)) || !Array.isArray(rowNumbers) || !Array.isArray(rows)) throw new Error('Invalid order update.')
  const { sheet } = await readSheetValuesByGid(gid, 'A1')
  const sortedRows = [...rowNumbers].sort((a, b) => a - b)
  if (insertCount > 0) {
    const insertionIndex = sortedRows.at(-1)
    await sheetsRequest(`spreadsheets/${encodeURIComponent(SPREADSHEET_ID)}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests: [{ insertDimension: { range: { sheetId: sheet.sheetId, dimension: 'ROWS', startIndex: insertionIndex, endIndex: insertionIndex + insertCount }, inheritFromBefore: true } }] }),
    })
    cachedSpreadsheetMetadata = undefined
    cachedSpreadsheetMetadataExpiresAt = 0
  }

  const allRowNumbers = [...sortedRows, ...Array.from({ length: insertCount }, (_, index) => sortedRows.at(-1) + index + 1)]
  const usedRows = rows.slice(0, allRowNumbers.length)
  const remainingRows = allRowNumbers.slice(usedRows.length)
  if (remainingRows.length) {
    const descending = [...remainingRows].sort((a, b) => b - a)
    const ranges = []
    for (const rowNumber of descending) {
      const previous = ranges.at(-1)
      if (previous && rowNumber === previous.startIndex) previous.startIndex -= 1
      else ranges.push({ startIndex: rowNumber - 1, endIndex: rowNumber })
    }
    await sheetsRequest(`spreadsheets/${encodeURIComponent(SPREADSHEET_ID)}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests: ranges.map((range) => ({ deleteDimension: { range: { sheetId: sheet.sheetId, dimension: 'ROWS', ...range } } })) }),
    })
    cachedSpreadsheetMetadata = undefined
    cachedSpreadsheetMetadataExpiresAt = 0
  }
  const data = []
  usedRows.forEach((row, rowIndex) => {
    for (const [columnIndex, value] of Object.entries(row)) {
      const column = columnLabel(Number(columnIndex))
      data.push({ range: `${quoteSheetTitle(sheet.title)}!${column}${allRowNumbers[rowIndex]}`, values: [[value]] })
    }
  })
  if (data.length) {
    await sheetsRequest(`spreadsheets/${encodeURIComponent(SPREADSHEET_ID)}/values:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ valueInputOption: 'RAW', data }),
    })
  }
  return allRowNumbers
}

export async function writeOrderToSheet(gid, order, isUpdate = false) {
  if (!/^\d+$/.test(String(gid)) || !order || !Array.isArray(order.lines) || order.lines.length === 0) throw new Error('Order has no items to save.')
  const { values } = await readSheetValuesByGid(gid, 'A:ZZ')
  if (!values.length) throw new Error('The selected sheet has no header row.')
  const helperHeaders = ['Sweetie Order ID', 'Sweetie Image Data', 'Sweetie Image Name', 'Sweetie Exchange Rate', 'Sweetie Campaign', 'Sweetie Campaign Discount', 'Sweetie Payment Status', 'Sweetie Shipping Status']
  const headers = await addAppColumnsIfMissing(gid, values, helperHeaders)
  const normalize = (value) => String(value ?? '').toLocaleLowerCase().replace(/[\s()（）]/g, '')
  const find = (needles) => headers.findIndex((header) => needles.some((needle) => normalize(header).includes(normalize(needle))))
  const columns = {
    date: find(['วันที่']), lineName: find(['ชื่อไลน์']), customerName: find(['ชื่อจริง', 'ชื่อลูกค้า']),
    itemName: find(['รายการ']), quantity: find(['จำนวน']), salePrice: find(['ราคาขาย']), bank: find(['BANK']),
    deposit: find(['ราคามัดจำ']), profit: find(['กำไรสุทธิ', 'กำไร']), costTHB: find(['ต้นทุน(บาท)', 'ต้นทุน(THB)']),
    costRMB: find(['ต้นทุน(RMB)', 'ต้นทุน(หยวน)', 'ค่าสินค้า(Y)', 'ราคาจีน']),
    orderId: headers.indexOf('Sweetie Order ID'), imageData: headers.indexOf('Sweetie Image Data'),
    imageName: headers.indexOf('Sweetie Image Name'), exchangeRate: headers.indexOf('Sweetie Exchange Rate'),
    campaign: headers.indexOf('Sweetie Campaign'), campaignDiscount: headers.indexOf('Sweetie Campaign Discount'),
    paymentStatus: headers.indexOf('Sweetie Payment Status'), shippingStatus: headers.indexOf('Sweetie Shipping Status'),
  }
  const required = ['date', 'lineName', 'customerName', 'itemName', 'quantity', 'salePrice']
  if (required.some((key) => columns[key] < 0)) throw new Error('Required order columns are missing from the selected sheet.')

  const orderId = String(order.id || `sweetie-${Date.now()}`)
  const orderIdColumn = headers.indexOf('Sweetie Order ID')
  const matchingRows = orderIdColumn < 0 ? [] : values.flatMap((row, index) => index > 0 && String(row[orderIdColumn] ?? '') === orderId ? [index + 1] : [])
  const shouldUpdate = isUpdate || matchingRows.length > 0
  const rowHints = matchingRows.length ? matchingRows : [order.sheetRow, ...order.lines.map((line) => line.row)]
  const targetRows = shouldUpdate ? [...new Set(rowHints.filter((row) => Number.isInteger(row) && row > 1))].sort((a, b) => a - b) : []
  if (shouldUpdate && targetRows.length === 0) throw new Error('Could not find the existing order rows to update.')
  const targetRowsForWrite = targetRows.length ? targetRows : []
  const insertCount = Math.max(0, order.lines.length - targetRowsForWrite.length)
  const rowMaps = order.lines.map((line, index) => {
    const row = {}
    const set = (key, value) => { if (columns[key] >= 0) row[columns[key]] = value == null ? '' : value }
    set('date', index === 0 ? order.day : '')
    set('lineName', index === 0 ? order.lineName : '')
    set('customerName', index === 0 ? order.customerName : '')
    set('itemName', line.itemName ?? '')
    set('quantity', line.quantity ?? 1)
    set('salePrice', line.salePrice ?? 0)
    set('bank', line.bankAmount ?? 0)
    set('deposit', line.depositAmount ?? 0)
    set('profit', line.profitAmount)
    set('costTHB', line.costTHB)
    set('costRMB', line.costRMB)
    set('orderId', orderId)
    const imagePayload = JSON.stringify(line.images ?? [])
    if (imagePayload.length > 48_000) throw new Error('Image is too large to save in a Google Sheets cell.')
    set('imageData', imagePayload)
    set('imageName', line.imageName ?? '')
    set('exchangeRate', index === 0 ? order.exchangeRate : '')
    set('campaign', index === 0 ? Boolean(order.isCampaign) : '')
    set('campaignDiscount', index === 0 ? order.campaignDiscount ?? 0 : '')
    set('paymentStatus', order.paymentStatus ?? '')
    set('shippingStatus', order.shippingStatus ?? '')
    for (const attribute of line.attributes ?? []) {
      const attributeIndex = headers.indexOf(attribute.key)
      if (attributeIndex >= 0) row[attributeIndex] = attribute.value
    }
    return row
  })
  const rows = rowMaps.map((row) => Array.from({ length: headers.length }, (_, columnIndex) => row[columnIndex] ?? ''))

  if (shouldUpdate) {
    const savedRows = await updateOrderRowsByGid(gid, targetRows, rowMaps, insertCount)
    invalidateSheetPageCache(gid)
    return { orderId, rowNumbers: savedRows.slice(0, order.lines.length) }
  }
  const updatedRange = await appendOrderRowsByGid(gid, headers, rows)
  const startRow = Number(updatedRange.match(/![A-Z]+(\d+):/i)?.[1])
  if (!Number.isInteger(startRow) || startRow < 2) throw new Error('Google Sheets did not return the new order row.')
  invalidateSheetPageCache(gid)
  return { orderId, rowNumbers: order.lines.map((_, index) => startRow + index) }
}

export async function createWorksheetFromTemplate(title, templateGid) {
  const cleanTitle = String(title ?? '').trim()
  if (!cleanTitle || cleanTitle.length > 100 || /[\\/?*\[\]:]/.test(cleanTitle)) throw new Error('Sheet name is invalid.')
  const spreadsheet = await getSpreadsheet()
  if (spreadsheet.sheets?.some(({ properties }) => properties?.title?.toLocaleLowerCase() === cleanTitle.toLocaleLowerCase())) throw new Error('A sheet with that name already exists.')
  const template = getSheetProperties(spreadsheet, templateGid)
  if (!template) throw new Error('The selected sheet template was not found.')
  const templateRange = encodeURIComponent(`${quoteSheetTitle(template.title)}!A1:ZZ1`)
  const templateData = await sheetsRequest(`spreadsheets/${encodeURIComponent(SPREADSHEET_ID)}/values/${templateRange}`)
  const header = templateData.values?.[0] ?? []
  if (!header.length) throw new Error('The selected sheet has no header row to copy.')
  const result = await sheetsRequest(`spreadsheets/${encodeURIComponent(SPREADSHEET_ID)}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: cleanTitle, gridProperties: { rowCount: 1000, columnCount: Math.max(header.length, 20) } } } }] }),
  })
  const sheetId = result.replies?.[0]?.addSheet?.properties?.sheetId
  if (!Number.isInteger(sheetId)) throw new Error('Google Sheets did not return the new tab ID.')
  cachedSpreadsheetMetadata = undefined
  cachedSpreadsheetMetadataExpiresAt = 0
  const endColumn = columnLabel(header.length - 1)
  await updateSheetValuesByGid(sheetId, `A1:${endColumn}1`, [header])
  return { sheetId: String(sheetId), title: cleanTitle }
}

export async function ensureAppDataSheet(createIfMissing = true) {
  const spreadsheet = await getSpreadsheet()
  let sheet = spreadsheet.sheets?.find(({ properties }) => properties?.title === APP_DATA_SHEET)?.properties
  if (!sheet && createIfMissing) {
    await sheetsRequest(`spreadsheets/${encodeURIComponent(SPREADSHEET_ID)}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: APP_DATA_SHEET, gridProperties: { rowCount: 1000, columnCount: 7 } } } }] }),
    })
    cachedSpreadsheetMetadata = undefined
    cachedSpreadsheetMetadataExpiresAt = 0
    const updated = await getSpreadsheet()
    sheet = updated.sheets?.find(({ properties }) => properties?.title === APP_DATA_SHEET)?.properties
  }
  return sheet ?? null
}

function splitChunks(text) {
  const chunks = []
  for (let start = 0; start < text.length; start += MAX_CELL_CHARS) chunks.push(text.slice(start, start + MAX_CELL_CHARS))
  return chunks.length ? chunks : ['']
}

function snapshotRecords(snapshot) {
  const records = []
  for (const [sheetId, orders] of Object.entries(snapshot.localOrdersBySheet ?? {})) {
    if (orders?.length) records.push({ type: 'orders', sheetId, recordId: 'all', updatedAt: Math.max(0, ...orders.map((order) => Number(order.updatedAt) || 0)), payload: orders })
  }
  for (const [sheetId, expenses] of Object.entries(snapshot.monthlyExpensesBySheet ?? {})) {
    if (expenses?.length) records.push({ type: 'expenses', sheetId, recordId: 'all', updatedAt: snapshot.monthlyExpenseRevisionsBySheet?.[sheetId] ?? 0, payload: expenses })
  }
  records.push({ type: 'expense-revisions', sheetId: '', recordId: 'all', updatedAt: 0, payload: snapshot.monthlyExpenseRevisionsBySheet ?? {} })
  records.push({ type: 'sheets', sheetId: '', recordId: 'all', updatedAt: 0, payload: snapshot.localSheets ?? [] })
  records.push({
    type: 'settings',
    sheetId: '',
    recordId: 'app',
    updatedAt: snapshot.updatedAt ?? Date.now(),
    payload: {
      version: 1,
      exchangeRate: snapshot.exchangeRate,
      language: snapshot.language === 'th' ? 'th' : 'en',
      updatedAt: snapshot.updatedAt ?? Date.now(),
    },
  })
  return records
}

function snapshotToRows(snapshot) {
  const rows = []
  for (const record of snapshotRecords(snapshot)) {
    const json = JSON.stringify(record.payload)
    const chunks = splitChunks(json)
    chunks.forEach((chunk, index) => rows.push([
      record.type,
      record.sheetId,
      record.recordId,
      record.updatedAt,
      index,
      chunks.length,
      chunk,
    ]))
  }
  return rows
}

function rowsToSnapshot(rows, header) {
  const groups = new Map()
  for (const row of rows) {
    const type = row[0]
    const sheetId = row[1] ?? ''
    const recordId = row[2] ?? ''
    const index = Number(row[4]) || 0
    const total = Number(row[5]) || 1
    const key = `${type}\u0000${sheetId}\u0000${recordId}`
    const group = groups.get(key) ?? { type, sheetId, recordId, total, chunks: [] }
    group.total = total
    group.chunks[index] = row[6] ?? ''
    groups.set(key, group)
  }

  const snapshot = {
    version: 1,
    localOrdersBySheet: {},
    monthlyExpensesBySheet: {},
    monthlyExpenseRevisionsBySheet: {},
    localSheets: [],
    exchangeRate: 5.02,
    language: 'th',
    updatedAt: Number(header[2]) || Date.now(),
  }
  for (const record of groups.values()) {
    if (record.chunks.filter((chunk) => typeof chunk === 'string').length !== record.total) continue
    let payload
    try { payload = JSON.parse(record.chunks.join('')) } catch { continue }
    if (record.type === 'orders' && record.sheetId) snapshot.localOrdersBySheet[record.sheetId] = payload
    else if (record.type === 'expenses' && record.sheetId) snapshot.monthlyExpensesBySheet[record.sheetId] = payload
    else if (record.type === 'expense-revisions') snapshot.monthlyExpenseRevisionsBySheet = payload
    else if (record.type === 'sheets') snapshot.localSheets = payload
    else if (record.type === 'settings') {
      snapshot.exchangeRate = Number(payload.exchangeRate) > 0 ? Number(payload.exchangeRate) : 5.02
      snapshot.language = payload.language === 'en' ? 'en' : 'th'
      snapshot.updatedAt = Number(payload.updatedAt) || snapshot.updatedAt
    }
  }
  return snapshot
}

export async function readGoogleSnapshot() {
  const sheet = await ensureAppDataSheet(false)
  if (!sheet) return null
  const range = encodeURIComponent(`'${APP_DATA_SHEET}'!A1:G`)
  const result = await sheetsRequest(`spreadsheets/${encodeURIComponent(SPREADSHEET_ID)}/values/${range}`)
  const values = result.values ?? []
  const header = values[0] ?? []
  if (header[0] !== APP_DATA_MARKER || String(header[1]) !== '1') return null
  const rowCount = Math.max(0, Number(header[3]) || 0)
  return rowsToSnapshot(values.slice(1, rowCount + 1), header)
}

export async function writeGoogleSnapshot(snapshot) {
  const sheet = await ensureAppDataSheet(true)
  if (!sheet) throw new Error('Could not create the Google Sheets app data tab.')
  const dataRows = snapshotToRows(snapshot)
  const currentRange = encodeURIComponent(`'${APP_DATA_SHEET}'!A1:G`)
  const currentData = await sheetsRequest(`spreadsheets/${encodeURIComponent(SPREADSHEET_ID)}/values/${currentRange}`)
  const oldHeader = currentData.values?.[0] ?? []
  const oldRowCount = Math.max(currentData.values?.length ?? 0, (Number(oldHeader[3]) || 0) + 1, 1)
  const totalRows = Math.max(oldRowCount, dataRows.length + 1)
  const header = [APP_DATA_MARKER, '1', String(snapshot.updatedAt ?? Date.now()), String(dataRows.length), 'chunk_index', 'chunk_count', 'payload_json']
  const rows = [header, ...dataRows]
  while (rows.length < totalRows) rows.push([])
  const columnCount = 7
  const cellValue = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) return { userEnteredValue: { numberValue: value } }
    if (value === '' || value == null) return {}
    return { userEnteredValue: { stringValue: String(value) } }
  }
  const rowData = rows.map((row) => ({ values: Array.from({ length: columnCount }, (_, col) => cellValue(row[col])) }))
  const nextRowCount = Math.max(Number(sheet.gridProperties?.rowCount) || 0, totalRows)
  const nextColumnCount = Math.max(Number(sheet.gridProperties?.columnCount) || 0, columnCount)
  const requests = []
  if (nextRowCount !== sheet.gridProperties?.rowCount || nextColumnCount !== sheet.gridProperties?.columnCount) {
    requests.push({ updateSheetProperties: { properties: { sheetId: sheet.sheetId, gridProperties: { rowCount: nextRowCount, columnCount: nextColumnCount } }, fields: 'gridProperties.rowCount,gridProperties.columnCount' } })
  }
  requests.push({ updateCells: { range: { sheetId: sheet.sheetId, startRowIndex: 0, endRowIndex: totalRows, startColumnIndex: 0, endColumnIndex: columnCount }, rows: rowData, fields: 'userEnteredValue' } })
  await sheetsRequest(`spreadsheets/${encodeURIComponent(SPREADSHEET_ID)}:batchUpdate`, { method: 'POST', body: JSON.stringify({ requests }) })
  return { updatedAt: snapshot.updatedAt ?? Date.now(), rowsWritten: dataRows.length }
}

const LINE_CONTACTS_SHEET = 'LINE Contacts'
const LINE_CONTACT_HEADER = ['lineUserId', 'displayName', 'pictureUrl', 'updatedAt']

async function ensureLineContactsSheet() {
  let spreadsheet = await getSpreadsheet()
  let sheet = spreadsheet.sheets?.find(({ properties }) => properties?.title === LINE_CONTACTS_SHEET)?.properties
  if (!sheet) {
    await sheetsRequest(`spreadsheets/${encodeURIComponent(SPREADSHEET_ID)}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: LINE_CONTACTS_SHEET, gridProperties: { rowCount: 1000, columnCount: LINE_CONTACT_HEADER.length } } } }] }),
    })
    cachedSpreadsheetMetadata = undefined
    cachedSpreadsheetMetadataExpiresAt = 0
    spreadsheet = await getSpreadsheet()
    sheet = spreadsheet.sheets?.find(({ properties }) => properties?.title === LINE_CONTACTS_SHEET)?.properties
    await updateSheetValuesByGid(sheet.sheetId, 'A1:D1', [LINE_CONTACT_HEADER])
  }
  return sheet
}

export async function readLineContacts() {
  const sheet = await ensureLineContactsSheet()
  const { values } = await readSheetValuesByGid(sheet.sheetId, 'A:D')
  return values.slice(1)
    .filter((row) => row[0])
    .map((row) => ({ lineUserId: row[0], displayName: row[1] ?? '', pictureUrl: row[2] ?? '', updatedAt: Number(row[3]) || 0 }))
}

// Inserts or refreshes a single contact (read-only profile data from LINE).
export async function upsertLineContact(contact) {
  const sheet = await ensureLineContactsSheet()
  const { values } = await readSheetValuesByGid(sheet.sheetId, 'A:A')
  const rowIndex = values.findIndex((row, index) => index > 0 && row[0] === contact.lineUserId)
  const row = [contact.lineUserId, contact.displayName, contact.pictureUrl, String(Date.now())]
  if (rowIndex >= 0) {
    await updateSheetValuesByGid(sheet.sheetId, `A${rowIndex + 1}:D${rowIndex + 1}`, [row])
  } else {
    const range = encodeURIComponent(`${quoteSheetTitle(sheet.title)}!A:D`)
    await sheetsRequest(`spreadsheets/${encodeURIComponent(SPREADSHEET_ID)}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
      method: 'POST',
      body: JSON.stringify({ values: [row] }),
    })
  }
}
