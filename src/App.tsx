import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type InputHTMLAttributes } from 'react'
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  ImagePlus,
  LayoutGrid,
  LayoutList,
  Languages,
  LoaderCircle,
  LogOut,
  Minus,
  Pencil,
  Plane,
  Plus,
  Receipt,
  RefreshCw,
  Rows3,
  Search,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import sweetieLogo from './assets/sweetie-logo.webp'
import { LineAvatar, LineContactsProvider, LineNameField } from './lineContacts'
import { BottomNavigation, ImagePreviewDialog, ProductImage, ScreenHeader, SkeletonLine, Sparkle, StatusBadge } from './ui/components'
import { Dropdown } from './ui/Dropdown'
import { useDialogAccessibility } from './ui/hooks'
import { orderMatchesStatus, paymentBadgeClass, paymentStatusLabel, shippingBadgeClass, shippingStatusLabel, statusFilterEmoji, statusFilterLabel, STATUS_FILTERS } from './ui/status'

const AnalyticsChart = lazy(() => import('./AnalyticsChart'))
const salesCategoryImage = new URL('./assets/0065ab6781eed4ec716c07294dbb3933.PNG', import.meta.url).href
const haulCategoryImage = new URL('./assets/haul-category.png', import.meta.url).href
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router'
import {
  fetchAllSheets,
  fetchSheetOrders,
  fetchSheetOrdersPage,
  clearSheetPageCache,
  formatOrderDate,
  SHEETS,
  type SheetDataState,
  type SheetDefinition,
  type SheetOrder,
  type SheetOrderLine,
  type MonthlyExpense,
} from './sheet'

type DraftLine = {
  itemName: string
  quantity: string
  salePrice: string
  bankAmount: string
  depositAmount: string
  image: string
  images: string[]
  imageName: string
  imageIsNew: boolean
  attributes: SheetOrderLine['attributes']
  originalSalePrice?: number
  originalProfitAmount?: number | null
  originalProfitPercent?: number | null
  costRMB: string
  originalCostRMB?: number | null
  originalExchangeRate?: number
}

type OrderDraft = {
  lineName: string
  lineUserId: string
  customerName: string
  day: string
  exchangeRate: string
  isCampaign: boolean
  campaignDiscount: string
  paymentStatus: string
  shippingStatus: string
  lines: DraftLine[]
}

const LOCAL_ORDERS_KEY = 'sweetie-local-orders-v1'
const LOCAL_SHEETS_KEY = 'sweetie-local-sheets-v1'
const MONTHLY_EXPENSES_KEY = 'sweetie-monthly-expenses-v1'
const MONTHLY_EXPENSE_REVISIONS_KEY = 'sweetie-monthly-expense-revisions-v1'
const EXCHANGE_RATE_KEY = 'sweetie-cny-thb-rate-v1'
const DEFAULT_CNY_TO_THB = 5.02
const EMPTY_ORDERS: SheetOrder[] = []
const HOME_SHEET_BATCH_SIZE = 100
const MONTH_INDEX: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, june: 5, july: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }
type ImageChoice = { url: string; label: string; itemName: string; salePrice: number }


type NumericInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'inputMode' | 'pattern'> & {
  value: string
  onValueChange: (value: string) => void
  integer?: boolean
  minValue?: number
  maxValue?: number
}

function NumericInput({ value, onValueChange, integer = false, minValue, maxValue, onBlur, ...props }: NumericInputProps) {
  const number = Number(value)
  const outOfRange = value !== '' && (!Number.isFinite(number) || (minValue !== undefined && number < minValue) || (maxValue !== undefined && number > maxValue))
  return <input
    {...props}
    type="text"
    inputMode={integer ? 'numeric' : 'decimal'}
    pattern={integer ? '\\d*' : '\\d*(?:[.,]\\d*)?'}
    value={value}
    aria-invalid={outOfRange || undefined}
    onChange={(event) => {
      const normalized = event.target.value.replace(',', '.')
      if ((integer ? /^\d*$/ : /^\d*(?:\.\d*)?$/).test(normalized)) onValueChange(normalized)
      event.currentTarget.setCustomValidity('')
    }}
    onBlur={(event) => {
      if (outOfRange) event.currentTarget.setCustomValidity('Enter a value within the allowed range.')
      else event.currentTarget.setCustomValidity('')
      onBlur?.(event)
    }}
  />
}

function usePullToRefresh(rootRef: { current: HTMLDivElement | null }, refreshing: boolean, onRefresh: () => void) {
  const [pullDistance, setPullDistance] = useState(0)
  const distanceRef = useRef(0)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let startY: number | null = null

    const resetPull = () => {
      startY = null
      distanceRef.current = 0
      setPullDistance(0)
    }
    const onTouchStart = (event: TouchEvent) => {
      if (refreshing || root.scrollTop > 0) return
      startY = event.touches[0]?.clientY ?? null
    }
    const onTouchMove = (event: TouchEvent) => {
      if (startY === null || refreshing) return
      const currentY = event.touches[0]?.clientY
      if (currentY === undefined) return
      const delta = currentY - startY
      if (delta <= 0 || root.scrollTop > 0) {
        resetPull()
        return
      }
      event.preventDefault()
      const nextDistance = Math.min(88, delta * 0.55)
      distanceRef.current = nextDistance
      setPullDistance(nextDistance)
    }
    const onTouchEnd = () => {
      if (startY === null) return
      const shouldRefresh = distanceRef.current >= 58 && !refreshing
      resetPull()
      if (shouldRefresh) onRefresh()
    }
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || refreshing || root.scrollTop > 0) return
      startY = event.clientY
    }
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || startY === null || refreshing || event.buttons === 0) return
      const delta = event.clientY - startY
      if (delta <= 0 || root.scrollTop > 0) {
        resetPull()
        return
      }
      event.preventDefault()
      // Capture only once a real drag starts, so plain clicks still reach buttons in the list.
      if (delta > 6 && !root.hasPointerCapture(event.pointerId)) {
        try { root.setPointerCapture(event.pointerId) } catch { /* Pointer capture is optional. */ }
      }
      const nextDistance = Math.min(88, delta * 0.55)
      distanceRef.current = nextDistance
      setPullDistance(nextDistance)
    }

    root.addEventListener('touchstart', onTouchStart, { passive: true })
    root.addEventListener('touchmove', onTouchMove, { passive: false })
    root.addEventListener('touchend', onTouchEnd)
    root.addEventListener('touchcancel', onTouchEnd)
    root.addEventListener('pointerdown', onPointerDown)
    root.addEventListener('pointermove', onPointerMove, { passive: false })
    root.addEventListener('pointerup', onTouchEnd)
    root.addEventListener('pointercancel', onTouchEnd)
    return () => {
      root.removeEventListener('touchstart', onTouchStart)
      root.removeEventListener('touchmove', onTouchMove)
      root.removeEventListener('touchend', onTouchEnd)
      root.removeEventListener('touchcancel', onTouchEnd)
      root.removeEventListener('pointerdown', onPointerDown)
      root.removeEventListener('pointermove', onPointerMove)
      root.removeEventListener('pointerup', onTouchEnd)
      root.removeEventListener('pointercancel', onTouchEnd)
    }
  }, [onRefresh, refreshing, rootRef])

  return pullDistance
}

function PullToRefreshIndicator({ distance, refreshing }: { distance: number; refreshing: boolean }) {
  const { t } = useTranslation()
  const armed = distance >= 58
  const height = refreshing ? 44 : Math.min(48, distance)
  return (
    <div
      className="pull-indicator flex shrink-0 items-center justify-center gap-2 overflow-hidden text-xs font-semibold transition-[height] duration-150"
      style={{ height }}
      role="status"
      aria-live="polite"
      aria-hidden={!refreshing && distance === 0}
    >
      <RefreshCw size={16} className={refreshing ? 'animate-spin' : armed ? 'rotate-180 transition-transform' : 'transition-transform'} />
      <span>{refreshing ? t('orders.refreshing') : armed ? t('orders.releaseToRefresh') : t('orders.pullToRefresh')}</span>
    </div>
  )
}

function formatMoney(value: number, language: string) {
  return new Intl.NumberFormat(language === 'th' ? 'th-TH' : 'en-US', {
    maximumFractionDigits: 2,
  }).format(value)
}

