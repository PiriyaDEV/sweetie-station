import { orderImages } from './orderImages'

export type SheetDefinition = {
  id: string
  gid: string
  titleKey: string
  kind: 'sales' | 'haul'
  monthKey: string
  year: number
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
  bankTotal: number
  depositTotal: number
  profitAmount: number | null
  profitPercent: number | null
  quantity: number
  isLocal?: boolean
  isOverride?: boolean
}

export type SheetDataState = {
  orders: SheetOrder[]
  error?: string
}

const SHEET_ID = '1Y5z_jWtQd5-dxG_hWQlHYWNWtR4giR6k8tAwpmqRF5w'

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

export function parseOrdersFromCsv(csv: string, sheet: SheetDefinition): SheetOrder[] {
  const rows = parseCsv(csv)
  if (rows.length < 2) return []

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
  }
  const baseColumns = new Set(Object.values(column).filter((index) => index >= 0))
  const orders: SheetOrder[] = []
  let currentOrder: SheetOrder | undefined
  let currentDay = ''

  rows.slice(1).forEach((row, index) => {
    const rowNumber = index + 2
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
    if (date) currentDay = date

    if (lineName) {
      currentOrder = {
        id: String(rowNumber),
        sheetRow: rowNumber,
        day: currentDay,
        lineName,
        customerName,
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
      orders.push(currentOrder)
    }

    if (!currentOrder) return

    const paymentStatus = row.find((value) => ['จ่ายเต็ม', 'มัดจำ'].includes(value.trim()))?.trim() ?? ''
    const shippingStatus = row.find((value) => ['รอเข้าไทย', 'ส่งแล้ว'].includes(value.trim()))?.trim() ?? ''
    if (paymentStatus) currentOrder.paymentStatus = paymentStatus
    if (shippingStatus) currentOrder.shippingStatus = shippingStatus

    const attributes = headers.flatMap((header, columnIndex) => {
      const value = cell(row, columnIndex)
      return header && !baseColumns.has(columnIndex) && value
        ? [{ key: header, value }]
        : []
    })

    const hasLineData = Boolean(lineName || customerName || itemName || quantityText || bankText || depositText)
    // Summary rows only contain a total in the price column; they are not order lines.
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
      images: orderImages[sheet.id]?.[String(rowNumber)] ?? [],
      attributes,
    }
    currentOrder.lines.push(line)
    currentOrder.totalSales += line.salePrice
    currentOrder.bankTotal += line.bankAmount
    currentOrder.depositTotal += line.depositAmount
    currentOrder.quantity += line.quantity
  })

  orders.forEach((order) => {
    const hasProfitForEveryLine = order.lines.length > 0 && order.lines.every((line) => line.profitAmount !== null)
    order.profitAmount = hasProfitForEveryLine ? order.lines.reduce((sum, line) => sum + (line.profitAmount ?? 0), 0) : null
    order.profitPercent = hasProfitForEveryLine && order.totalSales > 0 ? ((order.profitAmount ?? 0) / order.totalSales) * 100 : null
  })

  return orders.filter((order) => order.lines.length > 0)
}

async function fetchCsvWithRetry(url: string, signal?: AbortSignal) {
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal, cache: 'no-store' })
      if (response.ok) return await response.text()
      lastError = new Error(`Spreadsheet request failed (${response.status})`)
      if (response.status < 500 && response.status !== 429) break
    } catch (cause) {
      if (signal?.aborted) throw cause
      lastError = cause
    }
    if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 350 * (attempt + 1)))
  }
  throw lastError instanceof Error ? lastError : new Error('Spreadsheet request failed.')
}

export async function fetchSheetOrders(sheet: SheetDefinition, signal?: AbortSignal): Promise<SheetOrder[]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${sheet.gid}`
  return parseOrdersFromCsv(await fetchCsvWithRetry(url, signal), sheet)
}

export async function fetchAllSheets(signal?: AbortSignal): Promise<Record<string, SheetDataState>> {
  const results: Record<string, SheetDataState> = {}
  let nextIndex = 0
  const worker = async () => {
    while (nextIndex < SHEETS.length) {
      const sheet = SHEETS[nextIndex]
      nextIndex += 1
      try {
        results[sheet.id] = { orders: await fetchSheetOrders(sheet, signal) }
      } catch (cause) {
        if (signal?.aborted) throw cause
        results[sheet.id] = { orders: [], error: cause instanceof Error ? cause.message : 'Sheet request failed.' }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, SHEETS.length) }, worker))
  return results
}

export function formatOrderDate(day: string, sheet: SheetDefinition, locale: string) {
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
