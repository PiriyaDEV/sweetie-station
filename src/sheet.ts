import { orderImages } from './orderImages'

export type SheetDefinition = {
  id: string
  gid: string
  titleKey: string
  kind: 'sales' | 'haul'
  monthKey: string
  year: number
  customName?: string
}

export type SheetLineAttribute = { key: string; value: string }

export type SheetOrderLine = {
  row: number
  itemName: string
  imageName?: string
  quantity: number
  salePrice: number
  bankAmount: number
  depositAmount: number
  profitAmount: number | null
  profitPercent: number | null
  costRMB?: number | null
  costTHB?: number | null
  images: string[]
  attributes: SheetLineAttribute[]
}

export type SheetOrder = {
  id: string
  sheetRow: number
  day: string
  lineName: string
  customerName: string
  paymentStatus: string
  shippingStatus: string
  lines: SheetOrderLine[]
  totalSales: number
  grossSales?: number
  exchangeRate?: number
  isCampaign?: boolean
  campaignDiscount?: number
  bankTotal: number
  depositTotal: number
  profitAmount: number | null
  profitPercent: number | null
  quantity: number
  isLocal?: boolean
  isOverride?: boolean
  updatedAt?: number
}

export type MonthlyExpenseCategory = 'shipping' | 'packaging' | 'ads' | 'other'

export type MonthlyExpense = {
  id: string
  category: MonthlyExpenseCategory
  description: string
  amount: number
  updatedAt?: number
}

export type SheetOrderParserState = { currentDay: string; currentOrder?: SheetOrder }

export type SheetOrderPage = {
  orders: SheetOrder[]
  hasMore: boolean
  nextOffset: number | null
  parserState?: SheetOrderParserState
}

export type SheetDataState = {
  orders: SheetOrder[]
  error?: string
  hasMore?: boolean
  nextOffset?: number
  parserState?: SheetOrderParserState
  loadingMore?: boolean
  loadMoreError?: string
}

export const SHEETS: SheetDefinition[] = [
  { id: 'may', gid: '246786947', titleKey: 'sheets.may', kind: 'sales', monthKey: 'may', year: 2026 },
  { id: 'june', gid: '2065480441', titleKey: 'sheets.june', kind: 'sales', monthKey: 'june', year: 2026 },
  { id: 'haul-jul', gid: '767554552', titleKey: 'sheets.haulJul', kind: 'haul', monthKey: 'july', year: 2026 },
  { id: 'july', gid: '1487621265', titleKey: 'sheets.july', kind: 'sales', monthKey: 'july', year: 2026 },
  { id: 'aug', gid: '1083277464', titleKey: 'sheets.aug', kind: 'sales', monthKey: 'aug', year: 2026 },
  { id: 'sep', gid: '1314167799', titleKey: 'sheets.sep', kind: 'sales', monthKey: 'sep', year: 2026 },
  { id: 'haul-sep', gid: '51699199', titleKey: 'sheets.haulSep', kind: 'haul', monthKey: 'sep', year: 2026 },
  { id: 'oct', gid: '1666163539', titleKey: 'sheets.oct', kind: 'sales', monthKey: 'oct', year: 2026 },
  { id: 'nov', gid: '402607796', titleKey: 'sheets.nov', kind: 'sales', monthKey: 'nov', year: 2026 },
  { id: 'dec', gid: '905302264', titleKey: 'sheets.dec', kind: 'sales', monthKey: 'dec', year: 2026 },
]

const SHEET_PAGE_CACHE_TTL_MS = 10_000
const SHEET_PAGE_CACHE_MAX_ENTRIES = 240
const sheetPageCsvCache = new Map<string, { csv: string; expiresAt: number }>()

export function clearSheetPageCache(gid?: string) {
  if (!gid) {
    sheetPageCsvCache.clear()
    return
  }
  for (const key of sheetPageCsvCache.keys()) {
    const requestUrl = new URL(key, 'https://sweetie-station.local')
    if (requestUrl.searchParams.get('gid') === String(gid)) sheetPageCsvCache.delete(key)
  }
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let value = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        value += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        value += character
      }
      continue
    }

    if (character === '"' && value.length === 0) {
      quoted = true
    } else if (character === ',') {
      row.push(value)
      value = ''
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      row.push(value)
      if (row.some((cell) => cell.trim())) rows.push(row)
      row = []
      value = ''
    } else {
      value += character
    }
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value)
    if (row.some((cell) => cell.trim())) rows.push(row)
  }

  return rows
}