function csvCell(value: string | number | null | undefined) {
  let text = value == null ? '' : String(value)
  if (typeof value === 'string' && /^[\s]*[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

function downloadFile(fileName: string, contents: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: mimeType }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function formatProfitPercent(value: number, language: string) {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${formatMoney(Math.abs(value), language)}%`
}

function loadLocalOrders(): Record<string, SheetOrder[]> {
  try {
    const saved = localStorage.getItem(LOCAL_ORDERS_KEY)
    return saved ? JSON.parse(saved) as Record<string, SheetOrder[]> : {}
  } catch {
    return {}
  }
}

function loadLocalSheets(): SheetDefinition[] {
  try {
    const saved = localStorage.getItem(LOCAL_SHEETS_KEY)
    return saved ? JSON.parse(saved) as SheetDefinition[] : []
  } catch {
    return []
  }
}

function loadMonthlyExpenses(): Record<string, MonthlyExpense[]> {
  try {
    const saved = localStorage.getItem(MONTHLY_EXPENSES_KEY)
    return saved ? JSON.parse(saved) as Record<string, MonthlyExpense[]> : {}
  } catch {
    return {}
  }
}

function loadMonthlyExpenseRevisions(): Record<string, number> {
  try {
    const saved = localStorage.getItem(MONTHLY_EXPENSE_REVISIONS_KEY)
    return saved ? JSON.parse(saved) as Record<string, number> : {}
  } catch {
    return {}
  }
}

function mergeMonthlyExpensesByRevision(
  server: Record<string, MonthlyExpense[]>,
  serverRevisions: Record<string, number>,
  device: Record<string, MonthlyExpense[]>,
  deviceRevisions: Record<string, number>,
) {
  const sheetIds = new Set([...Object.keys(server), ...Object.keys(device)])
  return Object.fromEntries([...sheetIds].map((sheetId) => {
    const useDevice = (deviceRevisions[sheetId] ?? 0) > (serverRevisions[sheetId] ?? 0)
    return [sheetId, useDevice ? device[sheetId] ?? [] : server[sheetId] ?? device[sheetId] ?? []]
  }))
}

function loadExchangeRate() {
  try {
    const saved = Number(localStorage.getItem(EXCHANGE_RATE_KEY))
    return Number.isFinite(saved) && saved > 0 ? saved : DEFAULT_CNY_TO_THB
  } catch {
    return DEFAULT_CNY_TO_THB
  }
}

function getOrderSortTimestamp(order: SheetOrder, sheet: SheetDefinition) {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(order.day)
  if (isoMatch) return Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]))
  const numericDay = Number(order.day)
  if (numericDay >= 30000) return Date.UTC(1899, 11, 30) + numericDay * 86_400_000
  if (numericDay > 0 && numericDay <= 31) return Date.UTC(sheet.year, MONTH_INDEX[sheet.monthKey], numericDay)
  const parsed = new Date(order.day)
  return Number.isNaN(parsed.getTime()) ? order.sheetRow : parsed.getTime()
}

function getCurrentDate() {
  return new Date()
}

function formatDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getCurrentMonthSheet(dataBySheet: Record<string, SheetDataState>, sheets: SheetDefinition[] = SHEETS): SheetDefinition {
  const now = getCurrentDate()
  const monthKey = ['jan', 'feb', 'mar', 'apr', 'may', 'june', 'july', 'aug', 'sep', 'oct', 'nov', 'dec'][now.getMonth()]
  const thisMonth = sheets.find((sheet) => sheet.kind === 'sales' && sheet.monthKey === monthKey && sheet.year === now.getFullYear())
  if (thisMonth) return thisMonth
  return [...sheets].filter((sheet) => sheet.kind === 'sales').sort((a, b) => a.year - b.year || MONTH_INDEX[a.monthKey] - MONTH_INDEX[b.monthKey]).reverse().find((sheet) => (dataBySheet[sheet.id]?.orders.length ?? 0) > 0) ?? sheets[0]
}

function sheetTitle(sheet: SheetDefinition, t: (key: string) => string) {
  return sheet.customName || t(sheet.titleKey)
}

const translatedFieldLabels: Record<string, string> = {
  'ส่วนลด': 'detailFields.discount',
  'ราคาจีน': 'detailFields.chinaPrice',
  'ต้นทุน(บาท)': 'detailFields.costTHB',
  'กำไร': 'detailFields.profit',
  'ค่าส่ง': 'detailFields.shipping',
  'ค่าส่งเก็บเพิ่มเติม': 'detailFields.extraShipping',
  'ค่าส่งเก็บเพิ่ม': 'detailFields.extraShipping',
  'ค่าสินค้า (Y)': 'detailFields.productCostY',
  'ค่าสินค้า (B)': 'detailFields.productCostB',
  'ต้นทุน(RMB)': 'detailFields.costRMB',
  'ต้นทุน(THB)': 'detailFields.costTHB',
  'ต้นทุน(หยวน)': 'detailFields.costRMB',
  'ค่าส่งจีน': 'detailFields.chinaShipping',
  'กำไรสุทธิ': 'detailFields.netProfit',
}

function fieldLabel(key: string, t: (key: string) => string) {
  const translationKey = translatedFieldLabels[key]
  return translationKey ? t(translationKey) : key
}


function SettingsPage({ onExportBackup, backupLoading, backupMessage, onExportDateRange, rangeExportLoading, rangeExportMessage, onLogout }: {
  onExportBackup: () => void
  backupLoading: boolean
  backupMessage: string
  onExportDateRange: (fromDate: string, toDate: string) => void
  rangeExportLoading: boolean
  rangeExportMessage: string
  onLogout: () => void
}) {
  const { i18n, t } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'
  const today = getCurrentDate()
  const [rangeTo, setRangeTo] = useState(() => formatDateInputValue(today))
  const [rangeFrom, setRangeFrom] = useState(() => {
    const yearAgo = new Date(today)
    yearAgo.setFullYear(yearAgo.getFullYear() - 1)
    return formatDateInputValue(yearAgo)
  })
  const canExportRange = Boolean(rangeFrom && rangeTo && rangeFrom <= rangeTo)

  const changeLanguage = (nextLanguage: string) => {
    void i18n.changeLanguage(nextLanguage)
    document.documentElement.lang = nextLanguage
    try {
      localStorage.setItem('sweetie-language', nextLanguage)
      localStorage.setItem('sweetie-language-user-selected', '1')
    } catch {
      // Language remains active for this app session if storage is unavailable.
    }
  }

  return (
    <section className="app-screen settings-screen" aria-label={t('settings.title')}>
      <ScreenHeader />
      <div className="screen-surface">
        <div className="surface-scroll">
          <div className="settings-brand"><img src={sweetieLogo} alt="" /><div><strong>Sweetie Station</strong><span>{t('settings.subtitle')}</span></div></div>
          <section className="settings-group">
            <h2 className="display">{t('settings.preferences')}</h2>
            <Dropdown variant="bar" className="info-bar" aria-label={t('settings.displayLanguage')} value={language} onChange={(event) => changeLanguage(event.target.value)} align="end"
              triggerContent={<><Languages size={21} /><span className="info-bar-text"><strong>{t('settings.displayLanguage')}</strong></span><span className="info-bar-value">{language === 'th' ? 'ไทย' : 'English'}</span><ChevronDown size={16} className="info-bar-end" /></>}>
              <option value="en">English</option>
              <option value="th">ไทย</option>
            </Dropdown>
          </section>
          <section className="settings-group">
            <h2 className="display">{t('settings.data')}</h2>
            <p>{t('settings.backupHint')}</p>
            <button type="button" className="info-bar" onClick={onExportBackup} disabled={backupLoading}>
              {backupLoading ? <LoaderCircle size={21} className="animate-spin" /> : <Download size={21} />}
              <span className="info-bar-text"><strong>{backupLoading ? t('backup.preparing') : t('backup.download')}</strong></span>
              <ChevronRight size={18} className="info-bar-end" />
            </button>
            {backupMessage && <small className="backup-status" role="status">{backupMessage}</small>}
            <div className="settings-range-export">
              <h3 className="display">{t('backup.rangeTitle')}</h3>
              <p>{t('backup.rangeHint')}</p>
              <div className="settings-date-range">
                <label className="field"><span>{t('backup.dateFrom')}</span><input className="input input-bordered" type="date" value={rangeFrom} max={rangeTo || undefined} onChange={(event) => setRangeFrom(event.target.value)} /></label>
                <label className="field"><span>{t('backup.dateTo')}</span><input className="input input-bordered" type="date" value={rangeTo} min={rangeFrom || undefined} max={formatDateInputValue(today)} onChange={(event) => setRangeTo(event.target.value)} /></label>
              </div>
              <button type="button" className="cta cta-small" onClick={() => onExportDateRange(rangeFrom, rangeTo)} disabled={rangeExportLoading || !canExportRange}>
                {rangeExportLoading ? <LoaderCircle size={19} className="animate-spin" /> : <Download size={19} />}
                {rangeExportLoading ? t('backup.rangePreparing') : t('backup.exportRange')}
              </button>
              {!canExportRange && <small className="backup-status" role="alert">{t('backup.invalidRange')}</small>}
              {rangeExportMessage && <small className="backup-status" role="status">{rangeExportMessage}</small>}
            </div>
          </section>
          <section className="settings-group">
            <h2 className="display">{t('settings.account')}</h2>
            <button type="button" className="info-bar danger" onClick={() => void onLogout()}>
              <LogOut size={21} />
              <span className="info-bar-text"><strong>{t('auth.logout')}</strong></span>
              <ChevronRight size={18} className="info-bar-end" />
            </button>
          </section>
        </div>
      </div>
      <BottomNavigation />
    </section>
  )
}

function SplashScreen({ showLoading = true }: { showLoading?: boolean }) {
  const { t } = useTranslation()

  return (
    <section className="app-screen splash-screen" aria-label={t('screen.splash')} aria-busy={showLoading}>
      <Sparkle className="sparkle-a" size={34} />
      <Sparkle className="sparkle-b" size={22} />
      <div className="splash-content">
        <img className="sweetie-mark-image" src={sweetieLogo} alt={t('splash.logoAlt')} />
        <p className="splash-tagline display">{t('splash.tagline')}</p>
      </div>
      {showLoading && <div className="splash-loading" role="status"><span className="splash-dots" aria-hidden="true"><span /><span /><span /></span><span>{t('splash.loading')}</span></div>}
    </section>
  )
}

function sheetTotal(orders: SheetOrder[]) {
  return orders.reduce((sum, order) => sum + order.totalSales, 0)
}

function getPreviewImages(orders: SheetOrder[], limit = 4) {
  const images = new Set<string>()
  for (const order of orders) {
    for (const line of order.lines) {
      for (const image of line.images) {
        if (image) images.add(image)
        if (images.size === limit) return [...images]
      }
    }
  }
  return [...images]
}

function mergeOrderOverrides(remoteOrders: SheetOrder[], localOrders: SheetOrder[]) {
  const localById = new Map(localOrders.map((order) => [order.id, order]))
  const remoteIds = new Set(remoteOrders.map((order) => order.id))
  return [
    ...localOrders.filter((order) => !remoteIds.has(order.id)),
    ...remoteOrders.map((order) => localById.get(order.id) ?? order),
  ]
}

function mergeSyncedOrderMaps(serverOrders: Record<string, SheetOrder[]>, deviceOrders: Record<string, SheetOrder[]>) {
  const sheetIds = new Set([...Object.keys(serverOrders), ...Object.keys(deviceOrders)])
  return Object.fromEntries([...sheetIds].map((sheetId) => {
    const merged = new Map((serverOrders[sheetId] ?? []).map((order) => [order.id, order]))
    for (const order of deviceOrders[sheetId] ?? []) {
      const existing = merged.get(order.id)
      if (!existing || (order.updatedAt ?? 0) > (existing.updatedAt ?? 0)) merged.set(order.id, order)
    }
    return [sheetId, [...merged.values()]]
  }))
}

function mergeLocalSheets(serverSheets: SheetDefinition[], deviceSheets: SheetDefinition[]) {
  const merged = new Map(serverSheets.map((sheet) => [sheet.id, sheet]))
  for (const sheet of deviceSheets) if (!merged.has(sheet.id)) merged.set(sheet.id, sheet)
  return [...merged.values()]
}

function getOrderDayNumber(order: SheetOrder) {
  const numericDay = Number(order.day)
  if (Number.isFinite(numericDay) && numericDay >= 30000) {
    return new Date(Date.UTC(1899, 11, 30) + numericDay * 86_400_000).getUTCDate()
  }
  if (Number.isFinite(numericDay) && numericDay > 0 && numericDay <= 31) return numericDay
  const parsedDate = new Date(order.day)
  if (!Number.isNaN(parsedDate.getTime())) return parsedDate.getUTCDate()
  return undefined
}

function sheetSalesThroughDay(orders: SheetOrder[], day: number) {
  return sheetTotal(orders.filter((order) => {
    const orderDay = getOrderDayNumber(order)
    return orderDay !== undefined && orderDay <= day
  }))
}

function getPaidTotal(order: SheetOrder) {
  return order.grossSales !== undefined ? order.bankTotal : order.bankTotal + order.depositTotal
}

function getDepositDue(order: SheetOrder, sales: number) {
  if (order.paymentStatus === 'จ่ายเต็ม') return 0
  const paid = getPaidTotal(order)
  if (paid > 0) return Math.max(0, sales - paid)
  if (!order.paymentStatus || order.paymentStatus === 'ยังไม่ได้ชำระ') return sales
  return null
}

function getProfitSummary(orders: SheetOrder[], monthlyExpenses = 0) {
  const lines = orders.flatMap((order) => order.lines)
  const knownProfitLines = lines.filter((line) => line.profitAmount !== null)
  const complete = lines.length > 0 && knownProfitLines.length === lines.length
  const campaignDiscountsForKnownOrders = orders.reduce((sum, order) => {
    const allLinesKnown = order.lines.length > 0 && order.lines.every((line) => line.profitAmount !== null)
    return sum + (allLinesKnown ? order.campaignDiscount ?? 0 : 0)
  }, 0)
  const knownProfit = knownProfitLines.reduce((sum, line) => sum + (line.profitAmount ?? 0), 0) - campaignDiscountsForKnownOrders
  return {
    amount: knownProfitLines.length ? knownProfit - (complete ? monthlyExpenses : 0) : null,
    knownLines: knownProfitLines.length,
    totalLines: lines.length,
    complete,
  }
}

function getPercentChange(current: number, previous: number | undefined) {
  if (previous === undefined || previous <= 0) return null
  return ((current - previous) / previous) * 100
}

function formatSignedPercent(value: number | null, language: string) {
  if (value === null) return '—'
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${formatMoney(Math.abs(value), language)}%`
}

function CreateSheetDialog({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (sheet: Omit<SheetDefinition, 'id' | 'gid' | 'titleKey'>) => Promise<void>
}) {
  const { t } = useTranslation()
  const now = getCurrentDate()
  const [name, setName] = useState('')
  const [kind, setKind] = useState<SheetDefinition['kind']>('sales')
  const [monthKey, setMonthKey] = useState(Object.keys(MONTH_INDEX)[now.getMonth()])
  const [year, setYear] = useState(String(now.getFullYear()))
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const dialogRef = useRef<HTMLElement | null>(null)
  const initialDraftSnapshot = useRef(JSON.stringify({ name, kind, monthKey, year }))
  const requestClose = () => {
    if (creating) return
    if (JSON.stringify({ name, kind, monthKey, year }) !== initialDraftSnapshot.current && !window.confirm(t('createSheet.discardUnsaved'))) return
    onClose()
  }
  useDialogAccessibility(dialogRef, requestClose)
  const previewName = name.trim() || t('createSheet.namePlaceholder')

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const yearValue = Number(year)
    if (!name.trim() || !Number.isInteger(yearValue) || yearValue < 2000 || yearValue > 2100) {
      setError(t('createSheet.validation'))
      return
    }
    setCreating(true)
    setError('')
    try {
      await onCreate({ customName: name.trim(), kind, monthKey, year: yearValue })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('createSheet.createError'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) requestClose() }}>
      <section className="create-order-modal create-sheet-modal" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="create-sheet-heading">
        <header className="modal-header">
          <div><p>{t('sheets.kicker')}</p><h2 id="create-sheet-heading" tabIndex={-1}>{t('createSheet.title')}</h2></div>
          <button type="button" className="modal-close" data-dialog-initial-focus onClick={requestClose} aria-label={t('createSheet.close')} disabled={creating}><X size={20} /></button>
        </header>
        <form className="order-form" onSubmit={submit}>
          <label><span className="field-label">{t('createSheet.name')} <span className="required-star">*</span></span><input value={name} onChange={(event) => { setName(event.target.value); setError('') }} required autoFocus placeholder={t('createSheet.namePlaceholder')} /></label>
          <div className="form-grid two-columns">
            <label>{t('filters.sheetType')}<Dropdown className="field-trigger" value={kind} onChange={(event) => setKind(event.target.value as SheetDefinition['kind'])}><option value="sales">{t('sheets.kind.sales')}</option><option value="haul">{t('sheets.kind.haul')}</option></Dropdown></label>
            <label>{t('createSheet.month')}<Dropdown className="field-trigger" value={monthKey} onChange={(event) => setMonthKey(event.target.value)}>{Object.keys(MONTH_INDEX).map((key) => <option key={key} value={key}>{t(`sheets.${key}`)}</option>)}</Dropdown></label>
          </div>
          <label className="year-field"><span className="field-label">{t('createSheet.year')} <span className="required-star">*</span></span><NumericInput integer minValue={2000} maxValue={2100} value={year} onValueChange={setYear} required /></label>
          <section className="create-sheet-preview" aria-live="polite">
            <span className={`create-sheet-preview-thumb ${kind}`} aria-hidden="true">{kind === 'haul' ? <Plane size={26} /> : <ShoppingBag size={26} />}</span>
            <span>{t('createSheet.preview')}</span>
            <strong>{previewName}</strong>
            <small>{t(`sheets.kind.${kind}`)} · {t(`sheets.${monthKey}`)} {year || now.getFullYear()}</small>
          </section>
          <p className="create-sheet-destination">{t('createSheet.destination')}</p>
          <p className="local-save-note">{t('createSheet.localOnly')}</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <footer className="modal-actions">
            <button type="button" className="cancel-order-button btn btn-ghost" onClick={requestClose} disabled={creating}>{t('createOrder.cancel')}</button>
            <button type="submit" className="save-order-button btn btn-primary" disabled={creating}>{creating ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />} {creating ? t('createSheet.creating') : t('createSheet.create')}</button>
          </footer>
        </form>
      </section>
    </div>
  )
}

function HomePage({
  dataBySheet,
  monthlyExpensesBySheet,
  sheets,
  loading,
  refreshing,
  onRefresh,
  onCreateSheet,
}: {
  dataBySheet: Record<string, SheetDataState>
  monthlyExpensesBySheet: Record<string, MonthlyExpense[]>
  sheets: SheetDefinition[]
  loading: boolean
  refreshing: boolean
  onRefresh: () => void
  onCreateSheet: (sheet: Omit<SheetDefinition, 'id' | 'gid' | 'titleKey'>) => Promise<SheetDefinition>
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const language = i18n.resolvedLanguage ?? 'en'
  const [query, setQuery] = useState('')
  const [kindFilter, setKindFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('month')
  const [sheetControlsOpen, setSheetControlsOpen] = useState(false)
  const [createSheetOpen, setCreateSheetOpen] = useState(false)
  const scrollRootRef = useRef<HTMLDivElement>(null)
  const pullDistance = usePullToRefresh(scrollRootRef, refreshing, onRefresh)

  const sheetRows = sheets.map((sheet, index) => {
    const orders = dataBySheet[sheet.id]?.orders ?? EMPTY_ORDERS
    const expenses = monthlyExpensesBySheet[sheet.id] ?? []
    const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    return { sheet, index, orders, error: dataBySheet[sheet.id]?.error, profit: getProfitSummary(orders, expenseTotal) }
  })
  const visibleSheets = sheetRows
    .filter(({ sheet }) => kindFilter === 'all' || sheet.kind === kindFilter)
    .filter(({ sheet }) => sheetTitle(sheet, t).toLocaleLowerCase().includes(query.toLocaleLowerCase()))
    .filter(({ orders }) => statusFilter === 'all' || orders.some((order) => {
      if (statusFilter === 'paid') return order.paymentStatus === 'จ่ายเต็ม'
      if (statusFilter === 'unpaid') return order.paymentStatus === 'ยังไม่ได้ชำระ'
      if (statusFilter === 'deposit') return order.paymentStatus === 'มัดจำ'
      if (statusFilter === 'shipped') return order.shippingStatus === 'ส่งแล้ว'
      if (statusFilter === 'not-ordered') return order.shippingStatus === 'ยังไม่ได้สั่ง'
      if (statusFilter === 'ordered') return order.shippingStatus === 'สั่งแล้ว'
      if (statusFilter === 'inbound') return order.shippingStatus === 'รอเข้าไทย'
      if (statusFilter === 'unlisted') return !order.paymentStatus && !order.shippingStatus
      return true
    }))
    .sort((a, b) => {
      if (sortBy === 'sales-desc') return sheetTotal(b.orders) - sheetTotal(a.orders)
      if (sortBy === 'sales-asc') return sheetTotal(a.orders) - sheetTotal(b.orders)
      if (sortBy === 'orders-desc') return b.orders.length - a.orders.length
      if (sortBy === 'name') return sheetTitle(a.sheet, t).localeCompare(sheetTitle(b.sheet, t))
      return a.index - b.index
    })
  const activeFilterCount = [Boolean(query.trim()), kindFilter !== 'all', statusFilter !== 'all', sortBy !== 'month'].filter(Boolean).length

  const currentSheetId = getCurrentMonthSheet(dataBySheet, sheets).id
  const chips = [
    { key: 'all', label: t('sheets.chips.all'), active: kindFilter === 'all' && statusFilter === 'all', icon: <LayoutGrid size={28} />, count: sheets.length, onSelect: () => { setKindFilter('all'); setStatusFilter('all') } },
    { key: 'sales', label: t('sheets.chips.sales'), active: kindFilter === 'sales' && statusFilter === 'all', image: salesCategoryImage, onSelect: () => { setKindFilter('sales'); setStatusFilter('all') } },
    { key: 'haul', label: t('sheets.chips.haul'), active: kindFilter === 'haul' && statusFilter === 'all', image: haulCategoryImage, onSelect: () => { setKindFilter('haul'); setStatusFilter('all') } },
    { key: 'unpaid', label: t('sheets.chips.unpaid'), active: statusFilter === 'unpaid', icon: <WalletCards size={28} />, onSelect: () => { setKindFilter('all'); setStatusFilter('unpaid') } },
  ]
  const sortOptions = [
    { value: 'month', label: t('filters.monthOrder') },
    { value: 'sales-desc', label: t('filters.salesHighShort') },
    { value: 'orders-desc', label: t('filters.ordersHigh') },
    { value: 'name', label: t('filters.nameAZShort') },
  ]

  return (
    <section className="app-screen home-screen sheets-home-screen" aria-label={t('screen.home')}>
      <ScreenHeader
        actions={<>
          <button type="button" className={`icon-button${sheetControlsOpen ? ' is-active' : ''}`} aria-expanded={sheetControlsOpen} aria-controls="sheet-list-controls" aria-label={t(sheetControlsOpen ? 'sheets.hideControls' : 'sheets.showControls')} onClick={() => setSheetControlsOpen((open) => !open)}>
            {sheetControlsOpen ? <X size={24} /> : <Search size={24} />}
            {!sheetControlsOpen && activeFilterCount > 0 && <span className="icon-badge" aria-label={t('filters.activeCount', { count: activeFilterCount })}>{activeFilterCount}</span>}
          </button>
          <button type="button" className="icon-button" aria-label={t('nav.settings')} onClick={() => navigate('/admin/settings')}><UserRound size={24} /></button>
        </>}
      />

      <div className="screen-surface has-dock">
        <div className="surface-scroll overscroll-y-contain" ref={scrollRootRef}>
          <PullToRefreshIndicator distance={pullDistance} refreshing={refreshing} />
          {sheetControlsOpen && <div className="search-panel" id="sheet-list-controls" aria-label={t('filters.sheetControls')}>
            <label className="search-field" id="sheet-search">
              <Search size={18} />
              <span className="sr-only">{t('sheets.search')}</span>
              <input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('sheets.search')} />
            </label>
            <div className="pill-row" role="group" aria-label={t('filters.sortSheets')}>
              {sortOptions.map((option) => <button type="button" className="pill" key={option.value} aria-pressed={sortBy === option.value} onClick={() => setSortBy(option.value)}>{option.label}</button>)}
              <Dropdown variant="pill" align="end" aria-label={t('filters.status')} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  {STATUS_FILTERS.map((filter) => <option key={filter} value={filter}>{statusFilterLabel(filter, t)}</option>)}
                </Dropdown>
              {activeFilterCount > 0 && <button type="button" className="pill" onClick={() => { setQuery(''); setKindFilter('all'); setStatusFilter('all'); setSortBy('month') }}>{t('filters.clear')}</button>}
            </div>
          </div>}

          <div className="chip-row" role="group" aria-label={t('filters.sheetType')}>
            {chips.map((chip) => (
              <button type="button" className={`chip${chip.active ? ' active' : ''}`} key={chip.key} aria-pressed={chip.active} onClick={chip.onSelect}>
                <span className={`chip-media${chip.icon || !chip.image ? ' is-icon' : ''}`}>
                  {chip.icon ?? (chip.image ? <img src={chip.image} alt="" loading="lazy" /> : <CalendarDays size={26} />)}
                  {chip.count !== undefined && <span className="chip-count">{chip.count}</span>}
                </span>
                <span className="chip-label">{chip.label}</span>
              </button>
            ))}
          </div>

          <div className="section-head">
            <h2 className="display">{t('sheets.chooseMonth')}</h2>
            <span>{t('sheets.sheetCountShort', { count: visibleSheets.length })}</span>
          </div>

          {loading && Object.keys(dataBySheet).length === 0 ? <div className="product-grid" aria-label={t('sheet.loading')} aria-busy="true">
            {Array.from({ length: 4 }, (_, index) => <div className="grid gap-2" key={index} aria-hidden="true"><SkeletonLine className="aspect-square w-full rounded-[28px]" /><SkeletonLine className="h-5 w-3/4" /><SkeletonLine className="h-3 w-1/2" /><SkeletonLine className="h-5 w-2/3" /></div>)}
          </div> : <div className="product-grid">
            {visibleSheets.map(({ sheet, orders, error, profit }) => {
              const sheetState = dataBySheet[sheet.id]
              const images = getPreviewImages(orders, 3)
              const unpaid = orders.filter((order) => order.paymentStatus === 'ยังไม่ได้ชำระ').length
              const isSheetIncomplete = Boolean(!error && sheetState?.hasMore && !sheetState.loadMoreError)
              const orderCountLabel = error ? t('sheet.errorShort') : sheetState?.loadMoreError ? `${t('sheets.partialOrderCount', { count: orders.length })} · ${t('sheets.loadMoreFailed')}` : isSheetIncomplete ? `${t('sheets.partialOrderCount', { count: orders.length })} · ${t('sheets.loadingMore')}` : t('sheets.orderCount', { count: orders.length })
              const profitTone = profit.amount === null ? ' unavailable' : profit.amount < 0 ? ' negative' : ''
              return (
                <button
                  type="button"
                  className="product-card"
                  key={sheet.id}
                  onClick={() => navigate(`/admin/sheets/${sheet.id}`, { state: { from: 'home' } })}
                  disabled={isSheetIncomplete}
                  aria-label={`${sheetTitle(sheet, t)} · ${orders.length} ${t('orders.orders')}`}
                  aria-busy={isSheetIncomplete}
                >
                  <span className={`product-media ${sheet.kind}`}>
                    <span className={`product-collage count-${Math.max(1, images.length)}`} aria-hidden="true">{images.length > 0 ? images.map((image, index) => <ProductImage key={`${sheet.id}-${index}`} src={image} alt="" />) : <ProductImage alt="" />}</span>
                    {sheet.kind === 'haul' && <span className="product-tag haul">{t(`sheets.kind.${sheet.kind}`)}</span>}
                    {sheet.id === currentSheetId && <span title={t('sheets.current')}><Sparkle size={26} /></span>}
                    <span className="product-fab" aria-hidden="true">{sheet.kind === 'haul' ? <Plane size={19} /> : <ShoppingBag size={19} />}</span>
                  </span>
                  <span className="product-title display">{sheetTitle(sheet, t)}</span>
                  <span className="product-meta">
                    {orderCountLabel}
                    {unpaid > 0 && <> · <b>{t('sheets.unpaidCount', { count: unpaid })}</b></>}
                  </span>
                  <span className="product-price display">{error ? '—' : isSheetIncomplete ? <SkeletonLine className="h-6 w-28 rounded-md" /> : `${formatMoney(sheetTotal(orders), language)} THB`}</span>
                  <span className={`profit-chip${isSheetIncomplete ? ' unavailable' : profitTone}`} aria-busy={isSheetIncomplete}>
                    {isSheetIncomplete ? <SkeletonLine className="h-3 w-32 rounded-full" /> : <>{t(profit.amount !== null && !profit.complete ? 'sheets.partialProfit' : 'sheets.profit')} {profit.amount === null ? '—' : `${profit.amount > 0 ? '+' : ''}${formatMoney(profit.amount, language)} THB`}</>}
                  </span>
                </button>
              )
            })}
            {visibleSheets.length === 0 && <p className="sheet-message">{t('sheets.noMatch')}</p>}
          </div>}
        </div>
        <div className="action-dock">
          <button type="button" className="cta cta-icon-only" aria-label={t('createSheet.open')} title={t('createSheet.open')} onClick={() => setCreateSheetOpen(true)}><Plus size={24} aria-hidden="true" /></button>
        </div>
      </div>
      <BottomNavigation />
      {createSheetOpen && <CreateSheetDialog onClose={() => setCreateSheetOpen(false)} onCreate={async (sheet) => { const created = await onCreateSheet(sheet); setCreateSheetOpen(false); navigate(`/admin/sheets/${created.id}`, { state: { from: 'home' } }) }} />}
    </section>
  )
}

function OrderListRow({ order, sheet, compact = false }: { order: SheetOrder; sheet: SheetDefinition; compact?: boolean }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const language = i18n.resolvedLanguage ?? 'en'
  const [previewImage, setPreviewImage] = useState<{ src?: string; alt: string } | null>(null)
  const profitTone = order.profitAmount === null ? ' unavailable' : order.profitAmount < 0 ? ' negative' : ''
  const openOrder = () => navigate(`/admin/sheets/${sheet.id}/orders/${order.id}`)
  return <>
    <article className={`order-card${compact ? ' compact' : ''}`}>
      <button
        type="button"
        className="order-card-head"
        onClick={openOrder}
        aria-label={`${t('orders.open')} ${order.customerName || order.lineName} · ${t('orders.profit')}: ${order.profitAmount === null ? '—' : `${formatMoney(order.profitAmount, language)} THB`}`}
      >
        <span className="order-avatar" aria-hidden="true"><LineAvatar lineName={order.lineName || order.customerName} lineUserId={order.lineUserId} size={compact ? 17 : 21} initials /></span>
        <span className="order-card-main">
          <span className="cart-title display">{order.customerName || order.lineName}</span>
          <span className="cart-sub">{order.lineName} · {formatOrderDate(order.day, sheet, language)} · {t('detail.quantity', { count: order.quantity, unit: order.quantity === 1 ? t('detail.piece') : t('detail.pieces') })}</span>
        </span>
        <span className="order-card-total">
          <span className="cart-price display">{formatMoney(order.totalSales, language)}<small> THB</small></span>
          <span className={`profit-chip${profitTone}`}>{t('orders.profit')} {order.profitAmount === null ? '—' : `${order.profitAmount > 0 ? '+' : ''}${formatMoney(order.profitAmount, language)} THB`}</span>
        </span>
        <span className="cart-badges order-card-badges">
          <StatusBadge type="payment" status={order.paymentStatus} />
          <StatusBadge type="shipping" status={order.shippingStatus} />
        </span>
      </button>
      {!compact && order.lines.length > 0 && <ul className="order-item-list" aria-label={t('detail.items')}>
        {order.lines.map((line, index) => {
          const itemName = line.itemName || t('detail.itemNumber', { number: index + 1 })
          const unitProfit = line.profitAmount === null ? null : line.profitAmount / Math.max(1, line.quantity)
          return <li className="order-item" key={`${order.id}-${line.row || index}`}>
            <button type="button" className="order-item-photo image-preview-trigger" aria-label={`${t('detail.previewImage')}: ${itemName}`} onClick={() => setPreviewImage({ src: line.images[0], alt: itemName })}>
              <ProductImage src={line.images[0]} alt="" />
            </button>
            <button type="button" className="order-item-text" onClick={openOrder}>
              <strong>{itemName}</strong>
              <small>{t('detail.quantity', { count: line.quantity, unit: line.quantity === 1 ? t('detail.piece') : t('detail.pieces') })}</small>
              <small className="order-item-profit">{t('detail.itemProfitPerUnit')} {unitProfit === null ? '—' : `${unitProfit > 0 ? '+' : ''}${formatMoney(unitProfit, language)} THB`}</small>
            </button>
            <button type="button" className="order-item-price" onClick={openOrder}>{formatMoney(line.salePrice, language)} THB</button>
          </li>
        })}
      </ul>}
    </article>
    {previewImage && <ImagePreviewDialog src={previewImage.src} alt={previewImage.alt} onClose={() => setPreviewImage(null)} />}
  </>
}

function getDefaultDay(_sheet: SheetDefinition) {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function emptyDraftLine(): DraftLine {
  return {
    itemName: '', quantity: '1', salePrice: '', bankAmount: '', depositAmount: '', image: '', images: [],
    imageName: '', imageIsNew: false, attributes: [], costRMB: '',
  }
}

function emptyDraft(sheet: SheetDefinition, exchangeRate: number): OrderDraft {
  return {
    lineName: '', lineUserId: '', customerName: '', day: getDefaultDay(sheet), exchangeRate: String(exchangeRate),
    isCampaign: false, campaignDiscount: '', paymentStatus: '', shippingStatus: '', lines: [emptyDraftLine()],
  }
}

function getDateInputValue(day: string, sheet: SheetDefinition) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) return day
  const numericDay = Number(day)
  if (Number.isFinite(numericDay) && numericDay >= 30000) {
    return new Date(Date.UTC(1899, 11, 30) + numericDay * 86_400_000).toISOString().slice(0, 10)
  }
  if (Number.isFinite(numericDay) && numericDay > 0 && numericDay <= 31) {
    return `${sheet.year}-${String(MONTH_INDEX[sheet.monthKey] + 1).padStart(2, '0')}-${String(numericDay).padStart(2, '0')}`
  }
  const parsed = new Date(day)
  return Number.isNaN(parsed.getTime()) ? getDefaultDay(sheet) : parsed.toISOString().slice(0, 10)
}

function draftFromOrder(order: SheetOrder, defaultExchangeRate: number, sheet: SheetDefinition): OrderDraft {
  return {
    lineName: order.lineName,
    lineUserId: order.lineUserId ?? '',
    customerName: order.customerName,
    day: getDateInputValue(order.day, sheet),
    exchangeRate: String(order.exchangeRate ?? defaultExchangeRate),
    isCampaign: order.isCampaign ?? false,
    campaignDiscount: order.campaignDiscount ? String(order.campaignDiscount) : '',
    paymentStatus: order.paymentStatus,
    shippingStatus: order.shippingStatus,
    lines: order.lines.map((line) => ({
      itemName: line.itemName,
      quantity: String(line.quantity || 1),
      salePrice: line.salePrice ? String(line.salePrice) : '',
      bankAmount: line.bankAmount ? String(line.bankAmount) : '',
      depositAmount: line.depositAmount ? String(line.depositAmount) : '',
      image: line.images[0] ?? '',
      images: [...line.images],
      imageName: line.imageName ?? '',
      imageIsNew: false,
      attributes: line.attributes,
      originalSalePrice: line.salePrice,
      originalProfitAmount: line.profitAmount,
      originalProfitPercent: line.profitPercent,
      costRMB: line.costRMB == null ? '' : String(line.costRMB),
      originalCostRMB: line.costRMB,
      originalExchangeRate: order.exchangeRate ?? defaultExchangeRate,
    })),
  }
}

async function imageToDataUrl(file: File) {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  let maxDimension = 720
  let quality = 0.76
  try {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Image processing is unavailable.')
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/webp', quality)
      if (dataUrl.length <= 44_000) return dataUrl
      if (quality > 0.46) quality = Math.max(0.46, quality - 0.1)
      else {
        maxDimension = Math.max(96, Math.floor(maxDimension * 0.78))
        quality = 0.72
      }
    }
  } finally {
    bitmap.close()
  }
  throw new Error('This image cannot be compressed enough to save in Google Sheets.')
}

function CreateOrderDialog({
  sheet,
  imageChoices,
  initialOrder,
  defaultExchangeRate,
  onExchangeRateChange,
  onClose,
  onSave,
}: {
  sheet: SheetDefinition
  imageChoices: ImageChoice[]
  initialOrder?: SheetOrder
  defaultExchangeRate: number
  onExchangeRateChange: (value: number) => void
  onClose: () => void
  onSave: (draft: OrderDraft) => Promise<void>
}) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'
  const [draft, setDraft] = useState(() => initialOrder ? draftFromOrder(initialOrder, defaultExchangeRate, sheet) : emptyDraft(sheet, defaultExchangeRate))
  const initialDraftSnapshot = useRef(JSON.stringify(draft))
  const dialogRef = useRef<HTMLElement | null>(null)
  const [openPicker, setOpenPicker] = useState<number | null>(null)
  const [imageQuery, setImageQuery] = useState('')
  const [imageError, setImageError] = useState('')
  const [uploadingImageIndex, setUploadingImageIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [currentStep, setCurrentStep] = useState(0)
  const formRef = useRef<HTMLFormElement>(null)
  const exchangeRate = Number(draft.exchangeRate) || defaultExchangeRate
  const grossSales = draft.lines.reduce((sum, line) => sum + (Number(line.salePrice) || 0), 0)
  const campaignDiscount = draft.isCampaign ? Math.min(grossSales, Math.max(0, Number(draft.campaignDiscount) || 0)) : 0
  const netSales = Math.max(0, grossSales - campaignDiscount)
  const amountPaid = draft.lines.reduce((sum, line) => sum + (Number(line.bankAmount) || 0), 0)
  const orderDepositDue = Math.max(0, netSales - amountPaid)
  const automaticPaymentStatus = netSales > 0 && amountPaid >= netSales ? 'จ่ายเต็ม' : amountPaid > 0 ? 'มัดจำ' : 'ยังไม่ได้ชำระ'

  const updateField = <K extends keyof OrderDraft>(key: K, value: OrderDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const updateLine = (index: number, key: keyof DraftLine, value: string) => {
    setDraft((current) => ({
      ...current,
      paymentStatus: key === 'salePrice' || key === 'bankAmount' ? '' : current.paymentStatus,
      lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, [key]: value } : line),
    }))
  }

  const handleFile = async (index: number, file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setImageError(t('createOrder.imageTypeError'))
      return
    }
    setUploadingImageIndex(index)
    setImageError('')
    try {
      const image = await imageToDataUrl(file)
      setDraft((current) => ({ ...current, lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, image, images: [image], imageName: '', imageIsNew: true } : line) }))
    } catch {
      setImageError(t('createOrder.imageReadError'))
    } finally {
      setUploadingImageIndex(null)
    }
  }

  const requestClose = () => {
    if (saving) return
    if (JSON.stringify(draft) !== initialDraftSnapshot.current && !window.confirm(t('createOrder.discardUnsaved'))) return
    onClose()
  }
  useDialogAccessibility(dialogRef, requestClose)
  const filteredImages = imageChoices.filter((choice) => `${choice.label} ${choice.itemName}`.toLocaleLowerCase().includes(imageQuery.toLocaleLowerCase()))

  const validateCurrentStep = () => {
    const activePanel = formRef.current?.querySelector<HTMLElement>(`[data-order-step="${currentStep}"]`)
    const firstInvalid = activePanel?.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(':invalid')
    if (!firstInvalid) return true
    firstInvalid.reportValidity()
    firstInvalid.focus()
    return false
  }

  const goToStep = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step)
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (step === currentStep + 1 && validateCurrentStep()) {
      setCurrentStep(step)
      window.requestAnimationFrame(() => formRef.current?.scrollTo({ top: 0, behavior: 'smooth' }))
    }
  }

  const goToNextStep = () => {
    if (currentStep < 2) goToStep(currentStep + 1)
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (saving || currentStep !== 2 || !validateCurrentStep()) return
    setSaving(true)
    setSaveError('')
    try {
      await onSave(draft)
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : t('createOrder.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) requestClose() }}>
      <section className="create-order-modal" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="create-order-heading">
        <header className="modal-header">
          <div>
            <p>{sheetTitle(sheet, t)}</p>
            <h2 id="create-order-heading" tabIndex={-1}>{t(initialOrder ? 'createOrder.editTitle' : 'createOrder.title')}</h2>
          </div>
          <button type="button" className="modal-close" data-dialog-initial-focus onClick={requestClose} aria-label={t('createOrder.close')}><X size={20} /></button>
        </header>

        <form className="order-form" ref={formRef} onSubmit={submit}>
          <nav className="order-stepper" aria-label={t('createOrder.stepProgress', { current: currentStep + 1, total: 3 })}>
            <ol>
              {[
                t('createOrder.stepInfo'),
                t('createOrder.stepItems'),
                t('createOrder.stepReview'),
              ].map((label, index) => (
                <li className={index === currentStep ? 'current' : index < currentStep ? 'complete' : ''} key={label}>
                  <button type="button" onClick={() => goToStep(index)} disabled={index >= currentStep} aria-current={index === currentStep ? 'step' : undefined}>
                    <span className="order-step-number">{index < currentStep ? <Check size={13} /> : index + 1}</span>
                    <span className="order-step-label">{label}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
          <fieldset className="order-step-panel" data-order-step="0" disabled={currentStep !== 0} hidden={currentStep !== 0}>
          <div className="form-section-heading form-section-heading-first"><h3>{t('createOrder.orderInfo')}</h3><span>{t('createOrder.requiredFieldsNote')}</span></div>
          <div className="form-grid two-columns">
            <div>
              <label className="field-label" htmlFor="order-line-name">{t('detail.lineName')}</label>
              <LineNameField
                id="order-line-name"
                value={draft.lineName}
                placeholder={t('createOrder.linePlaceholder')}
                newLabel={(name) => t('createOrder.useNewLine', { name })}
                onChange={(value) => { updateField('lineName', value); updateField('lineUserId', '') }}
                onPick={(contact) => { updateField('lineName', contact.displayName); updateField('lineUserId', contact.lineUserId.startsWith('sheet:') ? '' : contact.lineUserId); if (!draft.customerName.trim()) updateField('customerName', contact.displayName) }}
              />
            </div>
            <label><span className="field-label">{t('detail.customer')} <span className="required-star">*</span></span><input value={draft.customerName} onChange={(event) => updateField('customerName', event.target.value)} required placeholder={t('createOrder.customerPlaceholder')} /></label>
          </div>
          <label className="day-field"><span className="field-label">{t('createOrder.day')} <span className="required-star">*</span></span><input type="date" value={draft.day} onChange={(event) => updateField('day', event.target.value)} required /></label>

          <div className="exchange-rate-field">
            <label><span className="field-label">{t('createOrder.exchangeRate')} <span className="required-star">*</span></span><NumericInput minValue={0.01} value={draft.exchangeRate} onValueChange={(value) => { updateField('exchangeRate', value); const nextRate = Number(value); if (nextRate > 0) onExchangeRateChange(nextRate) }} required /></label>
            <small>{t('createOrder.exchangeRateHint')}</small>
          </div>
          </fieldset>

          <fieldset className="order-step-panel" data-order-step="1" disabled={currentStep !== 1} hidden={currentStep !== 1}>
          <div className="form-section-heading"><h3>{t('detail.items')}</h3><span>{t('createOrder.monthOnlyImages', { month: sheetTitle(sheet, t) })}</span></div>

          {draft.lines.map((line, index) => {
            const costRequired = line.originalSalePrice === undefined
            const price = Number(line.salePrice) || 0
            const paid = Number(line.bankAmount) || 0
            const costRMB = Number(line.costRMB) || 0
            const costTHB = costRMB * exchangeRate * (Number(line.quantity) || 1)
            const depositDue = Math.max(0, price - paid)
            const previewProfit = line.costRMB.trim() && line.salePrice.trim() ? price - costTHB : null
            return (
              <section className="draft-line-card" key={index}>
                <div className="draft-line-heading"><strong>{t('createOrder.itemNumber', { number: index + 1 })}</strong>{draft.lines.length > 1 && <button type="button" className="remove-line" onClick={() => setDraft((current) => ({ ...current, paymentStatus: '', lines: current.lines.filter((_, lineIndex) => lineIndex !== index) }))}>{t('createOrder.remove')}</button>}</div>
                <div className="image-source-row image-source-row-first">
                  <label className="upload-image-button btn btn-outline btn-sm">
                    {uploadingImageIndex === index ? <LoaderCircle size={16} className="animate-spin" /> : <ImagePlus size={16} />} {uploadingImageIndex === index ? t('createOrder.preparingImage') : t('createOrder.uploadPhoto')}
                    <input type="file" accept="image/*" disabled={uploadingImageIndex === index} onChange={(event) => void handleFile(index, event.target.files?.[0])} />
                  </label>
                  <button type="button" className="choose-month-image btn btn-outline btn-sm" onClick={() => { setOpenPicker(openPicker === index ? null : index); setImageQuery('') }} disabled={imageChoices.length === 0 || uploadingImageIndex === index}>
                    {t('createOrder.chooseMonthImage')}
                  </button>
                </div>
                <small className="image-source-hint">{t('createOrder.imagePrefillHint')}</small>
                {openPicker === index && <div className="month-image-picker">
                  <input value={imageQuery} onChange={(event) => setImageQuery(event.target.value)} placeholder={t('createOrder.filterMonthImages')} aria-label={t('createOrder.filterMonthImages')} />
                  <div className="month-image-grid">
                    {filteredImages.map((choice) => <button type="button" key={choice.url} title={`${choice.label} · ${formatMoney(choice.salePrice, language)} THB`} onClick={() => { setDraft((current) => ({ ...current, lines: current.lines.map((currentLine, lineIndex) => lineIndex === index ? { ...currentLine, image: choice.url, images: [choice.url], imageName: '', imageIsNew: false, itemName: choice.itemName || currentLine.itemName, salePrice: choice.salePrice > 0 ? String(choice.salePrice) : currentLine.salePrice } : currentLine) })); setOpenPicker(null) }}><img src={choice.url} alt={choice.label} /><span>{choice.itemName || choice.label}<small>{formatMoney(choice.salePrice, language)} THB</small></span></button>)}
                    {filteredImages.length === 0 && <span className="picker-empty">{t('createOrder.noMonthImages')}</span>}
                  </div>
                </div>}
                <div className="draft-item-main">
                  <div className="draft-item-photo"><ProductImage src={line.image} alt={line.itemName || t('createOrder.selectedImage')} /></div>
                  <div className="draft-item-fields">
                    <label><span className="field-label">{t('createOrder.itemName')} <span className="required-star">*</span></span><input value={line.itemName} onChange={(event) => updateLine(index, 'itemName', event.target.value)} required /></label>
                    <div className="form-grid two-columns">
                      <label><span className="field-label">{t('createOrder.price')} <span className="required-star">*</span></span><NumericInput minValue={0} value={line.salePrice} onValueChange={(value) => updateLine(index, 'salePrice', value)} required /></label>
                      <div className="field-block"><span className="field-label">{t('createOrder.quantity')} <span className="required-star">*</span></span><QuantityStepper label={t('createOrder.quantity')} value={line.quantity} onChange={(value) => updateLine(index, 'quantity', value)} /></div>
                    </div>
                  </div>
                </div>
                <div className="form-grid two-columns financial-fields">
                  <label><span className="field-label">{t('createOrder.bank')}</span><NumericInput minValue={0} value={line.bankAmount} onValueChange={(value) => updateLine(index, 'bankAmount', value)} /></label>
                  <label><span className="field-label">{t('createOrder.costRMB')} {costRequired && <span className="required-star">*</span>}</span><NumericInput minValue={0} value={line.costRMB} onValueChange={(value) => updateLine(index, 'costRMB', value)} required={costRequired} /></label>
                </div>
                <div className="line-calculation-summary">
                  <span>{t('createOrder.depositDue')} <strong>{formatMoney(depositDue, language)} THB</strong></span>
                  {line.costRMB.trim() && <span>{t('createOrder.costTHBPreview')} <strong>{formatMoney(costTHB, language)} THB</strong></span>}
                  {previewProfit !== null && <span>{t('createOrder.estimatedProfit')} <strong className={previewProfit < 0 ? 'negative-text' : 'positive-text'}>{formatMoney(previewProfit, language)} THB</strong></span>}
                </div>
                {line.image && <button type="button" className="remove-photo-button" onClick={() => setDraft((current) => ({ ...current, lines: current.lines.map((item, lineIndex) => lineIndex === index ? { ...item, image: '', images: [], imageName: '', imageIsNew: false } : item) }))}>{t('createOrder.removeImage')}</button>}
              </section>
            )
          })}
          <button type="button" className="add-line-button" onClick={() => setDraft((current) => ({ ...current, paymentStatus: '', lines: [...current.lines, emptyDraftLine()] }))}><Plus size={15} /> {t('createOrder.addItem')}</button>
          {imageError && <p className="form-error" role="alert">{imageError}</p>}
          </fieldset>

          <fieldset className="order-step-panel" data-order-step="2" disabled={currentStep !== 2} hidden={currentStep !== 2}>
          <div className="form-section-heading"><h3>{t('createOrder.fulfillmentPayment')}</h3><span>{t('createOrder.statusHint')}</span></div>
          <div className="form-grid two-columns">
            <label>{t('createOrder.paymentStatus')}<Dropdown className="field-trigger" value={draft.paymentStatus} onChange={(event) => updateField('paymentStatus', event.target.value)}><option value="">{t('detail.notSet')}</option><option value="ยังไม่ได้ชำระ">{t('detail.paymentUnpaid')}</option><option value="จ่ายเต็ม">{t('detail.paymentFull')}</option><option value="มัดจำ">{t('detail.paymentDeposit')}</option></Dropdown></label>
            <label>{t('createOrder.shippingStatus')}<Dropdown className="field-trigger" value={draft.shippingStatus} onChange={(event) => updateField('shippingStatus', event.target.value)}><option value="">{t('detail.notSet')}</option><option value="ยังไม่ได้สั่ง">{t('detail.shippingNotOrdered')}</option><option value="สั่งแล้ว">{t('detail.shippingOrdered')}</option><option value="รอเข้าไทย">{t('detail.shippingInbound')}</option><option value="ส่งแล้ว">{t('detail.shippingSent')}</option></Dropdown></label>
          </div>

          <section className="campaign-form-card">
            <div className="campaign-card-heading"><h3>{t('createOrder.campaignSummary')}</h3><span>{t('createOrder.liveSummary')}</span></div>
            <label className="campaign-toggle"><input type="checkbox" checked={draft.isCampaign} onChange={(event) => { updateField('isCampaign', event.target.checked); updateField('paymentStatus', ''); if (!event.target.checked) updateField('campaignDiscount', '') }} />{t('createOrder.isCampaign')}</label>
            {draft.isCampaign && <label className="campaign-discount-field">
              <span className="field-label">{t('createOrder.campaignDiscount')} <span className="required-star">*</span></span>
              <span className="campaign-discount-control"><NumericInput className="input input-bordered campaign-discount-input" minValue={0} maxValue={grossSales} value={draft.campaignDiscount} onValueChange={(value) => { updateField('campaignDiscount', value); updateField('paymentStatus', '') }} required /><span className="campaign-currency">THB</span></span>
            </label>}
            <div className="campaign-net-total"><span>{t('createOrder.afterDiscount')}</span><strong>{formatMoney(netSales, language)} THB</strong></div>
            <div className="campaign-net-total"><span>{t('createOrder.orderDepositDue')}</span><strong>{formatMoney(orderDepositDue, language)} THB</strong></div>
            <div className="campaign-net-total"><span>{t('createOrder.paymentStatusPreview')}</span><strong>{t((draft.paymentStatus || automaticPaymentStatus) === 'จ่ายเต็ม' ? 'detail.paymentFull' : (draft.paymentStatus || automaticPaymentStatus) === 'มัดจำ' ? 'detail.paymentDeposit' : 'detail.paymentUnpaid')}</strong></div>
          </section>

          {saveError && <p className="form-error" role="alert">{saveError}</p>}
          <p className="local-save-note">{t('createOrder.localOnly')}</p>
          </fieldset>

          <footer className="modal-actions order-modal-actions">
            <div className="form-total-summary">
              <span>{t('createOrder.afterDiscount')}</span>
              <strong>{formatMoney(netSales, language)} THB</strong>
              <small>{t('createOrder.orderDepositDue')}: {formatMoney(orderDepositDue, language)} THB</small>
            </div>
            <div className={`order-step-actions${currentStep === 0 ? ' two-actions' : ''}`}>
              <button type="button" className="cancel-order-button btn btn-ghost" onClick={requestClose} disabled={saving}>{t('createOrder.cancel')}</button>
              {currentStep > 0 && <button type="button" className="back-order-button btn btn-ghost" onClick={() => goToStep(currentStep - 1)} disabled={saving}><ChevronLeft size={15} />{t('createOrder.back')}</button>}
              {currentStep < 2
                ? <button key="next-step" type="button" className="save-order-button btn btn-primary" onClick={goToNextStep} disabled={saving}>{t('createOrder.next')}<ChevronRight size={15} /></button>
                : <button key="submit-order" type="submit" className="save-order-button btn btn-primary" disabled={saving}>{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />} {saving ? t('createOrder.saving') : t(initialOrder ? 'createOrder.update' : 'createOrder.create')}</button>}
            </div>
          </footer>
        </form>
      </section>
    </div>
  )
}

function QuantityStepper({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  const { t } = useTranslation()
  const current = Math.max(1, Number(value) || 1)
  return (
    <span className="qty-stepper">
      <button type="button" aria-label={t('createOrder.decrease')} onClick={() => onChange(String(Math.max(1, current - 1)))} disabled={current <= 1}><Minus size={18} strokeWidth={3} /></button>
      <NumericInput integer minValue={1} value={value} onValueChange={onChange} aria-label={label} required />
      <button type="button" aria-label={t('createOrder.increase')} onClick={() => onChange(String(current + 1))}><Plus size={18} strokeWidth={3} /></button>
    </span>
  )
}

function MonthlyExpensesSection({ expenses, onChange }: { expenses: MonthlyExpense[]; onChange: (expenses: MonthlyExpense[]) => void }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'
  const total = expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0)
  const update = (id: string, key: keyof MonthlyExpense, value: string | number) => onChange(expenses.map((expense) => expense.id === id ? { ...expense, [key]: value } : expense))
  const add = () => onChange([...expenses, { id: `expense-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, category: 'shipping', description: '', amount: 0 }])

  return (
    <section className="monthly-expenses-section">
      <div className="monthly-expenses-heading"><span>{t('expenses.note')}</span><strong>{formatMoney(total, language)} <small>THB</small></strong></div>
      <div className="monthly-expenses-list">
        {expenses.map((expense) => (
          <div className="monthly-expense-row" key={expense.id}>
            <div className="monthly-expense-fields">
              <Dropdown className="field-trigger" aria-label={t('expenses.category')} value={expense.category} onChange={(event) => update(expense.id, 'category', event.target.value)}>
                <option value="shipping">{t('expenses.shipping')}</option><option value="packaging">{t('expenses.packaging')}</option><option value="ads">{t('expenses.ads')}</option><option value="other">{t('expenses.other')}</option>
              </Dropdown>
              <input type="text" aria-label={t('expenses.description')} placeholder={t('expenses.description')} value={expense.description} onChange={(event) => update(expense.id, 'description', event.target.value)} />
              <NumericInput minValue={0} aria-label={t('expenses.amount')} value={String(expense.amount)} onValueChange={(value) => update(expense.id, 'amount', Number(value) || 0)} />
            </div>
            <button type="button" className="expense-remove" onClick={() => onChange(expenses.filter((item) => item.id !== expense.id))} aria-label={t('expenses.remove')}><X size={15} /></button>
          </div>
        ))}
        {expenses.length === 0 && <div className="expenses-empty-state"><span className="expenses-empty-icon"><Receipt size={19} /></span><p className="expenses-empty">{t('expenses.empty')}</p></div>}
      </div>
      <button type="button" className="expense-add-button" onClick={add}><Plus size={14} /> {t('expenses.add')}</button>
    </section>
  )
}

function MonthlyExpensesDialog({ sheetName, expenses, onClose, onSave }: { sheetName: string; expenses: MonthlyExpense[]; onClose: () => void; onSave: (expenses: MonthlyExpense[]) => void }) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(() => expenses.map((expense) => ({ ...expense })))
  const dialogRef = useRef<HTMLElement | null>(null)
  const isDirty = JSON.stringify(draft) !== JSON.stringify(expenses)
  const requestClose = () => {
    if (isDirty && !window.confirm(t('expenses.discardUnsaved'))) return
    onClose()
  }
  useDialogAccessibility(dialogRef, requestClose)

  return (
    <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) requestClose() }}>
      <section className="create-order-modal monthly-expenses-modal" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="monthly-expenses-heading">
        <header className="modal-header">
          <div><p>{sheetName}</p><h2 id="monthly-expenses-heading" tabIndex={-1}>{t('expenses.title')}</h2><small className="modal-subtitle">{t('expenses.savePrompt')}</small></div>
          <button type="button" className="modal-close" data-dialog-initial-focus onClick={requestClose} aria-label={t('expenses.close')}><X size={20} /></button>
        </header>
        <div className="monthly-expenses-modal-body"><MonthlyExpensesSection expenses={draft} onChange={setDraft} /></div>
        <footer className="modal-actions expense-modal-actions">
          <button type="button" className="cancel-order-button btn btn-ghost" onClick={requestClose}>{t('createOrder.cancel')}</button>
          <button type="button" className="save-order-button btn btn-primary" onClick={() => { onSave(draft); onClose() }} disabled={!isDirty}><Check size={15} />{t('expenses.save')}</button>
        </footer>
      </section>
    </div>
  )
}

function SheetOrdersPage({
  sheet,
  sheetData,
  loading,
  onRefresh,
  onCreateOrder,
  monthlyExpenses,
  onSaveMonthlyExpenses,
  exchangeRate,
  onExchangeRateChange,
  onLoadMoreData,
  onExportMonthlyReport,
  exportingReport,
  exportMessage,
}: {
  sheet: SheetDefinition
  sheetData?: SheetDataState
  loading: boolean
  onRefresh: () => void
  onCreateOrder: (sheetId: string, draft: OrderDraft, originalOrder?: SheetOrder) => Promise<void>
  monthlyExpenses: MonthlyExpense[]
  onSaveMonthlyExpenses: (sheetId: string, expenses: MonthlyExpense[]) => void
  exchangeRate: number
  onExchangeRateChange: (value: number) => void
  onLoadMoreData: (sheetId: string) => void
  onExportMonthlyReport: (sheetId: string) => void
  exportingReport: boolean
  exportMessage: string
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const cameFromHome = (location.state as { from?: string } | null)?.from === 'home'
  const language = i18n.resolvedLanguage ?? 'en'
  const scrollRootRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const pullDistance = usePullToRefresh(scrollRootRef, loading, onRefresh)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [compactList, setCompactList] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [visibleCount, setVisibleCount] = useState(10)
  const [createOpen, setCreateOpen] = useState(false)
  const [expensesOpen, setExpensesOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const orders = sheetData?.orders ?? EMPTY_ORDERS
  const expenseTotal = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const totalProfit = getProfitSummary(orders, expenseTotal)

  const sortedOrders = useMemo(() => {
    const matching = orders.filter((order) => {
      const searchText = `${order.lineName} ${order.customerName} ${order.lines.map((line) => line.itemName).join(' ')} ${order.paymentStatus} ${order.shippingStatus}`.toLocaleLowerCase()
      if (!searchText.includes(query.toLocaleLowerCase())) return false
      return orderMatchesStatus(order, statusFilter)
    })
    return matching.sort((a, b) => {
      if (sortBy === 'sales-asc') return a.totalSales - b.totalSales
      if (sortBy === 'status') return `${a.paymentStatus}-${a.shippingStatus}`.localeCompare(`${b.paymentStatus}-${b.shippingStatus}`)
      if (sortBy === 'oldest') return getOrderSortTimestamp(a, sheet) - getOrderSortTimestamp(b, sheet) || a.sheetRow - b.sheetRow
      if (sortBy === 'newest') return getOrderSortTimestamp(b, sheet) - getOrderSortTimestamp(a, sheet) || b.sheetRow - a.sheetRow
      return b.totalSales - a.totalSales
    })
  }, [orders, query, sheet, sortBy, statusFilter])
  const visibleOrders = sortedOrders.slice(0, visibleCount)
  const hasMoreInMemory = visibleOrders.length < sortedOrders.length
  const hasMore = hasMoreInMemory || Boolean(sheetData?.hasMore)

  useEffect(() => {
    const root = scrollRootRef.current
    const sentinel = sentinelRef.current
    if (!root || !sentinel || !hasMore || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      if (visibleCount < sortedOrders.length) setVisibleCount((count) => Math.min(count + 10, sortedOrders.length))
      else if (sheetData?.hasMore && !sheetData.loadingMore && !sheetData.loadMoreError) onLoadMoreData(sheet.id)
    }, { root, rootMargin: '140px' })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, sortedOrders.length, visibleCount, sheetData?.hasMore, sheetData?.loadingMore, sheetData?.loadMoreError, onLoadMoreData, sheet.id])

  const updateQuery = (value: string) => { setQuery(value); setVisibleCount(10) }
  const updateStatus = (value: string) => { setStatusFilter(value); setVisibleCount(10) }
  const updateSort = (value: string) => { setSortBy(value); setVisibleCount(10) }

  const imageChoices = useMemo(() => {
    const seen = new Set<string>()
    return orders.flatMap((order) => order.lines.flatMap((line, lineIndex) => line.images.map((url) => ({ url, label: line.itemName || line.imageName || order.customerName || order.lineName || t('createOrder.itemNumber', { number: lineIndex + 1 }), itemName: line.itemName || line.imageName || '', salePrice: line.salePrice }))))
      .filter((choice) => {
        const key = `${choice.url}|${choice.itemName}|${choice.salePrice}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
  }, [orders, t])

  const saveOrder = async (draft: OrderDraft) => {
    await onCreateOrder(sheet.id, draft)
    setCreateOpen(false)
    setNotice(t('createOrder.savedNotice'))
    window.setTimeout(() => setNotice(''), 3000)
  }

  const profitReady = !sheetData?.hasMore && totalProfit.amount !== null
  const profitNote = sheetData?.hasMore ? t('sheet.loadingShort') : totalProfit.amount === null ? t('analytics.noPeriodProfitShort') : !totalProfit.complete ? `${totalProfit.knownLines}/${totalProfit.totalLines}` : ''
  const sortOptions = [
    { value: 'newest', label: t('filters.newest') },
    { value: 'oldest', label: t('filters.oldest') },
    { value: 'sales-desc', label: t('filters.salesHigh') },
    { value: 'sales-asc', label: t('filters.salesLow') },
    { value: 'status', label: t('filters.statusAZ') },
  ]

  return (
    <section className="app-screen orders-screen" aria-label={t('screen.sheetOrders')}>
      <ScreenHeader
        onBack={cameFromHome ? () => navigate(-1) : undefined}
        backLabel={t('nav.backToSheets')}
        actions={<>
          <button type="button" className={`icon-button${searchOpen ? ' is-active' : ''}`} aria-label={t(searchOpen ? 'orders.closeSearch' : 'orders.search')} aria-expanded={searchOpen} aria-controls="order-search-field" onClick={() => setSearchOpen((open) => !open)}>
            {searchOpen ? <X size={24} /> : <Search size={24} />}
          </button>
          {sheet.kind === 'sales' && <button type="button" className="icon-button" aria-label={exportingReport ? t('backup.preparing') : t('backup.exportMonthly')} onClick={() => onExportMonthlyReport(sheet.id)} disabled={exportingReport}>{exportingReport ? <LoaderCircle size={22} className="animate-spin" /> : <Download size={23} />}</button>}
        </>}
      />

      <div className="screen-surface has-dock">
        <div className="surface-scroll overscroll-y-contain" ref={scrollRootRef}>
          <div className="sheet-context-heading display">{sheetTitle(sheet, t)}</div>
          <PullToRefreshIndicator distance={pullDistance} refreshing={loading} />
          {searchOpen && <div className="search-panel">
            <label className="search-field">
              <Search size={18} />
              <span className="sr-only">{t('orders.search')}</span>
              <input id="order-search-field" type="search" autoFocus value={query} onChange={(event) => updateQuery(event.target.value)} placeholder={t('orders.search')} />
            </label>
          </div>}

          {loading && !sheetData ? <div className="stat-strip" aria-busy="true" aria-label={t('sheet.loading')}>{Array.from({ length: 3 }, (_, index) => <SkeletonLine className="h-[68px] w-full rounded-[20px]" key={index} />)}</div> : <div className={`stat-strip${sheet.kind === 'sales' ? '' : ' two'}`}>
            <div className="stat-tile accent"><span>{t('orders.statSales')}</span><strong>{formatMoney(sheetTotal(orders), language)} <small>THB</small></strong></div>
            {sheet.kind === 'sales' ? <>
              <div className={`stat-tile${profitReady ? (totalProfit.amount! < 0 ? ' bad' : ' good') : ''}`}><span>{t('orders.statProfit')}</span><strong>{profitReady ? <>{formatMoney(totalProfit.amount!, language)} <small>THB</small></> : '—'}</strong>{profitNote && <em>{profitNote}</em>}</div>
              <button type="button" className="stat-tile" onClick={() => setExpensesOpen(true)}><Pencil size={13} /><span>{t('expenses.open')}</span><strong>{formatMoney(expenseTotal, language)} <small>THB</small></strong></button>
            </> : <div className="stat-tile"><span>{t('analytics.orders')}</span><strong>{orders.length}</strong><em>{t('orders.orders')}</em></div>}
          </div>}

          <div className="orders-toolbar">
            <div className="pill-row" role="group" aria-label={t('filters.status')}>
              {STATUS_FILTERS.map((filter) => <button type="button" className="pill" key={filter} aria-pressed={statusFilter === filter} onClick={() => updateStatus(filter)}><span aria-hidden="true">{statusFilterEmoji(filter)}</span>{statusFilterLabel(filter, t)}<span className="pill-count">{orders.filter((order) => orderMatchesStatus(order, filter)).length}</span></button>)}
            </div>
          </div>
          <div className="order-list-meta">
            <span>{visibleOrders.length}/{sortedOrders.length}{sheetData?.hasMore ? '+' : ''} {t('orders.orders')}</span>
            <span className="order-list-actions">
            <button type="button" className="pill pill-small" aria-pressed={compactList} onClick={() => setCompactList((compact) => !compact)}>{compactList ? <LayoutList size={15} /> : <Rows3 size={15} />}<span className="sr-only">{t(compactList ? 'orders.cardView' : 'orders.compactView')}</span></button>
            <Dropdown variant="pill" align="end" aria-label={t('filters.sort')} value={sortBy} onChange={(event) => updateSort(event.target.value)}>
                {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Dropdown>
            </span>
          </div>

          {sheetData?.error && <div className="sheet-error" role="alert">{t('sheet.error')} <button type="button" onClick={onRefresh}>{t('sheet.retry')}</button></div>}
          {!sheetData && loading && <div className="cart-list" aria-busy="true" aria-label={t('sheet.loading')}>{Array.from({ length: 5 }, (_, index) => <div className="cart-row" key={index} aria-hidden="true"><SkeletonLine className="size-[92px] rounded-3xl" /><div className="grid gap-2"><SkeletonLine className="h-5 w-3/4" /><SkeletonLine className="h-3 w-1/2" /><SkeletonLine className="h-5 w-1/3" /></div></div>)}</div>}
          {sheetData && !sheetData.error && orders.length === 0 && !sheetData.hasMore && <p className="sheet-message">{t('sheet.empty')}</p>}
          {sortedOrders.length === 0 && !loading && orders.length > 0 && !sheetData?.hasMore && <p className="sheet-message">{t('orders.noMatch')}</p>}
          <div className="cart-list">
            {visibleOrders.map((order) => <OrderListRow key={order.id} order={order} sheet={sheet} compact={compactList} />)}
          </div>
          {sheetData?.loadMoreError && <div className="sheet-error" role="alert">{t('sheet.loadMoreError')} <button type="button" onClick={() => onLoadMoreData(sheet.id)}>{t('sheet.retry')}</button></div>}
          {hasMore && <div className="load-more-sentinel flex items-center justify-center gap-2 py-3 text-xs font-medium" ref={sentinelRef} aria-live="polite"><LoaderCircle size={14} className="animate-spin" /> {sheetData?.loadingMore ? t('sheet.loadingMoreData') : t('orders.loadingMore')}</div>}
          {!hasMore && sortedOrders.length > 10 && <p className="list-end-note">{t('orders.endOfList')}</p>}
        </div>
        <div className="action-dock"><button type="button" className="cta cta-icon-only" aria-label={t('createOrder.open')} title={t('createOrder.open')} onClick={() => setCreateOpen(true)}><Plus size={24} aria-hidden="true" /></button></div>
      </div>
      <BottomNavigation />
      {createOpen && <CreateOrderDialog sheet={sheet} imageChoices={imageChoices} defaultExchangeRate={exchangeRate} onExchangeRateChange={onExchangeRateChange} onClose={() => setCreateOpen(false)} onSave={saveOrder} />}
      {expensesOpen && <MonthlyExpensesDialog sheetName={sheetTitle(sheet, t)} expenses={monthlyExpenses} onClose={() => setExpensesOpen(false)} onSave={(expenses) => onSaveMonthlyExpenses(sheet.id, expenses)} />}
      {notice && <p className="app-toast" role="status">{notice}</p>}
      {exportMessage && <p className="app-toast" role="status">{exportMessage}</p>}
    </section>
  )
}

function OrderDetailsPage({ sheet, sheetData, loading, onRefresh, onSaveOrder, exchangeRate, onExchangeRateChange, onLoadMoreData }: { sheet: SheetDefinition; sheetData?: SheetDataState; loading: boolean; onRefresh: () => void; onSaveOrder: (sheetId: string, draft: OrderDraft, originalOrder?: SheetOrder) => Promise<void>; exchangeRate: number; onExchangeRateChange: (value: number) => void; onLoadMoreData: (sheetId: string) => void }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { orderId } = useParams()
  const language = i18n.resolvedLanguage ?? 'en'
  const [itemQuery, setItemQuery] = useState('')
  const [itemSort, setItemSort] = useState('sales-desc')
  const [previewImage, setPreviewImage] = useState<{ src?: string; alt: string } | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editNotice, setEditNotice] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)
  const [savingCampaign, setSavingCampaign] = useState(false)
  const order = sheetData?.orders.find((item) => item.id === orderId)
  const [campaignEnabled, setCampaignEnabled] = useState(() => order?.isCampaign ?? false)
  const [campaignDiscount, setCampaignDiscount] = useState(() => String(order?.campaignDiscount ?? ''))
  const imageChoices = useMemo(() => {
    const seen = new Set<string>()
    return (sheetData?.orders ?? EMPTY_ORDERS).flatMap((entry) => entry.lines.flatMap((line, lineIndex) => line.images.map((url) => ({ url, label: line.itemName || line.imageName || entry.customerName || entry.lineName || t('createOrder.itemNumber', { number: lineIndex + 1 }), itemName: line.itemName || line.imageName || '', salePrice: line.salePrice }))))
      .filter((choice) => { const key = `${choice.url}|${choice.itemName}|${choice.salePrice}`; if (seen.has(key)) return false; seen.add(key); return true })
  }, [sheetData?.orders, t])
  const needsOrderPage = !order && Boolean(sheetData?.hasMore) && !sheetData?.loadingMore && !sheetData?.loadMoreError
  useEffect(() => { if (needsOrderPage) onLoadMoreData(sheet.id) }, [needsOrderPage, onLoadMoreData, sheet.id])
  if (loading && !sheetData) return <section className="app-screen detail-screen" aria-busy="true" aria-label={t('sheet.loading')}><ScreenHeader /><div className="detail-scroll p-5"><SkeletonLine className="mb-5 h-36 w-full rounded-3xl" /><div className="grid gap-3"><SkeletonLine className="h-16 w-full rounded-2xl" /><SkeletonLine className="h-24 w-full rounded-2xl" /><SkeletonLine className="h-40 w-full rounded-2xl" /></div></div></section>
  if (sheetData?.error) return <section className="app-screen detail-screen"><ScreenHeader onBack={() => navigate(`/admin/sheets/${sheet.id}`)} backLabel={t('nav.backToOrders')} /><div className="detail-scroll"><div className="sheet-error" role="alert">{t('sheet.error')} <button type="button" onClick={onRefresh}>{t('sheet.retry')}</button></div></div></section>
  if (!order && sheetData?.hasMore) return <section className="app-screen detail-screen" aria-busy="true" aria-label={t('sheet.loadingMoreData')}><ScreenHeader onBack={() => navigate(`/admin/sheets/${sheet.id}`)} backLabel={t('nav.backToOrders')} /><div className="detail-scroll p-5"><SkeletonLine className="mb-5 h-36 w-full rounded-3xl" /><div className="grid gap-3"><SkeletonLine className="h-16 w-full rounded-2xl" /><SkeletonLine className="h-24 w-full rounded-2xl" /></div>{sheetData.loadMoreError && <div className="sheet-error" role="alert">{t('sheet.loadMoreError')} <button type="button" onClick={() => onLoadMoreData(sheet.id)}>{t('sheet.retry')}</button></div>}</div></section>
  if (!order) return <Navigate to={`/admin/sheets/${sheet.id}`} replace />

  const grossSales = order.grossSales ?? order.lines.reduce((sum, line) => sum + line.salePrice, 0)
  const orderProfit = getProfitSummary([order])
  const discountAmount = campaignEnabled ? Math.min(grossSales, Math.max(0, Number(campaignDiscount) || 0)) : 0
  const netSales = Math.max(0, grossSales - discountAmount)
  const depositDue = getDepositDue(order, netSales)
  const showEditNotice = (message: string) => {
    setEditNotice(message)
    window.setTimeout(() => setEditNotice(''), 2500)
  }
  const saveStatus = async (key: 'paymentStatus' | 'shippingStatus', value: string) => {
    if (savingStatus) return
    setSavingStatus(true)
    try {
      await onSaveOrder(sheet.id, { ...draftFromOrder(order, exchangeRate, sheet), [key]: value }, order)
      showEditNotice(t('orders.editSaved'))
    } catch {
      showEditNotice(t('createOrder.saveError'))
    } finally {
      setSavingStatus(false)
    }
  }
  const saveCampaign = async () => {
    if (savingCampaign) return
    setSavingCampaign(true)
    try {
      await onSaveOrder(sheet.id, { ...draftFromOrder(order, exchangeRate, sheet), isCampaign: campaignEnabled, campaignDiscount: campaignEnabled ? String(discountAmount) : '0' }, order)
      showEditNotice(t('orders.editSaved'))
    } catch {
      showEditNotice(t('createOrder.saveError'))
    } finally {
      setSavingCampaign(false)
    }
  }
  const visibleLines = order.lines.filter((line) => `${line.itemName} ${line.imageName ?? ''}`.toLocaleLowerCase().includes(itemQuery.toLocaleLowerCase())).sort((a, b) => {
    if (itemSort === 'sales-asc') return a.salePrice - b.salePrice
    if (itemSort === 'name') return a.itemName.localeCompare(b.itemName)
    return b.salePrice - a.salePrice
  })

  const profitTone = orderProfit.amount === null ? ' unavailable' : orderProfit.amount < 0 ? ' negative' : ''

  return (
    <section className="app-screen detail-screen" aria-label={t('screen.detail')}>
      <ScreenHeader
        onBack={() => navigate(`/admin/sheets/${sheet.id}`)}
        backLabel={t('nav.backToOrders')}
        actions={<button type="button" className="icon-button" onClick={() => setEditOpen(true)} aria-label={t('orders.edit')}><Pencil size={21} strokeWidth={2.4} /></button>}
      />
      <div className="detail-scroll">
        <div className="sheet-context-heading detail-sheet-context display">{sheetTitle(sheet, t)}</div>
        <div className="detail-hero">
          <span className="detail-hero-avatar" aria-label={t('detail.customer')}><LineAvatar lineName={order.lineName || order.customerName} lineUserId={order.lineUserId} size={52} /></span>
          <div className="detail-hero-bottom">
            <p className="detail-hero-price display">{formatMoney(netSales, language)}<small>THB</small></p>
            <span className={`rating-pill${profitTone}`}>
              {order.profitPercent !== null && <><span>{formatProfitPercent(order.profitPercent, language)}</span><i aria-hidden="true" /></>}
              <span>{t('orders.profit')} {orderProfit.amount === null ? '—' : `${formatMoney(orderProfit.amount, language)} THB`}</span>
            </span>
          </div>
        </div>

        <div className="detail-main-card">
          <Sparkle size={34} />
          <h1 className="detail-name display">{order.customerName || order.lineName}</h1>
          <p className="detail-lead">{order.lineName || t('detail.notSet')} · {formatOrderDate(order.day, sheet, language)} · {t('detail.quantity', { count: order.quantity, unit: order.quantity === 1 ? t('detail.piece') : t('detail.pieces') })}{order.sheetRow > 0 && ` · #${order.sheetRow}`}</p>
          <div className="detail-status-grid" aria-label={t('details.status')}>
            <label>{t('createOrder.paymentStatus')}<Dropdown disabled={savingStatus} variant="status" className={`detail-status-select payment-${paymentBadgeClass(order.paymentStatus)}`} value={order.paymentStatus} onChange={(event) => saveStatus('paymentStatus', event.target.value)}><option value="">{t('detail.notSet')}</option><option value="ยังไม่ได้ชำระ">{t('detail.paymentUnpaid')}</option><option value="มัดจำ">{t('detail.paymentDeposit')}</option><option value="จ่ายเต็ม">{t('detail.paymentFull')}</option></Dropdown></label>
            <label>{t('createOrder.shippingStatus')}<Dropdown disabled={savingStatus} variant="status" className={`detail-status-select shipping-${shippingBadgeClass(order.shippingStatus)}`} value={order.shippingStatus} onChange={(event) => saveStatus('shippingStatus', event.target.value)}><option value="">{t('detail.notSet')}</option><option value="ยังไม่ได้สั่ง">{t('detail.shippingNotOrdered')}</option><option value="สั่งแล้ว">{t('detail.shippingOrdered')}</option><option value="รอเข้าไทย">{t('detail.shippingInbound')}</option><option value="ส่งแล้ว">{t('detail.shippingSent')}</option></Dropdown></label>
          </div>
          <p className="detail-status-note">{savingStatus && <LoaderCircle size={13} className="animate-spin" />}{savingStatus ? t('details.saving') : t('details.statusHint')}</p>
          <button type="button" className="cta" onClick={() => setEditOpen(true)}><Pencil size={19} /> {t('orders.edit')}</button>
        </div>

        <section className="detail-section">
          <div className="section-head"><h2 className="display">{t('detail.items')}</h2><span>{t('detail.quantity', { count: order.quantity, unit: order.quantity === 1 ? t('detail.piece') : t('detail.pieces') })}</span></div>
          {order.lines.length > 3 && <div className="item-list-controls">
            <input value={itemQuery} onChange={(event) => setItemQuery(event.target.value)} placeholder={t('orders.searchItems')} aria-label={t('orders.searchItems')} />
            <Dropdown className="field-trigger" align="end" value={itemSort} onChange={(event) => setItemSort(event.target.value)} aria-label={t('filters.sortItems')}><option value="sales-desc">{t('filters.salesHighShort')}</option><option value="sales-asc">{t('filters.salesLowShort')}</option><option value="name">{t('filters.nameAZShort')}</option></Dropdown>
          </div>}
          <div className="cart-list">
            {visibleLines.map((line, index) => {
              const itemName = line.itemName || t('detail.itemNumber', { number: index + 1 })
              const unitProfit = line.profitAmount === null ? null : line.profitAmount / Math.max(1, line.quantity)
              return <article className="cart-row" key={`${order.id}-${line.row || index}`}>
                <button type="button" className="cart-thumb image-preview-trigger" aria-label={`${t('detail.previewImage')}: ${itemName}`} onClick={() => setPreviewImage({ src: line.images[0], alt: itemName })}>
                  <ProductImage src={line.images[0]} alt={t('detail.itemImage', { number: index + 1, image: 1 })} />
                  {line.images.length > 1 && <span className="cart-thumb-count">+{line.images.length - 1}</span>}
                </button>
                <div className="cart-body">
                  <h3 className="cart-title display">{line.itemName || t('detail.itemNumber', { number: index + 1 })}</h3>
                  {line.imageName && <span className="cart-sub">{t('detail.photoName')}: {line.imageName}</span>}
                  <span className="cart-price-row">
                    <span className="cart-price display">{line.salePrice ? `${formatMoney(line.salePrice, language)} THB` : '—'}</span>
                    <span className="status-badge quantity">× {line.quantity}</span>
                  </span>
                  <span className={`profit-chip${unitProfit === null ? ' unavailable' : unitProfit < 0 ? ' negative' : ''}`}>{t('detail.itemProfitPerUnit')} {unitProfit === null ? '—' : `${formatMoney(unitProfit, language)} THB`}</span>
                  {line.costRMB != null && <span className="cart-sub">{t('createOrder.costRMB')}: {formatMoney(line.costRMB, language)} CNY{line.costTHB != null && ` · ${formatMoney(line.costTHB, language)} THB`}</span>}
                  {line.attributes.length > 0 && <div className="item-attributes">{line.attributes.slice(0, 3).map((attribute) => <span key={`${attribute.key}-${attribute.value}`}>{fieldLabel(attribute.key, t)}: {attribute.value}</span>)}</div>}
                </div>
              </article>
            })}
            {visibleLines.length === 0 && <p className="picker-empty">{t('orders.noMatch')}</p>}
          </div>
        </section>

        <section className="detail-section">
          <div className="section-head"><h2 className="display">{t('details.summary')}</h2></div>
          <div className="summary-rows summary-card">
            <div className="summary-row"><span>{t('detail.lineName')}</span><b>{order.lineName || t('detail.notSet')}</b></div>
            <div className="summary-row"><span>{t('detail.customer')}</span><b>{order.customerName || t('detail.notSet')}</b></div>
            {getPaidTotal(order) > 0 && <div className="summary-row"><span>{t('detail.bank')}</span><strong>{formatMoney(getPaidTotal(order), language)} THB</strong></div>}
            {depositDue !== null && (depositDue > 0 || order.paymentStatus === 'จ่ายเต็ม') && <div className="summary-row"><span>{t('detail.deposit')}</span><strong>{formatMoney(depositDue, language)} THB</strong></div>}
            {order.profitPercent !== null && <div className="summary-row"><span>{t('detail.profitMargin')}</span><strong className={order.profitPercent < 0 ? 'negative-text' : 'positive-text'}>{formatProfitPercent(order.profitPercent, language)}</strong></div>}
            <div className="summary-row"><span>{t('detail.totalProfit')}{orderProfit.amount === null && <small>{t('analytics.noPeriodProfit')}</small>}</span><strong className={orderProfit.amount === null ? 'profit-unavailable' : orderProfit.amount < 0 ? 'negative-text' : 'positive-text'}>{orderProfit.amount === null ? '—' : `${formatMoney(orderProfit.amount, language)} THB`}</strong></div>
            <div className="summary-row total"><span>{t('detail.totalSales')}</span><strong>{formatMoney(netSales, language)} THB</strong></div>
          </div>
        </section>

        <section className="detail-section">
          <section className="campaign-detail-card">
            <label className="campaign-toggle"><input type="checkbox" checked={campaignEnabled} onChange={(event) => setCampaignEnabled(event.target.checked)} />{t('detail.campaign')}</label>
            {campaignEnabled && <label className="campaign-discount-field">
              <span className="field-label">{t('detail.discount')} <span className="required-star">*</span></span>
              <span className="campaign-discount-control"><NumericInput className="input input-bordered campaign-discount-input" minValue={0} maxValue={grossSales} value={campaignDiscount} onValueChange={setCampaignDiscount} /><span className="campaign-currency">THB</span></span>
            </label>}
            <div className="campaign-net-total"><span>{t('detail.totalBeforeDiscount')}</span><strong>{formatMoney(grossSales, language)} THB</strong></div>
            {campaignEnabled && <div className="campaign-net-total"><span>{t('detail.discount')}</span><strong>−{formatMoney(discountAmount, language)} THB</strong></div>}
            <div className="campaign-net-total campaign-final-total"><span>{t('detail.totalAfterDiscount')}</span><strong>{formatMoney(netSales, language)} THB</strong></div>
            <button type="button" className="cta cta-small" onClick={saveCampaign} disabled={savingCampaign}>{savingCampaign && <LoaderCircle size={14} className="animate-spin" />}{savingCampaign ? t('detail.savingCampaign') : t('detail.saveCampaign')}</button>
          </section>
        </section>
      </div>
      {editOpen && order && <CreateOrderDialog sheet={sheet} initialOrder={order} imageChoices={imageChoices} defaultExchangeRate={exchangeRate} onExchangeRateChange={onExchangeRateChange} onClose={() => setEditOpen(false)} onSave={async (draft) => { await onSaveOrder(sheet.id, draft, order); setEditOpen(false); showEditNotice(t('orders.editSaved')) }} />}
      {previewImage && <ImagePreviewDialog src={previewImage.src} alt={previewImage.alt} onClose={() => setPreviewImage(null)} />}
      {editNotice && <p className="app-toast" role="status">{editNotice}</p>}
    </section>
  )
}

function AdminLoginPage({ onLogin }: { onLogin: (username: string, password: string) => Promise<boolean> }) {
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      if (await onLogin(username, password)) return
      setError(t('auth.invalid'))
    } catch {
      setError(t('auth.connectionError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="app-screen admin-login-screen" aria-label={t('auth.title')}>
      <ScreenHeader />
      <div className="screen-surface login-surface">
        <div className="surface-scroll">
          <img className="login-logo" src={sweetieLogo} alt={t('splash.logoAlt')} />
          <p className="login-intro">{t('auth.title')}</p>
          <form className="login-form" onSubmit={submit}>
            <label className="field">{t('auth.username')}<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
            <label className="field">{t('auth.password')}<span className="login-password-field"><input autoComplete="current-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" className="password-visibility-toggle" aria-label={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></span></label>
            {error && <p className="login-error" role="alert">{error}</p>}
            <button type="submit" className="cta" disabled={submitting}>{submitting && <LoaderCircle size={18} className="animate-spin" />}{submitting ? t('auth.signingIn') : t('auth.signIn')}</button>
            <small className="login-note"><ShieldCheck size={14} />{t('auth.secureSession')}</small>
          </form>
        </div>
      </div>
    </section>
  )
}

function AnalyticsPage({ dataBySheet, monthlyExpensesBySheet, sheets, loading, analyticsDataLoading, onLoadAllSalesSheets }: { dataBySheet: Record<string, SheetDataState>; monthlyExpensesBySheet: Record<string, MonthlyExpense[]>; sheets: SheetDefinition[]; loading: boolean; analyticsDataLoading: boolean; onLoadAllSalesSheets: () => void }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const salesSheets = sheets.filter((sheet) => sheet.kind === 'sales').sort((a, b) => a.year - b.year || MONTH_INDEX[a.monthKey] - MONTH_INDEX[b.monthKey])
  const comparisonDate = getCurrentDate()
  const defaultCurrentSheet = salesSheets.find((sheet) => sheet.year === comparisonDate.getFullYear() && MONTH_INDEX[sheet.monthKey] === comparisonDate.getMonth()) ?? getCurrentMonthSheet(dataBySheet, sheets)
  const [selectedSheetId, setSelectedSheetId] = useState(defaultCurrentSheet.id)
  const currentSheet = salesSheets.find((sheet) => sheet.id === selectedSheetId) ?? defaultCurrentSheet
  const currentOrders = dataBySheet[currentSheet.id]?.orders ?? EMPTY_ORDERS
  const language = i18n.resolvedLanguage ?? 'en'
  const [statusFilter, setStatusFilter] = useState('all')
  const [monthlySort, setMonthlySort] = useState('sales-desc')
  const matchesStatus = (order: SheetOrder) => orderMatchesStatus(order, statusFilter)
  const filteredOrdersForSheet = (sheet: SheetDefinition) => (dataBySheet[sheet.id]?.orders ?? EMPTY_ORDERS).filter(matchesStatus)
  const scopedOrders = currentOrders.filter(matchesStatus)
  const currentExpenseTotal = (monthlyExpensesBySheet[currentSheet.id] ?? []).reduce((sum, expense) => sum + expense.amount, 0)
  const scopedProfit = getProfitSummary(scopedOrders, statusFilter === 'all' ? currentExpenseTotal : 0)
  const shipped = scopedOrders.filter((order) => order.shippingStatus === 'ส่งแล้ว').length
  const inbound = scopedOrders.filter((order) => order.shippingStatus === 'รอเข้าไทย').length
  const paid = scopedOrders.filter((order) => order.paymentStatus === 'จ่ายเต็ม').length
  const deposits = scopedOrders.filter((order) => order.paymentStatus === 'มัดจำ').length
  const needsFullSalesData = salesSheets.some((sheet) => dataBySheet[sheet.id]?.hasMore && !dataBySheet[sheet.id]?.loadMoreError)
  const hasSalesLoadError = salesSheets.some((sheet) => Boolean(dataBySheet[sheet.id]?.loadMoreError || dataBySheet[sheet.id]?.error))
  useEffect(() => { if (!loading && needsFullSalesData) void onLoadAllSalesSheets() }, [loading, needsFullSalesData, onLoadAllSalesSheets])
  const currentSalesSheetIndex = salesSheets.findIndex((sheet) => sheet.id === currentSheet.id)
  const previousSalesSheet = currentSalesSheetIndex > 0 ? salesSheets[currentSalesSheetIndex - 1] : undefined
  const previousSalesState = previousSalesSheet ? dataBySheet[previousSalesSheet.id] : undefined
  const previousSalesOrders = previousSalesSheet ? filteredOrdersForSheet(previousSalesSheet) : EMPTY_ORDERS
  const currentSalesState = dataBySheet[currentSheet.id]
  const isCurrentMonth = currentSheet.year === comparisonDate.getFullYear() && MONTH_INDEX[currentSheet.monthKey] === comparisonDate.getMonth()
  const currentComparableSales = isCurrentMonth ? sheetSalesThroughDay(scopedOrders, comparisonDate.getDate()) : sheetTotal(scopedOrders)
  const previousComparableSales = previousSalesSheet && previousSalesState && !previousSalesState.error
    ? isCurrentMonth ? sheetSalesThroughDay(previousSalesOrders, comparisonDate.getDate()) : sheetTotal(previousSalesOrders)
    : undefined
  const currentSalesChange = currentSalesState && !currentSalesState.error ? getPercentChange(currentComparableSales, previousComparableSales) : null
  const currentYear = currentSheet.year
  const previousYearSheet = salesSheets.find((sheet) => sheet.monthKey === currentSheet.monthKey && sheet.year === currentYear - 1)
  const previousYearState = previousYearSheet ? dataBySheet[previousYearSheet.id] : undefined
  const previousYearOrders = previousYearSheet ? filteredOrdersForSheet(previousYearSheet) : EMPTY_ORDERS
  const previousYearSales = previousYearState && !previousYearState.error
    ? isCurrentMonth ? sheetSalesThroughDay(previousYearOrders, comparisonDate.getDate()) : sheetTotal(previousYearOrders)
    : undefined
  const yearOverYearChange = currentSalesState && !currentSalesState.error ? getPercentChange(currentComparableSales, previousYearSales) : null
  const populatedSalesSheets = salesSheets.filter((sheet) => filteredOrdersForSheet(sheet).length > 0)
  const averageSales = populatedSalesSheets.length
    ? populatedSalesSheets.reduce((sum, sheet) => sum + sheetTotal(filteredOrdersForSheet(sheet)), 0) / populatedSalesSheets.length
    : 0
  const recordedProfits = salesSheets.flatMap((sheet) => filteredOrdersForSheet(sheet))
    .flatMap((order) => order.lines)
    .flatMap((line) => line.profitAmount == null ? [] : [line.profitAmount])
  const averageProfit = recordedProfits.length ? recordedProfits.reduce((sum, value) => sum + value, 0) / recordedProfits.length : null
  const sortedSalesSheets = [...salesSheets].sort((a, b) => {
    if (monthlySort === 'sales-asc') return sheetTotal(dataBySheet[a.id]?.orders ?? []) - sheetTotal(dataBySheet[b.id]?.orders ?? [])
    if (monthlySort === 'month') return salesSheets.indexOf(a) - salesSheets.indexOf(b)
    return sheetTotal(dataBySheet[b.id]?.orders ?? []) - sheetTotal(dataBySheet[a.id]?.orders ?? [])
  })
  const maximum = Math.max(1, ...salesSheets.map((sheet) => sheetTotal(filteredOrdersForSheet(sheet))))
  const monthlyChartData = salesSheets.map((sheet) => {
    const sheetOrders = filteredOrdersForSheet(sheet)
    const expenses = (monthlyExpensesBySheet[sheet.id] ?? []).reduce((sum, expense) => sum + expense.amount, 0)
    const profit = getProfitSummary(sheetOrders, expenses)
    return {
      label: sheetTitle(sheet, t),
      shortLabel: new Intl.DateTimeFormat(language, { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(sheet.year, MONTH_INDEX[sheet.monthKey] ?? 0, 1))),
      sales: sheetTotal(sheetOrders),
      netProfit: profit.amount,
      profitPartial: profit.amount !== null && !profit.complete,
    }
  })
  const topItemTotals = new Map<string, { name: string; attributes: string; quantity: number; sales: number; profit: number; lineCount: number; knownProfitLines: number; image?: string }>()
  for (const order of scopedOrders) {
    order.lines.forEach((line) => {
      const baseName = (line.itemName || line.imageName || '').trim()
      const image = line.images[0]
      if (!baseName && !image) return
      const attributes = line.attributes.map((attribute) => `${fieldLabel(attribute.key, t)}: ${attribute.value}`).join(' · ')
      const identity = baseName ? baseName.toLocaleLowerCase(language) : image!
      const key = `${identity}|${attributes.toLocaleLowerCase(language)}`
      const name = baseName || t('analytics.unnamedItem')
      const item = topItemTotals.get(key) ?? { name, attributes, quantity: 0, sales: 0, profit: 0, lineCount: 0, knownProfitLines: 0, image }
      item.quantity += line.quantity
      item.sales += line.salePrice
      item.lineCount += 1
      if (line.profitAmount !== null) {
        item.profit += line.profitAmount
        item.knownProfitLines += 1
      }
      item.image ||= image
      topItemTotals.set(key, item)
    })
  }
  const topItems = [...topItemTotals.values()]
    .sort((a, b) => b.quantity - a.quantity || b.sales - a.sales || a.name.localeCompare(b.name, language))
    .slice(0, 3)

  return (
    <section className="app-screen analytics-screen" aria-label={t('screen.analytics')}>
      <ScreenHeader
        actions={loading || analyticsDataLoading ? <span className="icon-button" role="status" aria-label={t('sheet.loadingShort')}><LoaderCircle size={22} className="animate-spin" /></span> : undefined}
      />
      <div className="screen-surface">
      <div className="surface-scroll">
        <Dropdown variant="bar" className="info-bar month-picker" aria-label={t('analytics.monthPicker')} value={currentSheet.id} onChange={(event) => setSelectedSheetId(event.target.value)}
          triggerContent={<><CalendarDays size={21} /><span className="info-bar-text"><small>{t('analytics.monthPicker')}</small><strong>{sheetTitle(currentSheet, t)} · {currentSheet.year}</strong></span><ChevronDown size={16} className="info-bar-end" /></>}>
          {salesSheets.map((sheet) => <option key={sheet.id} value={sheet.id}>{sheetTitle(sheet, t)} · {sheet.year}</option>)}
        </Dropdown>
        <div className="pill-row mb-4" role="group" aria-label={t('filters.status')}>
          {STATUS_FILTERS.map((filter) => <button type="button" className="pill" key={filter} aria-pressed={statusFilter === filter} onClick={() => setStatusFilter(filter)}><span aria-hidden="true">{statusFilterEmoji(filter)}</span>{statusFilterLabel(filter, t)}<span className="pill-count">{currentOrders.filter((order) => orderMatchesStatus(order, filter)).length}</span></button>)}
        </div>
        {loading || analyticsDataLoading ? <div className="metric-grid" aria-busy="true" aria-label={t('sheet.loading')}>
          {Array.from({ length: 4 }, (_, index) => <div className="grid min-h-[96px] content-center gap-3 rounded-3xl bg-mist p-4" key={index} aria-hidden="true"><SkeletonLine className="h-3 w-2/5" /><SkeletonLine className="h-6 w-3/4" /><SkeletonLine className="h-2.5 w-1/2" /></div>)}
        </div> : <>
          <div className="metric-grid">
            <article className="metric-card featured"><Sparkle size={26} /><span>{statusFilter === 'all' ? t('analytics.selectedMonthSales') : t('analytics.filteredSales')}</span><strong>{formatMoney(sheetTotal(scopedOrders), language)} <small>THB</small></strong></article>
            <article className="metric-card"><span>{t('analytics.totalProfit')}</span><strong className={scopedProfit.amount === null ? 'profit-unavailable' : scopedProfit.amount < 0 ? 'negative-text' : 'positive-text'}>{scopedProfit.amount === null ? '—' : `${formatMoney(scopedProfit.amount, language)} THB`}</strong><em>{scopedProfit.amount === null ? t('analytics.noPeriodProfit') : scopedProfit.knownLines < scopedProfit.totalLines ? t('analytics.profitCoverage', { known: scopedProfit.knownLines, total: scopedProfit.totalLines }) : statusFilter === 'all' ? t('analytics.currentScopeProfit') : t('analytics.filteredScopeProfit')}</em></article>
            <article className={`metric-card trend-card${currentSalesChange === null ? ' unavailable' : currentSalesChange < 0 ? ' negative' : ' positive'}`}>
              <span>{t('analytics.monthlyChange')}</span>
              <strong>{formatSignedPercent(currentSalesChange, language)}</strong>
              <em>{previousSalesSheet && currentSalesChange !== null ? t('analytics.changeContext', { month: sheetTitle(previousSalesSheet, t) }) : t('analytics.noComparison')}</em>
            </article>
            <article className="metric-card"><span>{t('analytics.orders')}</span><strong>{scopedOrders.length}</strong></article>
          </div>
          <details className="analytics-more-metrics">
            <summary>{t('analytics.moreMetrics')}</summary>
            <div className="metric-grid">
              <article className={`metric-card trend-card${yearOverYearChange === null ? ' unavailable' : yearOverYearChange < 0 ? ' negative' : ' positive'}`}>
                <span>{t('analytics.yearlyChange')}</span>
                <strong>{formatSignedPercent(yearOverYearChange, language)}</strong>
                <em>{previousYearSheet && yearOverYearChange !== null ? t('analytics.yearlyContext', { year: currentYear - 1 }) : t('analytics.noYearlyComparison')}</em>
              </article>
              <article className="metric-card"><span>{t('analytics.averageSales')}</span><strong>{formatMoney(averageSales, language)} <small>THB</small></strong><em>{t('analytics.averageMonths', { count: populatedSalesSheets.length })}</em></article>
              <article className="metric-card"><span>{t('analytics.averageProfit')}</span><strong>{averageProfit === null ? '—' : `${formatMoney(averageProfit, language)} THB`}</strong><em>{averageProfit === null ? t('analytics.noProfitData') : t('analytics.profitSample', { count: recordedProfits.length })}</em></article>
              <article className="metric-card"><span>{t('analytics.items')}</span><strong>{scopedOrders.reduce((sum, order) => sum + order.quantity, 0)}</strong></article>
              <article className="metric-card"><span>{t('analytics.shipped')}</span><strong>{shipped}</strong></article>
            </div>
          </details>
        </>}

        <section className="analytics-section top-items-section" aria-labelledby="top-items-heading">
          <div className="section-head"><h2 className="display" id="top-items-heading">{t('analytics.topItems')}</h2><span>{t('analytics.topItemsHint')}</span></div>
          {loading || analyticsDataLoading
            ? <div className="cart-list" aria-busy="true">{Array.from({ length: 3 }, (_, index) => <div className="cart-row" key={index} aria-hidden="true"><SkeletonLine className="size-[92px] rounded-3xl" /><div className="grid gap-2"><SkeletonLine className="h-5 w-3/4" /><SkeletonLine className="h-3 w-1/2" /></div></div>)}</div>
            : topItems.length > 0
              ? <ol className="cart-list top-items-list">
                {topItems.map((item, index) => (
                  <li className="cart-row" key={`${item.name}-${item.attributes}-${index}`}>
                    <span className="cart-thumb"><ProductImage src={item.image} alt={item.name} /><span className="top-item-rank display" aria-hidden="true">#{index + 1}</span></span>
                    <div className="cart-body">
                      <strong className="cart-title display" title={item.name}>{item.name}</strong>
                      {item.attributes && <span className="cart-sub">{item.attributes}</span>}
                      <span className="cart-sub">{t('analytics.unitsSold', { count: item.quantity })}</span>
                      <span className="cart-price-row">
                        <span className="cart-price display">{formatMoney(item.sales, language)} THB</span>
                        <span className={`profit-chip${item.knownProfitLines === 0 ? ' unavailable' : ''}`}>{t(item.knownProfitLines > 0 && item.knownProfitLines < item.lineCount ? 'analytics.partialItemProfit' : 'analytics.itemProfit')} {item.knownProfitLines === 0 ? '—' : `${formatMoney(item.profit, language)} THB`}</span>
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
              : <p className="sheet-message">{t('analytics.topItemsEmpty')}</p>}
        </section>

        <section className="analytics-section">
          <div className="section-head"><h2 className="display">{t('analytics.statusTitle')}</h2></div>
          {analyticsDataLoading ? <div className="grid gap-3" aria-busy="true" aria-label={t('sheet.loading')}>{Array.from({ length: 6 }, (_, index) => <div className="flex items-center justify-between gap-3" key={index} aria-hidden="true"><SkeletonLine className="h-6 w-28 rounded-full" /><SkeletonLine className="h-4 w-8" /></div>)}</div> : <div className="status-summary-grid">
          <div className="status-summary-row"><StatusBadge type="payment" status="จ่ายเต็ม" /><strong>{paid}</strong></div>
          <div className="status-summary-row"><StatusBadge type="payment" status="มัดจำ" /><strong>{deposits}</strong></div>
          <div className="status-summary-row"><StatusBadge type="shipping" status="ส่งแล้ว" /><strong>{shipped}</strong></div>
          <div className="status-summary-row"><StatusBadge type="shipping" status="ยังไม่ได้สั่ง" /><strong>{scopedOrders.filter((order) => order.shippingStatus === 'ยังไม่ได้สั่ง').length}</strong></div>
          <div className="status-summary-row"><StatusBadge type="shipping" status="สั่งแล้ว" /><strong>{scopedOrders.filter((order) => order.shippingStatus === 'สั่งแล้ว').length}</strong></div>
          <div className="status-summary-row"><StatusBadge type="shipping" status="รอเข้าไทย" /><strong>{inbound}</strong></div>
          </div>}
        </section>

        <section className="analytics-section analytics-chart-section">
          <div className="section-head"><h2 className="display">{t('analytics.salesProfitGraph')}</h2></div>
          <div className="analytics-chart-container">
            {analyticsDataLoading ? <SkeletonLine className="h-full w-full rounded-xl" /> : <Suspense fallback={<SkeletonLine className="h-full w-full rounded-xl" />}><AnalyticsChart data={monthlyChartData} salesLabel={t('analytics.sales')} profitLabel={t('analytics.totalProfit')} partialLabel={t('sheets.partialProfit')} formatMoney={(value) => formatMoney(value, language)} /></Suspense>}
          </div>
          <p className="chart-data-note">{hasSalesLoadError ? t('analytics.partialDataNote') : t('analytics.chartProfitNote')}</p>
        </section>

        <section className="analytics-section sales-by-month">
          <div className="section-head"><h2 className="display">{t('analytics.monthlySales')}</h2><Dropdown variant="pill" align="end" aria-label={t('filters.sort')} value={monthlySort} onChange={(event) => setMonthlySort(event.target.value)}><option value="sales-desc">{t('filters.salesHigh')}</option><option value="sales-asc">{t('filters.salesLow')}</option><option value="month">{t('filters.monthOrder')}</option></Dropdown></div>
          {analyticsDataLoading ? <div className="grid gap-1" aria-busy="true" aria-label={t('sheet.loading')}>{Array.from({ length: 6 }, (_, index) => <div className="flex min-h-10 items-center gap-3" key={index} aria-hidden="true"><SkeletonLine className="h-3 w-16" /><SkeletonLine className="h-2 flex-1 rounded-full" /><SkeletonLine className="h-3 w-12" /></div>)}</div> : sortedSalesSheets.map((sheet) => {
            const sheetOrders = filteredOrdersForSheet(sheet)
            const amount = sheetTotal(sheetOrders)
            const sheetIndex = salesSheets.findIndex((item) => item.id === sheet.id)
            const previousSheet = sheetIndex > 0 ? salesSheets[sheetIndex - 1] : undefined
            const previousState = previousSheet ? dataBySheet[previousSheet.id] : undefined
            const monthDate = comparisonDate
            const isThisMonth = sheet.year === monthDate.getFullYear() && MONTH_INDEX[sheet.monthKey] === monthDate.getMonth()
            const isFutureMonth = sheet.year > monthDate.getFullYear() || (sheet.year === monthDate.getFullYear() && MONTH_INDEX[sheet.monthKey] > monthDate.getMonth())
            const previousOrders = previousSheet ? filteredOrdersForSheet(previousSheet) : EMPTY_ORDERS
            const currentAmountForChange = isThisMonth ? sheetSalesThroughDay(sheetOrders, monthDate.getDate()) : amount
            const previousAmountForChange = previousSheet && previousState && !previousState.error
              ? isThisMonth ? sheetSalesThroughDay(previousOrders, monthDate.getDate()) : sheetTotal(previousOrders)
              : undefined
            const change = dataBySheet[sheet.id] && !dataBySheet[sheet.id].error && !isFutureMonth ? getPercentChange(currentAmountForChange, previousAmountForChange) : null
            const width = Math.max(amount > 0 ? 5 : 0, Math.round((amount / maximum) * 100))
            return <button type="button" className="monthly-bar-row" key={sheet.id} onClick={() => navigate(`/admin/sheets/${sheet.id}`)}><span className="monthly-bar-month">{sheetTitle(sheet, t)}<small className={change === null ? 'trend-unavailable' : change < 0 ? 'negative-text' : 'positive-text'}>{change === null ? '—' : `${formatSignedPercent(change, language)}${isThisMonth ? ' MTD' : ' MoM'}`}</small></span><span className="monthly-bar"><i style={{ width: `${width}%` }} /></span><strong>{formatMoney(amount, language)} THB</strong></button>
          })}
        </section>
      </div>
      </div>
      <BottomNavigation />
    </section>
  )
}

function App() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [dataBySheet, setDataBySheet] = useState<Record<string, SheetDataState>>({})
  const [localOrdersBySheet, setLocalOrdersBySheet] = useState<Record<string, SheetOrder[]>>({})
  const [monthlyExpensesBySheet, setMonthlyExpensesBySheet] = useState<Record<string, MonthlyExpense[]>>({})
  const [monthlyExpenseRevisionsBySheet, setMonthlyExpenseRevisionsBySheet] = useState<Record<string, number>>({})
  const [localSheets, setLocalSheets] = useState<SheetDefinition[]>([])
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_CNY_TO_THB)
  const [localOrdersReady, setLocalOrdersReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [initialDataReady, setInitialDataReady] = useState(false)
  const [analyticsDataLoading, setAnalyticsDataLoading] = useState(false)
  const [backupLoading, setBackupLoading] = useState(false)
  const [backupMessage, setBackupMessage] = useState('')
  const [rangeExportLoading, setRangeExportLoading] = useState(false)
  const [rangeExportMessage, setRangeExportMessage] = useState('')
  const [exportingReportId, setExportingReportId] = useState<string | null>(null)
  const [exportMessage, setExportMessage] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const refreshTargetIdsRef = useRef<string[] | null>(null)
  const refreshInFlightRef = useRef(false)
  const [bootReady, setBootReady] = useState(false)
  const isAdminPath = location.pathname === '/admin' || location.pathname.startsWith('/admin/')
  const allSheets = useMemo(() => [...SHEETS, ...localSheets], [localSheets])

  const applyServerSnapshot = useCallback((snapshot: Record<string, unknown> | null) => {
    const deviceOrders = loadLocalOrders()
    const deviceExpenses = loadMonthlyExpenses()
    const deviceSheets = loadLocalSheets()
    if (snapshot) {
      const serverOrders = snapshot.localOrdersBySheet && typeof snapshot.localOrdersBySheet === 'object' ? snapshot.localOrdersBySheet as Record<string, SheetOrder[]> : {}
      const serverExpenses = snapshot.monthlyExpensesBySheet && typeof snapshot.monthlyExpensesBySheet === 'object' ? snapshot.monthlyExpensesBySheet as Record<string, MonthlyExpense[]> : {}
      const serverSheets = Array.isArray(snapshot.localSheets) ? snapshot.localSheets as SheetDefinition[] : []
      const serverExpenseRevisions = snapshot.monthlyExpenseRevisionsBySheet && typeof snapshot.monthlyExpenseRevisionsBySheet === 'object' ? snapshot.monthlyExpenseRevisionsBySheet as Record<string, number> : {}
      const deviceExpenseRevisions = loadMonthlyExpenseRevisions()
      setLocalOrdersBySheet(mergeSyncedOrderMaps(serverOrders, deviceOrders))
      setMonthlyExpensesBySheet(mergeMonthlyExpensesByRevision(serverExpenses, serverExpenseRevisions, deviceExpenses, deviceExpenseRevisions))
      const mergedExpenseRevisions = { ...serverExpenseRevisions }
      for (const [sheetId, updatedAt] of Object.entries(deviceExpenseRevisions)) mergedExpenseRevisions[sheetId] = Math.max(mergedExpenseRevisions[sheetId] ?? 0, updatedAt)
      setMonthlyExpenseRevisionsBySheet(mergedExpenseRevisions)
      setLocalSheets(mergeLocalSheets(serverSheets, deviceSheets))
      setExchangeRate(Number(snapshot.exchangeRate) > 0 ? Number(snapshot.exchangeRate) : loadExchangeRate())
      const localLanguage = (() => {
        try { return localStorage.getItem('sweetie-language') } catch { return null }
      })()
      const language = localLanguage === 'th' || localLanguage === 'en'
        ? localLanguage
        : snapshot.language === 'th' || snapshot.language === 'en' ? snapshot.language : 'th'
      void i18n.changeLanguage(language)
      try { localStorage.setItem('sweetie-language', language) } catch { /* Keep the language for this session. */ }
      document.documentElement.lang = language
    } else {
      setLocalOrdersBySheet(deviceOrders)
      setMonthlyExpensesBySheet(deviceExpenses)
      setMonthlyExpenseRevisionsBySheet(loadMonthlyExpenseRevisions())
      setLocalSheets(deviceSheets)
      setExchangeRate(loadExchangeRate())
    }
    setLocalOrdersReady(true)
    setIsAdminAuthenticated(true)
    setInitialDataReady(false)
    setLoading(true)
  }, [i18n])

  useEffect(() => {
    let cancelled = false
    const restoreSession = async () => {
      try {
        const authResponse = await fetch('/api/auth', { credentials: 'include', cache: 'no-store' })
        if (authResponse.ok) {
          const session = await authResponse.json() as { authenticated?: boolean }
          if (session.authenticated) {
            const dataResponse = await fetch('/api/data', { credentials: 'include', cache: 'no-store' })
            if (dataResponse.status === 401) return
            if (!dataResponse.ok) throw new Error('Could not load the shared data snapshot.')
            const data = await dataResponse.json() as { snapshot?: Record<string, unknown> | null }
            if (!cancelled) applyServerSnapshot(data.snapshot ?? null)
          }
        }
      } catch {
        // Keep the sign-in screen available if the sync service is offline.
      } finally {
        if (!cancelled) setAuthChecking(false)
      }
    }
    void restoreSession()
    return () => { cancelled = true }
  }, [applyServerSnapshot])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setBootReady(true), 1000)
    return () => window.clearTimeout(timeoutId)
  }, [])

  useEffect(() => {
    if (!isAdminAuthenticated || !isAdminPath) return
    const forcedTargets = refreshTargetIdsRef.current
    refreshTargetIdsRef.current = null
    const pathname = location.pathname
    const selectedSheetId = pathname.startsWith('/admin/sheets/') ? pathname.split('/')[3] : ''
    const targetSheets = forcedTargets
      ? allSheets.filter((sheet) => forcedTargets.includes(sheet.id))
      : pathname === '/admin/settings' ? []
        : pathname === '/admin/analytics' ? allSheets.filter((sheet) => sheet.kind === 'sales')
          : pathname === '/admin/orders' ? [getCurrentMonthSheet(dataBySheet, allSheets)]
            : selectedSheetId ? allSheets.filter((sheet) => sheet.id === selectedSheetId)
              : allSheets
    const hasLoadedTargets = targetSheets.length > 0 && targetSheets.every((sheet) => Boolean(dataBySheet[sheet.id]))
    if (!forcedTargets && (targetSheets.length === 0 || hasLoadedTargets)) {
      setLoading(false)
      setInitialDataReady(true)
      return
    }
    if (targetSheets.length === 0) {
      setLoading(false)
      setInitialDataReady(true)
      refreshInFlightRef.current = false
      return
    }
    const controller = new AbortController()
    fetchAllSheets(controller.signal, targetSheets, pathname === '/admin/home' ? HOME_SHEET_BATCH_SIZE : 120)
      .then((result) => setDataBySheet((current) => ({ ...current, ...result })))
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
          setInitialDataReady(true)
          refreshInFlightRef.current = false
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
          setInitialDataReady(true)
          refreshInFlightRef.current = false
        }
      })
    return () => {
      controller.abort()
      refreshInFlightRef.current = false
    }
  }, [refreshKey, isAdminAuthenticated, isAdminPath, location.pathname, allSheets, dataBySheet])

  useEffect(() => {
    if (!isAdminAuthenticated || !localOrdersReady) return
    try {
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(localOrdersBySheet))
    } catch {
      // The current session remains usable if browser storage is full or disabled.
    }
  }, [localOrdersBySheet, isAdminAuthenticated, localOrdersReady])

  useEffect(() => {
    if (!isAdminAuthenticated || !localOrdersReady) return
    try {
      localStorage.setItem(MONTHLY_EXPENSES_KEY, JSON.stringify(monthlyExpensesBySheet))
      localStorage.setItem(MONTHLY_EXPENSE_REVISIONS_KEY, JSON.stringify(monthlyExpenseRevisionsBySheet))
      localStorage.setItem(EXCHANGE_RATE_KEY, String(exchangeRate))
    } catch {
      // Expense and exchange-rate settings remain active for this app session if storage is unavailable.
    }
  }, [monthlyExpensesBySheet, monthlyExpenseRevisionsBySheet, exchangeRate, isAdminAuthenticated, localOrdersReady])
  useEffect(() => {
    if (!isAdminAuthenticated || !localOrdersReady) return
    try {
      localStorage.setItem(LOCAL_SHEETS_KEY, JSON.stringify(localSheets))
    } catch {
      // Custom sheets remain usable for this app session if browser storage is unavailable.
    }
  }, [localSheets, isAdminAuthenticated, localOrdersReady])

  const activePageLoadsRef = useRef(new Set<string>())
  const analyticsLoadRef = useRef(false)
  const homeLoadRef = useRef(false)
  const homeLoadAbortRef = useRef<AbortController | null>(null)

  const loadMoreSheetData = useCallback(async (sheetId: string) => {
    const sheet = allSheets.find((item) => item.id === sheetId)
    const current = dataBySheet[sheetId]
    if (!sheet || !current?.hasMore || activePageLoadsRef.current.has(sheetId)) return
    activePageLoadsRef.current.add(sheetId)
    setDataBySheet((latest) => ({ ...latest, [sheetId]: { ...(latest[sheetId] ?? current), loadingMore: true, loadMoreError: undefined } }))
    try {
      const page = await fetchSheetOrdersPage(sheet, current.nextOffset ?? 0, current.parserState)
      setDataBySheet((previous) => {
        const latest = previous[sheetId] ?? current
        return {
          ...previous,
          [sheetId]: {
            ...latest,
            orders: [...new Map([...latest.orders, ...page.orders].map((order) => [order.id, order])).values()],
            hasMore: page.hasMore,
            nextOffset: page.nextOffset ?? undefined,
            parserState: page.parserState,
            loadingMore: false,
            loadMoreError: undefined,
          },
        }
      })
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not load more orders.'
      setDataBySheet((previous) => ({ ...previous, [sheetId]: { ...(previous[sheetId] ?? current), loadingMore: false, loadMoreError: message } }))
    } finally {
      activePageLoadsRef.current.delete(sheetId)
    }
  }, [allSheets, dataBySheet])

  const loadAllHomeSheets = useCallback(async () => {
    if (homeLoadRef.current) return
    homeLoadRef.current = true
    const controller = new AbortController()
    homeLoadAbortRef.current = controller
    try {
      // Load one sheet page at a time (100 source rows per request) to keep API traffic bounded.
      for (const sheet of allSheets) {
        if (!sheet.gid || controller.signal.aborted) continue
        let current = dataBySheet[sheet.id]
        if (!current || current.error || current.loadMoreError) continue
        while (current.hasMore && !current.loadMoreError && !controller.signal.aborted) {
          if (activePageLoadsRef.current.has(sheet.id)) break
          activePageLoadsRef.current.add(sheet.id)
          setDataBySheet((previous) => ({ ...previous, [sheet.id]: { ...(previous[sheet.id] ?? current!), loadingMore: true, loadMoreError: undefined } }))
          try {
            const page = await fetchSheetOrdersPage(sheet, current.nextOffset ?? 0, current.parserState, controller.signal, HOME_SHEET_BATCH_SIZE)
            current = {
              ...current,
              orders: [...new Map([...current.orders, ...page.orders].map((order) => [order.id, order])).values()],
              hasMore: page.hasMore,
              nextOffset: page.nextOffset ?? undefined,
              parserState: page.parserState,
              loadingMore: false,
              loadMoreError: undefined,
            }
            setDataBySheet((previous) => ({ ...previous, [sheet.id]: { ...(previous[sheet.id] ?? current!), ...current! } }))
          } catch (cause) {
            if (controller.signal.aborted) break
            const message = cause instanceof Error ? cause.message : 'Could not load more orders.'
            current = { ...current, loadingMore: false, loadMoreError: message }
            setDataBySheet((previous) => ({ ...previous, [sheet.id]: { ...(previous[sheet.id] ?? current!), ...current! } }))
          } finally {
            activePageLoadsRef.current.delete(sheet.id)
          }
        }
      }
    } finally {
      if (homeLoadAbortRef.current === controller) homeLoadAbortRef.current = null
      homeLoadRef.current = false
    }
  }, [allSheets, dataBySheet])

  useEffect(() => {
    if (!isAdminAuthenticated || location.pathname !== '/admin/home' || loading) return
    const timer = window.setTimeout(() => { void loadAllHomeSheets() }, 0)
    return () => window.clearTimeout(timer)
  }, [isAdminAuthenticated, location.pathname, loading, loadAllHomeSheets])

  const loadAllSalesSheets = useCallback(async () => {
    if (analyticsLoadRef.current) return
    analyticsLoadRef.current = true
    setAnalyticsDataLoading(true)
    try {
      for (const sheet of allSheets.filter((item) => item.kind === 'sales' && !item.customName)) {
        let current = dataBySheet[sheet.id]
        while (current?.hasMore && !current.loadMoreError) {
          if (activePageLoadsRef.current.has(sheet.id)) break
          activePageLoadsRef.current.add(sheet.id)
          try {
            const page = await fetchSheetOrdersPage(sheet, current.nextOffset ?? 0, current.parserState)
            current = {
              ...current,
              orders: [...current.orders, ...page.orders],
              hasMore: page.hasMore,
              nextOffset: page.nextOffset ?? undefined,
              parserState: page.parserState,
              loadingMore: false,
              loadMoreError: undefined,
            }
            setDataBySheet((previous) => ({ ...previous, [sheet.id]: current! }))
          } catch (cause) {
            const message = cause instanceof Error ? cause.message : 'Could not load more orders.'
            current = { ...current, loadingMore: false, loadMoreError: message }
            setDataBySheet((previous) => ({ ...previous, [sheet.id]: current! }))
          } finally {
            activePageLoadsRef.current.delete(sheet.id)
          }
        }
      }
    } finally {
      analyticsLoadRef.current = false
      setAnalyticsDataLoading(false)
    }
  }, [allSheets, dataBySheet])

  const syncSnapshot = useCallback(async () => {
    const response = await fetch('/api/data', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        version: 1,
        localOrdersBySheet,
        monthlyExpensesBySheet,
        monthlyExpenseRevisionsBySheet,
        localSheets,
        exchangeRate,
        language: i18n.resolvedLanguage === 'th' ? 'th' : 'en',
      }),
    })
    if (response.status === 401) throw new Error('Your secure session has expired.')
    if (!response.ok) throw new Error(`Sync failed (${response.status}).`)
  }, [exchangeRate, i18n.resolvedLanguage, localOrdersBySheet, localSheets, monthlyExpensesBySheet, monthlyExpenseRevisionsBySheet])

  const syncNow = useCallback(async () => {
    try {
      await syncSnapshot()
    } catch {
      // Automatic sync retries on the next local change or app session.
    }
  }, [syncSnapshot])

  useEffect(() => {
    if (!isAdminAuthenticated || !localOrdersReady) return
    const timer = window.setTimeout(() => { void syncNow() }, 650)
    return () => window.clearTimeout(timer)
  }, [isAdminAuthenticated, localOrdersReady, localOrdersBySheet, monthlyExpensesBySheet, localSheets, exchangeRate, i18n.resolvedLanguage, syncNow])

  const mergedDataBySheet = useMemo(() => Object.fromEntries(allSheets.map((sheet) => {
    const remote = dataBySheet[sheet.id] ?? { orders: [] }
    const localOrders = localOrdersBySheet[sheet.id] ?? []
    const localById = new Map(localOrders.map((order) => [order.id, order]))
    const remoteIds = new Set(remote.orders.map((order) => order.id))
    const overriddenRemote = remote.orders.map((order) => localById.get(order.id) ?? order)
    const newLocalOrders = localOrders.filter((order) => !remoteIds.has(order.id))
    return [sheet.id, { ...remote, orders: [...newLocalOrders, ...overriddenRemote] }]
  })), [allSheets, dataBySheet, localOrdersBySheet])

  const getCompleteOrdersForSheet = useCallback(async (sheetId: string) => {
    const sheet = allSheets.find((item) => item.id === sheetId)
    if (!sheet) return []
    const remoteOrders = sheet.customName ? [] : await fetchSheetOrders(sheet)
    return mergeOrderOverrides(remoteOrders, localOrdersBySheet[sheetId] ?? [])
  }, [allSheets, localOrdersBySheet])

  const exportMonthlyReport = useCallback(async (sheetId: string) => {
    const sheet = allSheets.find((item) => item.id === sheetId)
    if (!sheet) return
    setExportingReportId(sheetId)
    setExportMessage('')
    try {
      const orders = await getCompleteOrdersForSheet(sheetId)
      const expenses = monthlyExpensesBySheet[sheetId] ?? []
      const expenseTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0)
      const grossSales = orders.reduce((sum, order) => sum + (order.grossSales ?? order.lines.reduce((lineSum, line) => lineSum + line.salePrice, 0)), 0)
      const discounts = orders.reduce((sum, order) => sum + (order.campaignDiscount ?? 0), 0)
      const profit = getProfitSummary(orders, expenseTotal)
      const rows: Array<Array<string | number | null | undefined>> = [
        ['Sweetie Station monthly report', sheetTitle(sheet, t)],
        ['Exported at', new Date().toISOString()],
        ['Orders', orders.length],
        ['Gross sales (THB)', grossSales],
        ['Campaign discounts (THB)', discounts],
        ['Net sales (THB)', sheetTotal(orders)],
        ['Monthly expenses (THB)', expenseTotal],
        ['Net profit (THB)', profit.complete ? profit.amount : 'Incomplete cost data'],
        [],
        ['Order date', 'Customer', 'LINE', 'Items', 'Quantity', 'Gross sales (THB)', 'Campaign', 'Discount (THB)', 'Net sales (THB)', 'Paid (THB)', 'Deposit due (THB)', 'Unit cost (CNY)', 'Product cost (THB)', 'Product profit after campaign (THB)', 'FX rate (THB/CNY)', 'Payment status', 'Shipping status'],
        ...orders.map((order) => {
          const orderGross = order.grossSales ?? order.lines.reduce((sum, line) => sum + line.salePrice, 0)
          const unitCostRMB = order.lines.reduce((sum, line) => sum + (line.costRMB ?? 0) * line.quantity, 0)
          const costTHB = order.lines.reduce((sum, line) => sum + (line.costTHB ?? 0), 0)
          const orderProfit = getProfitSummary([order])
          return [
            formatOrderDate(order.day, sheet, i18n.resolvedLanguage ?? 'en'),
            order.customerName,
            order.lineName,
            order.lines.map((line) => `${line.itemName || 'Item'} × ${line.quantity}`).join('; '),
            order.quantity,
            orderGross,
            order.isCampaign ? 'Yes' : 'No',
            order.campaignDiscount ?? 0,
            order.totalSales,
            getPaidTotal(order),
            getDepositDue(order, order.totalSales),
            unitCostRMB,
            costTHB,
            orderProfit.amount,
            order.exchangeRate ?? '',
            paymentStatusLabel(order.paymentStatus, t),
            shippingStatusLabel(order.shippingStatus, t),
          ]
        }),
        [],
        ['Monthly expenses'],
        ['Category', 'Description', 'Amount (THB)'],
        ...expenses.map((expense) => [t(`expenses.${expense.category}`), expense.description, expense.amount]),
      ]
      const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`
      downloadFile(`sweetie-${sheet.id}-monthly-report-${getCurrentDate().toISOString().slice(0, 10)}.csv`, csv, 'text/csv;charset=utf-8')
      setExportMessage(t('backup.reportSuccess'))
    } catch {
      setExportMessage(t('backup.reportError'))
    } finally {
      setExportingReportId(null)
      window.setTimeout(() => setExportMessage(''), 4500)
    }
  }, [allSheets, getCompleteOrdersForSheet, i18n.resolvedLanguage, monthlyExpensesBySheet, t])

  const exportFullBackup = useCallback(async () => {
    setBackupLoading(true)
    setBackupMessage('')
    try {
      const remoteOrdersBySheet: Record<string, SheetOrder[]> = {}
      const remoteSheets = allSheets.filter((sheet) => !sheet.customName)
      let nextIndex = 0
      const worker = async () => {
        while (nextIndex < remoteSheets.length) {
          const sheet = remoteSheets[nextIndex]
          nextIndex += 1
          remoteOrdersBySheet[sheet.id] = await fetchSheetOrders(sheet)
        }
      }
      await Promise.all(Array.from({ length: Math.min(3, remoteSheets.length) }, worker))
      const ordersBySheet = Object.fromEntries(allSheets.map((sheet) => [sheet.id, mergeOrderOverrides(remoteOrdersBySheet[sheet.id] ?? [], localOrdersBySheet[sheet.id] ?? [])]))
      const backup = {
        format: 'sweetie-station-backup',
        version: 1,
        exportedAt: new Date().toISOString(),
        language: i18n.resolvedLanguage ?? 'en',
        exchangeRate,
        sheets: allSheets,
        ordersBySheet,
        monthlyExpensesBySheet,
        monthlyExpenseRevisionsBySheet,
      }
      downloadFile(`sweetie-station-backup-${getCurrentDate().toISOString().slice(0, 10)}.json`, JSON.stringify(backup, null, 2), 'application/json;charset=utf-8')
      setBackupMessage(t('backup.success'))
    } catch {
      setBackupMessage(t('backup.error'))
    } finally {
      setBackupLoading(false)
      window.setTimeout(() => setBackupMessage(''), 5000)
    }
  }, [allSheets, exchangeRate, i18n.resolvedLanguage, localOrdersBySheet, monthlyExpensesBySheet, monthlyExpenseRevisionsBySheet, t])

  const exportDateRange = useCallback(async (fromDate: string, toDate: string) => {
    if (!fromDate || !toDate || fromDate > toDate) return
    setRangeExportLoading(true)
    setRangeExportMessage('')
    try {
      const fromMonth = fromDate.slice(0, 7)
      const toMonth = toDate.slice(0, 7)
      const exportSheets = allSheets.filter((sheet) => {
        const monthIndex = MONTH_INDEX[sheet.monthKey]
        if (!Number.isInteger(monthIndex)) return false
        const sheetMonth = `${sheet.year}-${String(monthIndex + 1).padStart(2, '0')}`
        return sheetMonth >= fromMonth && sheetMonth <= toMonth
      })
      const ordersBySheet: Record<string, SheetOrder[]> = {}
      let nextIndex = 0
      const worker = async () => {
        while (nextIndex < exportSheets.length) {
          const sheet = exportSheets[nextIndex]
          nextIndex += 1
          ordersBySheet[sheet.id] = await getCompleteOrdersForSheet(sheet.id)
        }
      }
      await Promise.all(Array.from({ length: Math.min(3, exportSheets.length) }, worker))
      const exportOrders = exportSheets.flatMap((sheet) => (ordersBySheet[sheet.id] ?? [])
        .map((order) => ({ sheet, order, date: getDateInputValue(order.day, sheet) }))
        .filter(({ date }) => date >= fromDate && date <= toDate))
        .sort((a, b) => a.date.localeCompare(b.date) || a.sheet.id.localeCompare(b.sheet.id) || a.order.sheetRow - b.order.sheetRow)
      const grossTotal = exportOrders.reduce((sum, { order }) => sum + (order.grossSales ?? order.lines.reduce((lineSum, line) => lineSum + line.salePrice, 0)), 0)
      const discountTotal = exportOrders.reduce((sum, { order }) => sum + (order.campaignDiscount ?? 0), 0)
      const salesTotal = exportOrders.reduce((sum, { order }) => sum + order.totalSales, 0)
      const rows: Array<Array<string | number | null | undefined>> = [
        ['Sweetie Station order export'],
        ['Date range', fromDate, toDate],
        ['Exported at', new Date().toISOString()],
        ['Orders', exportOrders.length],
        ['Gross sales (THB)', grossTotal],
        ['Campaign discounts (THB)', discountTotal],
        ['Net sales (THB)', salesTotal],
        [],
        ['Sheet', 'Order date', 'Customer', 'LINE', 'Items', 'Quantity', 'Gross sales (THB)', 'Campaign', 'Discount (THB)', 'Net sales (THB)', 'Paid (THB)', 'Deposit due (THB)', 'Unit cost (CNY)', 'Product cost (THB)', 'Product profit (THB)', 'FX rate (THB/CNY)', 'Payment status', 'Shipping status'],
        ...exportOrders.map(({ sheet, order }) => {
          const grossSales = order.grossSales ?? order.lines.reduce((sum, line) => sum + line.salePrice, 0)
          const unitCostRMB = order.lines.reduce((sum, line) => sum + (line.costRMB ?? 0) * line.quantity, 0)
          const costTHB = order.lines.reduce((sum, line) => sum + (line.costTHB ?? 0), 0)
          const orderProfit = getProfitSummary([order])
          return [
            sheetTitle(sheet, t),
            formatOrderDate(order.day, sheet, i18n.resolvedLanguage ?? 'en'),
            order.customerName,
            order.lineName,
            order.lines.map((line) => `${line.itemName || 'Item'} × ${line.quantity}`).join('; '),
            order.quantity,
            grossSales,
            order.isCampaign ? 'Yes' : 'No',
            order.campaignDiscount ?? 0,
            order.totalSales,
            getPaidTotal(order),
            getDepositDue(order, order.totalSales),
            unitCostRMB,
            costTHB,
            orderProfit.amount,
            order.exchangeRate ?? '',
            paymentStatusLabel(order.paymentStatus, t),
            shippingStatusLabel(order.shippingStatus, t),
          ]
        }),
      ]
      const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`
      downloadFile(`sweetie-orders-${fromDate}-to-${toDate}.csv`, csv, 'text/csv;charset=utf-8')
      setRangeExportMessage(t('backup.rangeSuccess'))
    } catch {
      setRangeExportMessage(t('backup.rangeError'))
    } finally {
      setRangeExportLoading(false)
      window.setTimeout(() => setRangeExportMessage(''), 5000)
    }
  }, [allSheets, getCompleteOrdersForSheet, i18n.resolvedLanguage, t])

  const refresh = useCallback(() => {
    if (refreshInFlightRef.current) return
    homeLoadAbortRef.current?.abort()
    homeLoadAbortRef.current = null
    homeLoadRef.current = false
    const pathname = location.pathname
    const selectedSheetId = pathname.startsWith('/admin/sheets/') ? pathname.split('/')[3] : ''
    const targets = pathname === '/admin/settings' ? []
      : pathname === '/admin/analytics' ? allSheets.filter((sheet) => sheet.kind === 'sales').map((sheet) => sheet.id)
        : pathname === '/admin/orders' ? [getCurrentMonthSheet(dataBySheet, allSheets).id]
          : selectedSheetId ? [selectedSheetId]
            : allSheets.map((sheet) => sheet.id)
    refreshTargetIdsRef.current = targets
    refreshInFlightRef.current = true
    setLoading(true)
    setRefreshKey((key) => key + 1)
  }, [allSheets, dataBySheet, location.pathname])

  const login = async (username: string, password: string) => {
    const response = await fetch('/api/auth', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (response.status === 401) return false
    if (!response.ok) throw new Error('Secure authentication is unavailable.')

    let snapshot: Record<string, unknown> | null = null
    const dataResponse = await fetch('/api/data', { credentials: 'include', cache: 'no-store' })
    if (dataResponse.status === 401) throw new Error('Could not establish the sync session.')
    if (!dataResponse.ok) throw new Error('Could not load the shared data snapshot.')
    const data = await dataResponse.json() as { snapshot?: Record<string, unknown> | null }
    snapshot = data.snapshot ?? null
    applyServerSnapshot(snapshot)
    navigate('/admin/home', { replace: true })
    return true
  }

  const logout = useCallback(async () => {
    try { await fetch('/api/auth', { method: 'DELETE', credentials: 'include' }) } catch { /* Local sign out still proceeds. */ }
    setIsAdminAuthenticated(false)
    setLocalOrdersBySheet({})
    setMonthlyExpensesBySheet({})
    setMonthlyExpenseRevisionsBySheet({})
    setLocalSheets([])
    setLocalOrdersReady(false)
    setDataBySheet({})
    setInitialDataReady(false)
    setLoading(false)
    navigate('/admin', { replace: true })
  }, [navigate])

  const saveMonthlyExpenses = (sheetId: string, expenses: MonthlyExpense[]) => {
    const updatedAt = Date.now()
    setMonthlyExpensesBySheet((current) => ({ ...current, [sheetId]: expenses.map((expense) => ({ ...expense, updatedAt })) }))
    setMonthlyExpenseRevisionsBySheet((current) => ({ ...current, [sheetId]: updatedAt }))
  }

  const saveOrderToSheet = async (sheetId: string, draft: OrderDraft, originalOrder?: SheetOrder) => {
    const rate = Number(draft.exchangeRate) > 0 ? Number(draft.exchangeRate) : exchangeRate
    const lines: SheetOrderLine[] = draft.lines.map((line, lineIndex) => {
      const salePrice = Number(line.salePrice) || 0
      const bankAmount = Number(line.bankAmount) || 0
      const costRMB = line.costRMB.trim() === '' ? null : Number(line.costRMB) || 0
      const costTHB = costRMB === null ? null : costRMB * rate * (Number(line.quantity) || 1)
      const sameOriginalInputs = line.originalSalePrice !== undefined
        && salePrice === line.originalSalePrice
        && (costRMB ?? null) === (line.originalCostRMB ?? null)
        && (costRMB === null || rate === line.originalExchangeRate)
      const profitAmount = sameOriginalInputs
        ? line.originalProfitAmount ?? null
        : costTHB === null ? null : salePrice - costTHB
      return {
        row: originalOrder?.lines[lineIndex]?.row ?? 0,
        itemName: line.itemName.trim(),
        imageName: line.imageName.trim() || undefined,
        quantity: Number(line.quantity) || 1,
        salePrice,
        bankAmount,
        depositAmount: Math.max(0, salePrice - bankAmount),
        profitAmount,
        profitPercent: profitAmount !== null && salePrice > 0 ? (profitAmount / salePrice) * 100 : null,
        costRMB,
        costTHB,
        images: line.images.length ? line.images : line.image ? [line.image] : [],
        attributes: line.attributes,
      }
    })
    const grossSales = lines.reduce((sum, line) => sum + line.salePrice, 0)
    const campaignDiscount = draft.isCampaign ? Math.min(grossSales, Number(draft.campaignDiscount) || 0) : 0
    const totalSales = Math.max(0, grossSales - campaignDiscount)
    const bankTotal = lines.reduce((sum, line) => sum + line.bankAmount, 0)
    const profitIsComplete = lines.length > 0 && lines.every((line) => line.profitAmount != null)
    const profitAmount = profitIsComplete ? lines.reduce((sum, line) => sum + (line.profitAmount ?? 0), 0) - campaignDiscount : null
    const order: SheetOrder = {
      id: originalOrder?.id ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sheetRow: originalOrder?.sheetRow ?? 0,
      day: draft.day,
      lineName: draft.lineName.trim(),
      lineUserId: draft.lineUserId.trim() || undefined,
      customerName: draft.customerName.trim(),
      paymentStatus: draft.paymentStatus || (bankTotal >= totalSales && totalSales > 0 ? 'จ่ายเต็ม' : bankTotal > 0 ? 'มัดจำ' : 'ยังไม่ได้ชำระ'),
      shippingStatus: draft.shippingStatus,
      lines,
      totalSales,
      grossSales,
      exchangeRate: rate,
      isCampaign: draft.isCampaign,
      campaignDiscount,
      bankTotal,
      depositTotal: Math.max(0, totalSales - bankTotal),
      profitAmount,
      profitPercent: profitIsComplete && totalSales > 0 ? (profitAmount! / totalSales) * 100 : null,
      quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
      isLocal: true,
      isOverride: originalOrder ? (!originalOrder.isLocal || originalOrder.isOverride) : false,
      updatedAt: Date.now(),
    }
    const targetSheet = allSheets.find((sheet) => sheet.id === sheetId)
    if (!targetSheet?.gid) throw new Error('This order is not linked to a Google Sheets tab.')
    const isUpdate = Boolean(originalOrder?.sheetRow && originalOrder.sheetRow > 0)
    const response = await fetch('/api/orders', {
      method: isUpdate ? 'PUT' : 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ gid: targetSheet.gid, order }),
    })
    const result = await response.json().catch(() => ({})) as { error?: string; orderId?: string; rowNumbers?: number[] }
    if (response.status === 401) {
      throw new Error('Your secure session has expired.')
    }
    if (!response.ok) {
      throw new Error(result.error || 'Could not save the order to Google Sheets.')
    }

    clearSheetPageCache(targetSheet.gid)
    const savedOrder: SheetOrder = {
      ...order,
      id: result.orderId || order.id,
      sheetRow: result.rowNumbers?.[0] ?? order.sheetRow,
      isLocal: false,
      isOverride: false,
      lines: order.lines.map((line, index) => ({ ...line, row: result.rowNumbers?.[index] ?? line.row })),
    }
    setDataBySheet((current) => {
      const currentSheet = current[sheetId] ?? { orders: [], hasMore: false }
      const ordersById = new Map(currentSheet.orders.map((item) => [item.id, item]))
      ordersById.set(savedOrder.id, savedOrder)
      return { ...current, [sheetId]: { ...currentSheet, orders: [...ordersById.values()], error: undefined } }
    })
    if (originalOrder) {
      setLocalOrdersBySheet((current) => {
        const next = { ...current }
        next[sheetId] = (next[sheetId] ?? []).filter((item) => item.id !== originalOrder.id)
        if (next[sheetId].length === 0) delete next[sheetId]
        return next
      })
    }
    if (rate !== exchangeRate) setExchangeRate(rate)
  }

  const createGoogleSheetTab = async (sheet: Omit<SheetDefinition, 'id' | 'gid' | 'titleKey'>) => {
    const template = SHEETS.find((item) => item.kind === sheet.kind)
    if (!template) throw new Error('Could not find a matching sheet template.')
    const response = await fetch('/api/sheets', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: sheet.customName, templateGid: template.gid }),
    })
    const result = await response.json().catch(() => ({})) as { error?: string; sheet?: { sheetId: string; title: string } }
    if (response.status === 401) throw new Error('Your secure session has expired.')
    if (!response.ok || !result.sheet) throw new Error(result.error || 'Could not create the sheet in Google Sheets.')
    const created: SheetDefinition = { ...sheet, id: `sheet-${result.sheet.sheetId}`, gid: result.sheet.sheetId, titleKey: '' }
    setLocalSheets((current) => [...current, created])
    setDataBySheet((current) => ({ ...current, [created.id]: { orders: [], hasMore: false } }))
    return created
  }

  const currentMonthSheet = getCurrentMonthSheet(mergedDataBySheet, allSheets)
  const knownLineNames = useMemo(() => [...new Set(Object.values(mergedDataBySheet).flatMap((state) => state.orders.map((order) => order.lineName.trim())).filter(Boolean))], [mergedDataBySheet])

  if (authChecking) {
    return <main className="app-stage splash-stage"><div className="app-shell"><SplashScreen /></div></main>
  }
  if (!isAdminPath) {
    return <main className="app-stage splash-stage"><div className="app-shell"><SplashScreen showLoading={false} /></div></main>
  }
  if (!isAdminAuthenticated && location.pathname !== '/admin') return <Navigate to="/admin" replace />
  if (!isAdminAuthenticated) {
    return <main className="app-stage"><div className="app-shell"><AdminLoginPage onLogin={login} /></div></main>
  }
  if (location.pathname === '/admin') return <Navigate to="/admin/home" replace />
  if (!bootReady || !initialDataReady) {
    return <main className="app-stage splash-stage"><div className="app-shell"><SplashScreen /></div></main>
  }

  return (
    <LineContactsProvider enabled={isAdminAuthenticated} knownNames={knownLineNames}>
    <main className="app-stage">
      <div className="app-shell">

        <Routes>
          <Route path="/admin/home" element={<HomePage dataBySheet={mergedDataBySheet} monthlyExpensesBySheet={monthlyExpensesBySheet} sheets={allSheets} loading={loading} refreshing={loading && Object.keys(dataBySheet).length > 0} onRefresh={refresh} onCreateSheet={createGoogleSheetTab} />} />
          <Route path="/admin/orders" element={<SheetRouteView sheet={currentMonthSheet} dataBySheet={mergedDataBySheet} loading={loading} onRefresh={refresh} onCreateOrder={saveOrderToSheet} monthlyExpensesBySheet={monthlyExpensesBySheet} onSaveMonthlyExpenses={saveMonthlyExpenses} exchangeRate={exchangeRate} onExchangeRateChange={setExchangeRate} sheets={allSheets} onLoadMoreData={loadMoreSheetData} onExportMonthlyReport={exportMonthlyReport} exportingReport={exportingReportId === currentMonthSheet.id} exportMessage={exportMessage} />} />
          <Route path="/admin/sheets/:sheetId" element={<SheetRouteView dataBySheet={mergedDataBySheet} loading={loading} onRefresh={refresh} onCreateOrder={saveOrderToSheet} monthlyExpensesBySheet={monthlyExpensesBySheet} onSaveMonthlyExpenses={saveMonthlyExpenses} exchangeRate={exchangeRate} onExchangeRateChange={setExchangeRate} sheets={allSheets} onLoadMoreData={loadMoreSheetData} onExportMonthlyReport={exportMonthlyReport} exportingReport={exportingReportId === (location.pathname.split('/')[3] ?? '')} exportMessage={exportMessage} />} />
          <Route path="/admin/sheets/:sheetId/orders/:orderId" element={<OrderDetailsRoute dataBySheet={mergedDataBySheet} sheets={allSheets} loading={loading} onRefresh={refresh} onSaveOrder={saveOrderToSheet} exchangeRate={exchangeRate} onExchangeRateChange={setExchangeRate} onLoadMoreData={loadMoreSheetData} />} />
          <Route path="/admin/analytics" element={<AnalyticsPage dataBySheet={mergedDataBySheet} monthlyExpensesBySheet={monthlyExpensesBySheet} sheets={allSheets} loading={loading} analyticsDataLoading={analyticsDataLoading} onLoadAllSalesSheets={loadAllSalesSheets} />} />
          <Route path="/admin/settings" element={<SettingsPage onExportBackup={exportFullBackup} backupLoading={backupLoading} backupMessage={backupMessage} onExportDateRange={exportDateRange} rangeExportLoading={rangeExportLoading} rangeExportMessage={rangeExportMessage} onLogout={logout} />} />
          <Route path="*" element={<Navigate to="/admin/home" replace />} />
        </Routes>
        <BottomNavigation desktop />
      </div>
    </main>
    </LineContactsProvider>
  )
}