function numberFromCell(value: string | undefined): number {
  if (!value?.trim()) return 0
  const number = Number(value.replaceAll(',', '').trim())
  return Number.isFinite(number) ? number : 0
}

function normalizedHeader(value: string) {
  return value.toLocaleLowerCase().replace(/[\s()（）]/g, '')
}

function findHeaderIndex(headers: string[], includes: string[]) {
  const targets = includes.map(normalizedHeader)
  return headers.findIndex((header) => targets.some((target) => normalizedHeader(header).includes(target)))
}

function cell(row: string[], index: number) {
  return index >= 0 ? row[index]?.trim() ?? '' : ''
}

function finalizeOrder(order: SheetOrder) {
  order.grossSales = order.lines.reduce((sum, line) => sum + line.salePrice, 0)
  order.totalSales = Math.max(0, order.grossSales - (order.campaignDiscount ?? 0))
  const hasProfitForEveryLine = order.lines.length > 0 && order.lines.every((line) => line.profitAmount !== null)
  order.profitAmount = hasProfitForEveryLine ? order.lines.reduce((sum, line) => sum + (line.profitAmount ?? 0), 0) - (order.campaignDiscount ?? 0) : null
  order.profitPercent = hasProfitForEveryLine && order.totalSales > 0 ? ((order.profitAmount ?? 0) / order.totalSales) * 100 : null
  return order
}

function imagesFromCell(value: string) {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed.filter((image): image is string => typeof image === 'string')
  } catch {
    // Older image values may be a single URL or data URL rather than JSON.
  }
  return [value]
}