function SheetRouteView({
  sheet: explicitSheet,
  sheets,
  dataBySheet,
  loading,
  onRefresh,
  onCreateOrder,
  monthlyExpensesBySheet,
  onSaveMonthlyExpenses,
  exchangeRate,
  onExchangeRateChange,
  onLoadMoreData,
  onExportMonthlyReport,
  exportingReport,
  exportMessage,
}: {
  sheet?: SheetDefinition
  sheets: SheetDefinition[]
  dataBySheet: Record<string, SheetDataState>
  loading: boolean
  onRefresh: () => void
  onCreateOrder: (sheetId: string, draft: OrderDraft, originalOrder?: SheetOrder) => Promise<void>
  monthlyExpensesBySheet: Record<string, MonthlyExpense[]>
  onSaveMonthlyExpenses: (sheetId: string, expenses: MonthlyExpense[]) => void
  exchangeRate: number
  onExchangeRateChange: (value: number) => void
  onLoadMoreData: (sheetId: string) => void
  onExportMonthlyReport: (sheetId: string) => void
  exportingReport: boolean
  exportMessage: string
}) {
  const { sheetId } = useParams()
  const sheet = explicitSheet ?? sheets.find((item) => item.id === sheetId)
  if (!sheet) return <Navigate to="/admin/home" replace />
  return <SheetOrdersPage key={sheet.id} sheet={sheet} sheetData={dataBySheet[sheet.id]} loading={loading} onRefresh={onRefresh} onCreateOrder={onCreateOrder} monthlyExpenses={monthlyExpensesBySheet[sheet.id] ?? []} onSaveMonthlyExpenses={onSaveMonthlyExpenses} exchangeRate={exchangeRate} onExchangeRateChange={onExchangeRateChange} onLoadMoreData={onLoadMoreData} onExportMonthlyReport={onExportMonthlyReport} exportingReport={exportingReport} exportMessage={exportMessage} />
}

function OrderDetailsRoute({ dataBySheet, sheets, loading, onRefresh, onSaveOrder, exchangeRate, onExchangeRateChange, onLoadMoreData }: { dataBySheet: Record<string, SheetDataState>; sheets: SheetDefinition[]; loading: boolean; onRefresh: () => void; onSaveOrder: (sheetId: string, draft: OrderDraft, originalOrder?: SheetOrder) => Promise<void>; exchangeRate: number; onExchangeRateChange: (value: number) => void; onLoadMoreData: (sheetId: string) => void }) {
  const { sheetId } = useParams()
  const sheet = sheets.find((item) => item.id === sheetId)
  if (!sheet) return <Navigate to="/admin/home" replace />
  return <OrderDetailsPage sheet={sheet} sheetData={dataBySheet[sheet.id]} loading={loading} onRefresh={onRefresh} onSaveOrder={onSaveOrder} exchangeRate={exchangeRate} onExchangeRateChange={onExchangeRateChange} onLoadMoreData={onLoadMoreData} />
}

export default App