export function parseOrdersPage(csv: string, sheet: SheetDefinition, offset = 0, parserState?: SheetOrderParserState, pageSize = 120): SheetOrderPage {
  const rows = parseCsv(csv)
  if (rows.length === 0) return { orders: [], hasMore: false, nextOffset: null }

  const headers = rows[0].map((header) => header.trim())
  const column = {
    date: findHeaderIndex(headers, ['วันที่']),
    lineName: findHeaderIndex(headers, ['ชื่อไลน์']),
    customerName: findHeaderIndex(headers, ['ชื่อจริง', 'ชื่อลูกค้า']),
    itemName: findHeaderIndex(headers, ['รายการ']),
    quantity: findHeaderIndex(headers, ['จำนวน']),
    salePrice: findHeaderIndex(headers, ['ราคาขาย']),
    bank: findHeaderIndex(headers, ['BANK']),
    deposit: findHeaderIndex(headers, ['ราคามัดจำ']),
    profit: findHeaderIndex(headers, ['กำไรสุทธิ', 'กำไร']),
    costTHB: findHeaderIndex(headers, ['ต้นทุน(บาท)', 'ต้นทุน(THB)']),
    costRMB: findHeaderIndex(headers, ['ต้นทุน(RMB)', 'ต้นทุน(หยวน)', 'ค่าสินค้า(Y)', 'ราคาจีน']),
    orderId: findHeaderIndex(headers, ['Sweetie Order ID']),
    imageData: findHeaderIndex(headers, ['Sweetie Image Data']),
    imageName: findHeaderIndex(headers, ['Sweetie Image Name']),
    exchangeRate: findHeaderIndex(headers, ['Sweetie Exchange Rate']),
    campaign: findHeaderIndex(headers, ['Sweetie Campaign']),
    campaignDiscount: findHeaderIndex(headers, ['Sweetie Campaign Discount']),
    sweetiePaymentStatus: findHeaderIndex(headers, ['Sweetie Payment Status']),
    sweetieShippingStatus: findHeaderIndex(headers, ['Sweetie Shipping Status']),
  }
  const baseColumns = new Set(Object.values(column).filter((index) => index >= 0))
  const orders: SheetOrder[] = []
  let currentOrder = parserState?.currentOrder
  let currentDay = parserState?.currentDay ?? ''

  rows.slice(1).forEach((row, index) => {
    const rowNumber = offset + index + 2
    const date = cell(row, column.date)
    const lineName = cell(row, column.lineName)
    const customerName = cell(row, column.customerName)
    const itemName = cell(row, column.itemName)
    const quantityText = cell(row, column.quantity)
    const salePriceText = cell(row, column.salePrice)
    const bankText = cell(row, column.bank)
    const depositText = cell(row, column.deposit)
    const profitText = cell(row, column.profit)
    const costText = cell(row, column.costTHB)
    const costRMBText = cell(row, column.costRMB)
    if (date) currentDay = date

    if (lineName) {
      if (currentOrder?.lines.length) orders.push(finalizeOrder(currentOrder))
      currentOrder = {
        id: cell(row, column.orderId) || String(rowNumber),
        sheetRow: rowNumber,
        day: currentDay,
        lineName,
        customerName,
        exchangeRate: numberFromCell(cell(row, column.exchangeRate)) || undefined,
        isCampaign: ['true', 'yes', '1'].includes(cell(row, column.campaign).toLocaleLowerCase()),
        campaignDiscount: numberFromCell(cell(row, column.campaignDiscount)),
        paymentStatus: '',
        shippingStatus: '',
        lines: [],
        totalSales: 0,
        bankTotal: 0,
        depositTotal: 0,
        profitAmount: null,
        profitPercent: null,
        quantity: 0,
      }
    }

    if (!currentOrder) return

    const paymentStatus = cell(row, column.sweetiePaymentStatus) || (row.find((value) => ['จ่ายเต็ม', 'มัดจำ', 'ยังไม่ได้ชำระ'].includes(value.trim()))?.trim() ?? '')
    const shippingStatus = cell(row, column.sweetieShippingStatus) || (row.find((value) => ['ยังไม่ได้สั่ง', 'สั่งแล้ว', 'รอเข้าไทย', 'ส่งแล้ว'].includes(value.trim()))?.trim() ?? '')
    if (paymentStatus) currentOrder.paymentStatus = paymentStatus
    if (shippingStatus) currentOrder.shippingStatus = shippingStatus

    const attributes = headers.flatMap((header, columnIndex) => {
      const value = cell(row, columnIndex)
      return header && !baseColumns.has(columnIndex) && value
        ? [{ key: header, value }]
        : []
    })

    const hasLineData = Boolean(lineName || customerName || itemName || quantityText || bankText || depositText || costText || costRMBText)
    if (!hasLineData) return

    const saleValue = numberFromCell(salePriceText)
    const profitAmount = profitText ? numberFromCell(profitText) : costText && salePriceText ? saleValue - numberFromCell(costText) : null
    const line: SheetOrderLine = {
      row: rowNumber,
      itemName,
      quantity: numberFromCell(quantityText),
      salePrice: saleValue,
      bankAmount: numberFromCell(bankText),
      depositAmount: numberFromCell(depositText),
      profitAmount,
      profitPercent: profitAmount !== null && saleValue > 0 ? (profitAmount / saleValue) * 100 : null,
      costRMB: costRMBText ? numberFromCell(costRMBText) : null,
      costTHB: costText ? numberFromCell(costText) : null,
      imageName: cell(row, column.imageName) || undefined,
      images: cell(row, column.imageData)
        ? imagesFromCell(cell(row, column.imageData))
        : orderImages[sheet.id]?.[String(rowNumber)] ?? [],
      attributes,
    }
    currentOrder.lines.push(line)
    currentOrder.totalSales += line.salePrice
    currentOrder.bankTotal += line.bankAmount
    currentOrder.depositTotal += line.depositAmount
    currentOrder.quantity += line.quantity
  })

  const rowCount = Math.max(0, rows.length - 1)
  const hasMore = rowCount >= pageSize
  if (!hasMore && currentOrder?.lines.length) {
    orders.push(finalizeOrder(currentOrder))
    currentOrder = undefined
  }

  return {
    orders: orders.filter((order) => order.lines.length > 0),
    hasMore,
    nextOffset: hasMore ? offset + rowCount : null,
    parserState: hasMore ? { currentDay, currentOrder } : undefined,
  }
}

export function parseOrdersFromCsv(csv: string, sheet: SheetDefinition): SheetOrder[] {
  return parseOrdersPage(csv, sheet, 0, undefined, Number.MAX_SAFE_INTEGER).orders
}

async function fetchCsvWithRetry(url: string, signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError')
  const cached = sheetPageCsvCache.get(url)
  if (cached && cached.expiresAt > Date.now()) return cached.csv
  if (cached) sheetPageCsvCache.delete(url)

  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, { signal, cache: 'no-store' })
      if (response.ok) {
        const csv = await response.text()
        sheetPageCsvCache.set(url, { csv, expiresAt: Date.now() + SHEET_PAGE_CACHE_TTL_MS })
        if (sheetPageCsvCache.size > SHEET_PAGE_CACHE_MAX_ENTRIES) {
          const oldestKey = sheetPageCsvCache.keys().next().value
          if (oldestKey) sheetPageCsvCache.delete(oldestKey)
        }
        return csv
      }
      const responseDetails = await response.json().catch(() => null) as { error?: string } | null
      lastError = new Error(responseDetails?.error || `Spreadsheet request failed (${response.status})`)
      if (response.status < 500 && response.status !== 429) break
    } catch (cause) {
      if (signal?.aborted) throw cause
      lastError = cause
    }
    if (attempt < 1) {
      const delay = Math.min(900 * (2 ** attempt) + Math.random() * 350, 2_500)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Spreadsheet request failed.')
}

export async function fetchSheetOrdersPage(
  sheet: SheetDefinition,
  offset = 0,
  parserState?: SheetOrderParserState,
  signal?: AbortSignal,
  pageSize = 120,
): Promise<SheetOrderPage> {
  const params = new URLSearchParams({ gid: sheet.gid, offset: String(offset), limit: String(pageSize) })
  const url = `/api/sheets?${params.toString()}`
  return parseOrdersPage(await fetchCsvWithRetry(url, signal), sheet, offset, parserState, pageSize)
}

export async function fetchSheetOrders(sheet: SheetDefinition, signal?: AbortSignal): Promise<SheetOrder[]> {
  const orders: SheetOrder[] = []
  let offset = 0
  let parserState: SheetOrderParserState | undefined
  let hasMore = true
  while (hasMore) {
    const page = await fetchSheetOrdersPage(sheet, offset, parserState, signal)
    orders.push(...page.orders)
    hasMore = page.hasMore
    parserState = page.parserState
    offset = page.nextOffset ?? offset
  }
  return orders
}

export async function fetchAllSheets(signal?: AbortSignal, sheets: SheetDefinition[] = SHEETS): Promise<Record<string, SheetDataState>> {
  const results: Record<string, SheetDataState> = {}
  let nextIndex = 0
  const worker = async () => {
    while (nextIndex < sheets.length) {
      const sheet = sheets[nextIndex]
      nextIndex += 1
      try {
        const page = await fetchSheetOrdersPage(sheet, 0, undefined, signal)
        results[sheet.id] = {
          orders: page.orders,
          hasMore: page.hasMore,
          nextOffset: page.nextOffset ?? undefined,
          parserState: page.parserState,
        }
      } catch (cause) {
        if (signal?.aborted) throw cause
        results[sheet.id] = { orders: [], error: cause instanceof Error ? cause.message : 'Sheet request failed.' }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(2, sheets.length) }, worker))
  return results
}


export function formatOrderDate(day: string, sheet: SheetDefinition, locale: string) {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (isoMatch) {
    const date = new Date(Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3])))
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date)
  }
  const value = Number(day)
  if (Number.isFinite(value) && value >= 30000) {
    const date = new Date(Date.UTC(1899, 11, 30) + value * 86_400_000)
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date)
  }
  if (Number.isFinite(value) && value > 0 && value <= 31) {
    const monthIndex: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, june: 5, july: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }
    const date = new Date(Date.UTC(sheet.year, monthIndex[sheet.monthKey] ?? 0, 1))
    const month = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(date)
    return `${value} ${month}`
  }
  return day || '—'
}
