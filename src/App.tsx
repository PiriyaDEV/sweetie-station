import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronLeft,
  ClipboardList,
  Home,
  ImagePlus,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import sweetieLogo from './assets/sweetie-logo.webp'
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router'
import {
  fetchAllSheets,
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
const MONTHLY_EXPENSES_KEY = 'sweetie-monthly-expenses-v1'
const EXCHANGE_RATE_KEY = 'sweetie-cny-thb-rate-v1'
const DEFAULT_CNY_TO_THB = 5.02
const EMPTY_ORDERS: SheetOrder[] = []
const MONTH_INDEX: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, june: 5, july: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }
type ImageChoice = { url: string; label: string; itemName: string; salePrice: number }


function formatMoney(value: number, language: string) {
  return new Intl.NumberFormat(language === 'th' ? 'th-TH' : 'en-US', {
    maximumFractionDigits: 2,
  }).format(value)
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

function loadMonthlyExpenses(): Record<string, MonthlyExpense[]> {
  try {
    const saved = localStorage.getItem(MONTHLY_EXPENSES_KEY)
    return saved ? JSON.parse(saved) as Record<string, MonthlyExpense[]> : {}
  } catch {
    return {}
  }
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

function getCurrentMonthSheet(dataBySheet: Record<string, SheetDataState>): SheetDefinition {
  const now = getCurrentDate()
  const monthKey = ['jan', 'feb', 'mar', 'apr', 'may', 'june', 'july', 'aug', 'sep', 'oct', 'nov', 'dec'][now.getMonth()]
  const thisMonth = SHEETS.find((sheet) => sheet.kind === 'sales' && sheet.monthKey === monthKey && sheet.year === now.getFullYear())
  if (thisMonth) return thisMonth
  return [...SHEETS].filter((sheet) => sheet.kind === 'sales').sort((a, b) => a.year - b.year || MONTH_INDEX[a.monthKey] - MONTH_INDEX[b.monthKey]).reverse().find((sheet) => (dataBySheet[sheet.id]?.orders.length ?? 0) > 0) ?? SHEETS[0]
}

function paymentStatusLabel(status: string, t: (key: string) => string) {
  if (status === 'ยังไม่ได้ชำระ') return t('detail.paymentUnpaid')
  if (status === 'จ่ายเต็ม') return t('detail.paymentFull')
  if (status === 'มัดจำ') return t('detail.paymentDeposit')
  return status || t('detail.notSet')
}

function shippingStatusLabel(status: string, t: (key: string) => string) {
  if (status === 'ยังไม่ได้สั่ง') return t('detail.shippingNotOrdered')
  if (status === 'สั่งแล้ว') return t('detail.shippingOrdered')
  if (status === 'รอเข้าไทย') return t('detail.shippingInbound')
  if (status === 'ส่งแล้ว') return t('detail.shippingSent')
  return status || t('detail.notSet')
}

function paymentBadgeClass(status: string) {
  if (status === 'ยังไม่ได้ชำระ') return 'unpaid'
  if (status === 'จ่ายเต็ม') return 'paid'
  if (status === 'มัดจำ') return 'deposit'
  return 'neutral'
}

function shippingBadgeClass(status: string) {
  if (status === 'ยังไม่ได้สั่ง') return 'not-ordered'
  if (status === 'สั่งแล้ว') return 'ordered'
  if (status === 'ส่งแล้ว') return 'shipped'
  if (status === 'รอเข้าไทย') return 'inbound'
  return 'neutral'
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


function AnalyticsSettings() {
  const { i18n, t } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'

  const changeLanguage = (nextLanguage: string) => {
    void i18n.changeLanguage(nextLanguage)
    try {
      localStorage.setItem('sweetie-language', nextLanguage)
    } catch {
      // Language remains active for this app session if storage is unavailable.
    }
  }

  return (
    <section className="analytics-settings">
      <div><h2>{t('settings.title')}</h2><span>{t('settings.displayLanguage')}</span></div>
      <select className="select select-bordered select-sm select-primary" value={language} onChange={(event) => changeLanguage(event.target.value)} aria-label={t('settings.displayLanguage')}>
        <option value="en">English</option>
        <option value="th">ไทย</option>
      </select>
    </section>
  )
}

function SplashScreen({ showLoading = true }: { showLoading?: boolean }) {
  const { t } = useTranslation()

  return (
    <section className="app-screen splash-screen" aria-label={t('screen.splash')}>
      <div className="splash-content">
        <img className="sweetie-mark-image" src={sweetieLogo} alt={t('splash.logoAlt')} />
        <p className="splash-tagline">{t('splash.tagline')}</p>
      </div>
      {showLoading && <span className="splash-loading" aria-hidden="true"><i /></span>}
    </section>
  )
}

function BottomNavigation() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const isHome = location.pathname === '/admin/home'
  const isAnalytics = location.pathname === '/admin/analytics'

  return (
    <nav className="bottom-nav" aria-label={t('nav.label')}>
      <button type="button" className={`nav-item${isHome ? ' active' : ''}`} aria-label={t('nav.home')} onClick={() => navigate('/admin/home')}><Home size={22} fill={isHome ? 'currentColor' : 'none'} /></button>
      <button type="button" className={`nav-item${!isHome && !isAnalytics ? ' active' : ''}`} aria-label={t('nav.orders')} onClick={() => navigate('/admin/orders')}><ClipboardList size={22} /></button>
      <button type="button" className={`nav-item${isAnalytics ? ' active' : ''}`} aria-label={t('nav.analytics')} onClick={() => navigate('/admin/analytics')}><BarChart3 size={22} /></button>
    </nav>
  )
}

function sheetTotal(orders: SheetOrder[]) {
  return orders.reduce((sum, order) => sum + order.totalSales, 0)
}

function getPreviewImage(orders: SheetOrder[]) {
  return orders.flatMap((order) => order.lines).flatMap((line) => line.images)[0]
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

function HomePage({
  dataBySheet,
  loading,
  refreshing,
  onRefresh,
}: {
  dataBySheet: Record<string, SheetDataState>
  loading: boolean
  refreshing: boolean
  onRefresh: () => void
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const language = i18n.resolvedLanguage ?? 'en'
  const [query, setQuery] = useState('')
  const [kindFilter, setKindFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('month')

  const sheetRows = SHEETS.map((sheet, index) => ({ sheet, index, orders: dataBySheet[sheet.id]?.orders ?? EMPTY_ORDERS, error: dataBySheet[sheet.id]?.error }))
  const visibleSheets = sheetRows
    .filter(({ sheet }) => kindFilter === 'all' || sheet.kind === kindFilter)
    .filter(({ sheet }) => t(sheet.titleKey).toLocaleLowerCase().includes(query.toLocaleLowerCase()))
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
      if (sortBy === 'name') return t(a.sheet.titleKey).localeCompare(t(b.sheet.titleKey))
      return a.index - b.index
    })

  return (
    <section className="app-screen home-screen sheets-home-screen" aria-label={t('screen.home')}>
      <div className="screen-fixed-header">
        <header className="sales-summary sheet-home-summary">
          <p>{t('sheets.kicker')}</p>
          <h1>{t('sheets.chooseMonth')}</h1>
          <p className="sales-growth">{t('sheets.sheetCount', { count: SHEETS.length })}</p>
        </header>
        <div className="section-heading">
          <h2>{t('sheets.allSheets')}</h2>
          <button type="button" className="view-all" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw size={13} className={refreshing ? 'refreshing-icon' : ''} />
            {refreshing ? t('orders.refreshing') : t('orders.refresh')}
          </button>
        </div>
        <label className="order-search">
          <Search size={16} />
          <span className="sr-only">{t('sheets.search')}</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('sheets.search')} />
        </label>
        <div className="sheet-filter-row">
          <label><span className="sr-only">{t('filters.sheetType')}</span><select className="select select-bordered select-sm select-primary" value={kindFilter} onChange={(event) => setKindFilter(event.target.value)}><option value="all">{t('filters.allSheets')}</option><option value="sales">{t('sheets.kind.sales')}</option><option value="haul">{t('sheets.kind.haul')}</option></select></label>
          <label><span className="sr-only">{t('filters.status')}</span><select className="select select-bordered select-sm select-primary" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">{t('filters.allStatuses')}</option><option value="paid">{t('detail.paymentFull')}</option><option value="unpaid">{t('detail.paymentUnpaid')}</option><option value="deposit">{t('detail.paymentDeposit')}</option><option value="shipped">{t('detail.shippingSent')}</option><option value="not-ordered">{t('detail.shippingNotOrdered')}</option><option value="ordered">{t('detail.shippingOrdered')}</option><option value="inbound">{t('detail.shippingInbound')}</option><option value="unlisted">{t('filters.unlisted')}</option></select></label>
          <label><span className="sr-only">{t('filters.sortSheets')}</span><select className="select select-bordered select-sm select-primary" value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="month">{t('filters.monthOrder')}</option><option value="sales-desc">{t('filters.salesHigh')}</option><option value="sales-asc">{t('filters.salesLow')}</option><option value="orders-desc">{t('filters.ordersHigh')}</option><option value="name">{t('filters.nameAZ')}</option></select></label>
        </div>
      </div>

      <div className="home-scroll-area sheet-list-scroll">
        {loading && Object.keys(dataBySheet).length === 0 ? <div className="sheet-grid" aria-label={t('sheet.loading')}>
          {Array.from({ length: 6 }, (_, index) => <div className="sheet-card-skeleton" key={index}><i /><b /><b /></div>)}
        </div> : <div className="sheet-grid">
          {visibleSheets.map(({ sheet, orders, error }) => {
            const image = getPreviewImage(orders)
            return (
              <button
                type="button"
                className="sheet-card"
                key={sheet.id}
                onClick={() => navigate(`/admin/sheets/${sheet.id}`)}
                aria-label={`${t(sheet.titleKey)} · ${orders.length} ${t('orders.orders')}`}
              >
                {image
                  ? <img className="sheet-card-image" src={image} alt="" loading="lazy" />
                  : <span className={`sheet-card-placeholder ${sheet.kind}`}><CalendarDays size={25} /></span>}
                <span className="sheet-card-topline">
                  <span className={`sheet-kind ${sheet.kind}`}>{t(`sheets.kind.${sheet.kind}`)}</span>
                  <ArrowRight size={15} />
                </span>
                <span className="sheet-card-caption">
                  <strong>{t(sheet.titleKey)}</strong>
                  <span>{error ? t('sheet.errorShort') : t('sheets.orderCount', { count: orders.length })}</span>
                  <b>{error ? '—' : `${formatMoney(sheetTotal(orders), language)} THB`}</b>
                </span>
              </button>
            )
          })}
          {visibleSheets.length === 0 && <p className="sheet-message">{t('sheets.noMatch')}</p>}
        </div>}
      </div>
      <BottomNavigation />
    </section>
  )
}

function StatusBadge({ status = '', type, label }: { status?: string; type: 'payment' | 'shipping' | 'quantity'; label?: string }) {
  const { t } = useTranslation()
  if (type === 'quantity') return <span className="status-badge quantity">{label}</span>
  const text = type === 'payment' ? paymentStatusLabel(status, t) : shippingStatusLabel(status, t)
  const className = type === 'payment' ? paymentBadgeClass(status) : shippingBadgeClass(status)
  return <span className={`status-badge ${type} ${className}`}>{text}</span>
}

function OrderListRow({ order, sheet }: { order: SheetOrder; sheet: SheetDefinition }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const language = i18n.resolvedLanguage ?? 'en'
  const image = order.lines.flatMap((line) => line.images)[0]

  return (
    <button
      type="button"
      className="order-list-row order-row-open"
      onClick={() => navigate(`/admin/sheets/${sheet.id}/orders/${order.id}`)}
      aria-label={`${t('orders.open')} ${order.customerName || order.lineName}`}
    >
      <span className="order-row-photo">
        {image ? <img src={image} alt="" loading="lazy" /> : <Package size={22} />}
      </span>
      <span className="order-row-main">
        <span className="order-row-title">{order.customerName || order.lineName}</span>
        <span className="order-row-subtitle">{order.lineName} · {formatOrderDate(order.day, sheet, language)}</span>
        <span className="order-row-badges">
          <StatusBadge type="payment" status={order.paymentStatus} />
          <StatusBadge type="shipping" status={order.shippingStatus} />
          {order.isLocal && <span className="status-badge local">{order.isOverride ? t('orders.editedLocally') : t('orders.deviceOnly')}</span>}
        </span>
      </span>
      <span className="order-row-total">{formatMoney(order.totalSales, language)}<small>THB</small></span>
      <span className="order-row-items" aria-label={t('detail.items')}>
        {order.lines.map((line, index) => (
          <span className="order-item-preview" key={`${order.id}-${line.row || index}`}>
            <span className="order-item-preview-photo">{line.images[0] ? <img src={line.images[0]} alt="" loading="lazy" /> : <Package size={14} />}</span>
            <span className="order-item-preview-name"><strong>{line.itemName || t('detail.itemNumber', { number: index + 1 })}</strong><small>{t('detail.quantity', { count: line.quantity, unit: line.quantity === 1 ? t('detail.piece') : t('detail.pieces') })}</small></span>
            <strong className="order-item-preview-price">{formatMoney(line.salePrice, language)} THB</strong>
          </span>
        ))}
      </span>
    </button>
  )
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
    lineName: '', customerName: '', day: getDefaultDay(sheet), exchangeRate: String(exchangeRate),
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
  const scale = Math.min(1, 720 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Image processing is unavailable.')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/webp', 0.76)
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
  onSave: (draft: OrderDraft) => void
}) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'
  const [draft, setDraft] = useState(() => initialOrder ? draftFromOrder(initialOrder, defaultExchangeRate, sheet) : emptyDraft(sheet, defaultExchangeRate))
  const [openPicker, setOpenPicker] = useState<number | null>(null)
  const [imageQuery, setImageQuery] = useState('')
  const [imageError, setImageError] = useState('')
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
    try {
      const image = await imageToDataUrl(file)
      setDraft((current) => ({ ...current, lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, image, images: [image], imageName: '', imageIsNew: true } : line) }))
      setImageError('')
    } catch {
      setImageError(t('createOrder.imageReadError'))
    }
  }

  const filteredImages = imageChoices.filter((choice) => `${choice.label} ${choice.itemName}`.toLocaleLowerCase().includes(imageQuery.toLocaleLowerCase()))

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSave(draft)
  }

  return (
    <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="create-order-modal" role="dialog" aria-modal="true" aria-labelledby="create-order-heading">
        <header className="modal-header">
          <div>
            <p>{t(sheet.titleKey)}</p>
            <h2 id="create-order-heading">{t(initialOrder ? 'createOrder.editTitle' : 'createOrder.title')}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('createOrder.close')}><X size={20} /></button>
        </header>

        <form className="order-form" onSubmit={submit}>
          <div className="form-grid two-columns">
            <label>{t('detail.lineName')}<input value={draft.lineName} onChange={(event) => updateField('lineName', event.target.value)} placeholder={t('createOrder.linePlaceholder')} /></label>
            <label>{t('detail.customer')} <span className="required-star">*</span><input value={draft.customerName} onChange={(event) => updateField('customerName', event.target.value)} required placeholder={t('createOrder.customerPlaceholder')} /></label>
          </div>
          <label className="day-field">{t('createOrder.day')} <span className="required-star">*</span><input type="date" value={draft.day} onChange={(event) => updateField('day', event.target.value)} required /></label>

          <div className="exchange-rate-field">
            <label>{t('createOrder.exchangeRate')} <span className="required-star">*</span><input type="number" min="0.01" step="0.01" value={draft.exchangeRate} onChange={(event) => { updateField('exchangeRate', event.target.value); const nextRate = Number(event.target.value); if (nextRate > 0) onExchangeRateChange(nextRate) }} required /></label>
            <small>{t('createOrder.exchangeRateHint')}</small>
          </div>

          <div className="form-section-heading"><h3>{t('detail.items')}</h3><span>{t('createOrder.monthOnlyImages', { month: t(sheet.titleKey) })}</span></div>

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
                <div className="draft-item-main">
                  <div className="draft-item-photo">{line.image ? <img src={line.image} alt={line.itemName || t('createOrder.selectedImage')} /> : <Package size={22} />}</div>
                  <div className="draft-item-fields">
                    <label>{t('createOrder.itemName')} <span className="required-star">*</span><input value={line.itemName} onChange={(event) => updateLine(index, 'itemName', event.target.value)} required /></label>
                    <div className="form-grid two-columns">
                      <label>{t('createOrder.price')} <span className="required-star">*</span><input type="number" min="0" step="0.01" value={line.salePrice} onChange={(event) => updateLine(index, 'salePrice', event.target.value)} required /></label>
                      <label>{t('createOrder.quantity')} <span className="required-star">*</span><input type="number" min="1" step="1" value={line.quantity} onChange={(event) => updateLine(index, 'quantity', event.target.value)} required /></label>
                    </div>
                  </div>
                </div>
                <div className="form-grid two-columns financial-fields">
                  <label>{t('createOrder.bank')}<input type="number" min="0" step="0.01" value={line.bankAmount} onChange={(event) => updateLine(index, 'bankAmount', event.target.value)} /></label>
                  <label>{t('createOrder.costRMB')} {costRequired && <span className="required-star">*</span>}<input type="number" min="0" step="0.01" value={line.costRMB} onChange={(event) => updateLine(index, 'costRMB', event.target.value)} required={costRequired} /></label>
                </div>
                <div className="line-calculation-summary">
                  <span>{t('createOrder.depositDue')} <strong>{formatMoney(depositDue, language)} THB</strong></span>
                  {line.costRMB.trim() && <span>{t('createOrder.costTHBPreview')} <strong>{formatMoney(costTHB, language)} THB</strong></span>}
                  {previewProfit !== null && <span>{t('createOrder.estimatedProfit')} <strong className={previewProfit < 0 ? 'negative-text' : 'positive-text'}>{formatMoney(previewProfit, language)} THB</strong></span>}
                </div>
                <div className="image-source-row">
                  <label className="upload-image-button btn btn-outline btn-sm">
                    <ImagePlus size={16} /> {t('createOrder.uploadPhoto')}
                    <input type="file" accept="image/*" onChange={(event) => void handleFile(index, event.target.files?.[0])} />
                  </label>
                  <button type="button" className="choose-month-image btn btn-outline btn-sm" onClick={() => { setOpenPicker(openPicker === index ? null : index); setImageQuery('') }} disabled={imageChoices.length === 0}>
                    {t('createOrder.chooseMonthImage')}
                  </button>
                </div>
                {line.image && <button type="button" className="remove-photo-button" onClick={() => setDraft((current) => ({ ...current, lines: current.lines.map((item, lineIndex) => lineIndex === index ? { ...item, image: '', images: [], imageName: '', imageIsNew: false } : item) }))}>{t('createOrder.removeImage')}</button>}
                {openPicker === index && <div className="month-image-picker">
                  <input value={imageQuery} onChange={(event) => setImageQuery(event.target.value)} placeholder={t('createOrder.filterMonthImages')} aria-label={t('createOrder.filterMonthImages')} />
                  <div className="month-image-grid">
                    {filteredImages.map((choice) => <button type="button" key={choice.url} title={`${choice.label} · ${formatMoney(choice.salePrice, language)} THB`} onClick={() => { setDraft((current) => ({ ...current, lines: current.lines.map((currentLine, lineIndex) => lineIndex === index ? { ...currentLine, image: choice.url, images: [choice.url], imageName: '', imageIsNew: false, itemName: choice.itemName || currentLine.itemName, salePrice: choice.salePrice > 0 ? String(choice.salePrice) : currentLine.salePrice } : currentLine) })); setOpenPicker(null) }}><img src={choice.url} alt={choice.label} /><span>{choice.itemName || choice.label}<small>{formatMoney(choice.salePrice, language)} THB</small></span></button>)}
                    {filteredImages.length === 0 && <span className="picker-empty">{t('createOrder.noMonthImages')}</span>}
                  </div>
                </div>}
              </section>
            )
          })}
          <button type="button" className="add-line-button" onClick={() => setDraft((current) => ({ ...current, paymentStatus: '', lines: [...current.lines, emptyDraftLine()] }))}><Plus size={15} /> {t('createOrder.addItem')}</button>

          <section className="campaign-form-card">
            <label className="campaign-toggle"><input type="checkbox" checked={draft.isCampaign} onChange={(event) => { updateField('isCampaign', event.target.checked); updateField('paymentStatus', ''); if (!event.target.checked) updateField('campaignDiscount', '') }} />{t('createOrder.isCampaign')}</label>
            {draft.isCampaign && <label>{t('createOrder.campaignDiscount')} <span className="required-star">*</span><input type="number" min="0" step="0.01" max={grossSales} value={draft.campaignDiscount} onChange={(event) => { updateField('campaignDiscount', event.target.value); updateField('paymentStatus', '') }} required /></label>}
            <div className="campaign-net-total"><span>{t('createOrder.afterDiscount')}</span><strong>{formatMoney(netSales, language)} THB</strong></div>
            <div className="campaign-net-total"><span>{t('createOrder.orderDepositDue')}</span><strong>{formatMoney(orderDepositDue, language)} THB</strong></div>
            <div className="campaign-net-total"><span>{t('createOrder.paymentStatusPreview')}</span><strong>{t((draft.paymentStatus || automaticPaymentStatus) === 'จ่ายเต็ม' ? 'detail.paymentFull' : (draft.paymentStatus || automaticPaymentStatus) === 'มัดจำ' ? 'detail.paymentDeposit' : 'detail.paymentUnpaid')}</strong></div>
          </section>

          <div className="form-grid two-columns">
            <label>{t('createOrder.paymentStatus')}<select className="select select-bordered select-sm select-primary" value={draft.paymentStatus} onChange={(event) => updateField('paymentStatus', event.target.value)}><option value="">{t('detail.notSet')}</option><option value="ยังไม่ได้ชำระ">{t('detail.paymentUnpaid')}</option><option value="จ่ายเต็ม">{t('detail.paymentFull')}</option><option value="มัดจำ">{t('detail.paymentDeposit')}</option></select></label>
            <label>{t('createOrder.shippingStatus')}<select className="select select-bordered select-sm select-primary" value={draft.shippingStatus} onChange={(event) => updateField('shippingStatus', event.target.value)}><option value="">{t('detail.notSet')}</option><option value="ยังไม่ได้สั่ง">{t('detail.shippingNotOrdered')}</option><option value="สั่งแล้ว">{t('detail.shippingOrdered')}</option><option value="รอเข้าไทย">{t('detail.shippingInbound')}</option><option value="ส่งแล้ว">{t('detail.shippingSent')}</option></select></label>
          </div>
          {imageError && <p className="form-error" role="alert">{imageError}</p>}
          <p className="local-save-note">{t('createOrder.localOnly')}</p>
          <footer className="modal-actions">
            <button type="button" className="cancel-order-button btn btn-ghost" onClick={onClose}>{t('createOrder.cancel')}</button>
            <button type="submit" className="save-order-button btn btn-primary"><Check size={16} /> {t(initialOrder ? 'createOrder.update' : 'createOrder.save')}</button>
          </footer>
        </form>
      </section>
    </div>
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
      <div className="monthly-expenses-heading"><div><h3>{t('expenses.title')}</h3><span>{t('expenses.note')}</span></div><strong>{formatMoney(total, language)} THB</strong></div>
      <div className="monthly-expenses-list">
        {expenses.map((expense) => (
          <div className="monthly-expense-row" key={expense.id}>
            <select className="select select-bordered select-sm select-primary" aria-label={t('expenses.category')} value={expense.category} onChange={(event) => update(expense.id, 'category', event.target.value)}>
              <option value="shipping">{t('expenses.shipping')}</option><option value="packaging">{t('expenses.packaging')}</option><option value="ads">{t('expenses.ads')}</option><option value="other">{t('expenses.other')}</option>
            </select>
            <input type="text" aria-label={t('expenses.description')} placeholder={t('expenses.description')} value={expense.description} onChange={(event) => update(expense.id, 'description', event.target.value)} />
            <input type="number" min="0" step="0.01" aria-label={t('expenses.amount')} value={expense.amount} onChange={(event) => update(expense.id, 'amount', Number(event.target.value) || 0)} />
            <button type="button" className="expense-remove" onClick={() => onChange(expenses.filter((item) => item.id !== expense.id))} aria-label={t('expenses.remove')}><X size={15} /></button>
          </div>
        ))}
        {expenses.length === 0 && <p className="expenses-empty">{t('expenses.empty')}</p>}
      </div>
      <button type="button" className="expense-add-button" onClick={add}><Plus size={14} /> {t('expenses.add')}</button>
    </section>
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
}: {
  sheet: SheetDefinition
  sheetData?: SheetDataState
  loading: boolean
  onRefresh: () => void
  onCreateOrder: (sheetId: string, draft: OrderDraft, originalOrder?: SheetOrder) => void
  monthlyExpenses: MonthlyExpense[]
  onSaveMonthlyExpenses: (sheetId: string, expenses: MonthlyExpense[]) => void
  exchangeRate: number
  onExchangeRateChange: (value: number) => void
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const language = i18n.resolvedLanguage ?? 'en'
  const scrollRootRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [visibleCount, setVisibleCount] = useState(10)
  const [createOpen, setCreateOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const orders = sheetData?.orders ?? EMPTY_ORDERS
  const expenseTotal = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const totalProfit = getProfitSummary(orders, expenseTotal)

  const sortedOrders = useMemo(() => {
    const matching = orders.filter((order) => {
      const searchText = `${order.lineName} ${order.customerName} ${order.lines.map((line) => line.itemName).join(' ')} ${order.paymentStatus} ${order.shippingStatus}`.toLocaleLowerCase()
      if (!searchText.includes(query.toLocaleLowerCase())) return false
      if (statusFilter === 'paid') return order.paymentStatus === 'จ่ายเต็ม'
      if (statusFilter === 'unpaid') return order.paymentStatus === 'ยังไม่ได้ชำระ'
      if (statusFilter === 'deposit') return order.paymentStatus === 'มัดจำ'
      if (statusFilter === 'shipped') return order.shippingStatus === 'ส่งแล้ว'
      if (statusFilter === 'not-ordered') return order.shippingStatus === 'ยังไม่ได้สั่ง'
      if (statusFilter === 'ordered') return order.shippingStatus === 'สั่งแล้ว'
      if (statusFilter === 'inbound') return order.shippingStatus === 'รอเข้าไทย'
      if (statusFilter === 'unlisted') return !order.paymentStatus && !order.shippingStatus
      return true
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
  const hasMore = visibleOrders.length < sortedOrders.length

  useEffect(() => {
    const root = scrollRootRef.current
    const sentinel = sentinelRef.current
    if (!root || !sentinel || !hasMore || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleCount((count) => Math.min(count + 10, sortedOrders.length))
    }, { root, rootMargin: '140px' })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, sortedOrders.length, visibleCount])

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

  const saveLocalOrder = (draft: OrderDraft) => {
    onCreateOrder(sheet.id, draft)
    setCreateOpen(false)
    setNotice(t('createOrder.savedNotice'))
    window.setTimeout(() => setNotice(''), 3000)
  }

  return (
    <section className="app-screen home-screen orders-screen" aria-label={t('screen.sheetOrders')}>
      <div className="screen-fixed-header orders-fixed-header">
        <button type="button" className="screen-back-button" onClick={() => navigate('/admin/home')} aria-label={t('nav.backToSheets')}>
          <ChevronLeft size={18} /> {t('nav.allSheets')}
        </button>
        <header className="sales-summary month-summary">
          <p>{t(`sheets.kind.${sheet.kind}`)}</p>
          <h1>{t(sheet.titleKey)}</h1>
          {loading && !sheetData ? <p className="sales-growth">{t('sheet.loadingShort')}</p> : sheet.kind === 'sales' ? <>
            <div className="month-sales-summary">
              <div><span>{t('analytics.totalSales')}</span><strong>{formatMoney(sheetTotal(orders), language)} <small>THB</small></strong></div>
              <div><span>{t('analytics.totalProfit')}</span><strong className={totalProfit.amount === null ? 'profit-unavailable' : 'profit-summary-value'}>{totalProfit.amount === null ? '—' : `${formatMoney(totalProfit.amount, language)} THB`}</strong>{totalProfit.amount === null ? <em className="profit-data-note">{t('analytics.noPeriodProfit')}</em> : !totalProfit.complete ? <em className="profit-data-note">{t('analytics.partialProfitNote', { known: totalProfit.knownLines, total: totalProfit.totalLines })}</em> : <em className="profit-data-note">{t('analytics.netProfitNote', { amount: formatMoney(expenseTotal, language) })}</em>}</div>
            </div>
            <p className="month-order-count">{t('sheets.orderCount', { count: orders.length })}</p>
          </> : <p className="sales-growth">{t('sheets.monthSummary', { orders: orders.length, total: formatMoney(sheetTotal(orders), language) })}</p>}
        </header>

        <div className="order-list-heading">
          <div><h2>{t('orders.title')}</h2><span>{t('orders.resultCount', { shown: visibleOrders.length, total: sortedOrders.length })}</span></div>
          <button type="button" className="view-all" onClick={onRefresh} disabled={loading}><RefreshCw size={13} className={loading ? 'refreshing-icon' : ''} />{loading ? t('orders.refreshing') : t('orders.refresh')}</button>
        </div>

        <div className="search-filter-row">
          <label className="order-search">
            <Search size={16} />
            <span className="sr-only">{t('orders.search')}</span>
            <input value={query} onChange={(event) => updateQuery(event.target.value)} placeholder={t('orders.search')} />
          </label>
          <button type="button" className={`filter-toggle${filtersOpen ? ' is-open' : ''}`} aria-expanded={filtersOpen} aria-controls="order-filters" onClick={() => setFiltersOpen((open) => !open)}>
            <SlidersHorizontal size={15} /> {t(filtersOpen ? 'filters.hide' : 'filters.show')}
          </button>
        </div>
        {filtersOpen && <div className="order-filter-row" id="order-filters">
          <label><span className="sr-only">{t('filters.status')}</span><select className="select select-bordered select-sm select-primary" value={statusFilter} onChange={(event) => updateStatus(event.target.value)}><option value="all">{t('filters.allStatuses')}</option><option value="paid">{t('detail.paymentFull')}</option><option value="unpaid">{t('detail.paymentUnpaid')}</option><option value="deposit">{t('detail.paymentDeposit')}</option><option value="shipped">{t('detail.shippingSent')}</option><option value="not-ordered">{t('detail.shippingNotOrdered')}</option><option value="ordered">{t('detail.shippingOrdered')}</option><option value="inbound">{t('detail.shippingInbound')}</option><option value="unlisted">{t('filters.unlisted')}</option></select></label>
          <label><span className="sr-only">{t('filters.sort')}</span><select className="select select-bordered select-sm select-primary" value={sortBy} onChange={(event) => updateSort(event.target.value)}><option value="newest">{t('filters.newest')}</option><option value="oldest">{t('filters.oldest')}</option><option value="sales-desc">{t('filters.salesHigh')}</option><option value="sales-asc">{t('filters.salesLow')}</option><option value="status">{t('filters.statusAZ')}</option></select></label>
        </div>}
        {sheetData?.error && <div className="sheet-error" role="alert">{t('sheet.error')} <button type="button" onClick={onRefresh}>{t('sheet.retry')}</button></div>}
      </div>

      <div className="home-scroll-area order-list-scroll" ref={scrollRootRef}>
        {!sheetData && loading && <div className="order-list-table">{Array.from({ length: 6 }, (_, index) => <div className="skeleton-order-row" key={index}><i /><span><b /><b /><em /></span><b /></div>)}</div>}
        {sheetData && !sheetData.error && orders.length === 0 && <p className="sheet-message">{t('sheet.empty')}</p>}
        {sortedOrders.length === 0 && !loading && orders.length > 0 && <p className="sheet-message">{t('orders.noMatch')}</p>}
        {query && sortedOrders.length === 0 && <p className="sheet-message">{t('orders.noMatch')}</p>}
        {sheet.kind === 'sales' && <MonthlyExpensesSection expenses={monthlyExpenses} onChange={(expenses) => onSaveMonthlyExpenses(sheet.id, expenses)} />}
        <div className="order-list-table">
          {visibleOrders.map((order) => <OrderListRow key={order.id} order={order} sheet={sheet} />)}
        </div>
        {hasMore && <div className="load-more-sentinel" ref={sentinelRef} aria-live="polite"><span className="loading-more-dot" /> {t('orders.loadingMore')}</div>}
        {!hasMore && sortedOrders.length > 10 && <p className="list-end-note">{t('orders.endOfList')}</p>}
      </div>

      <div className="create-order-dock"><button type="button" className="create-order-list-button btn btn-primary" onClick={() => setCreateOpen(true)}><Plus size={17} /> {t('createOrder.open')}</button></div>
      <BottomNavigation />
      {createOpen && <CreateOrderDialog sheet={sheet} imageChoices={imageChoices} defaultExchangeRate={exchangeRate} onExchangeRateChange={onExchangeRateChange} onClose={() => setCreateOpen(false)} onSave={saveLocalOrder} />}
      {notice && <p className="app-toast" role="status">{notice}</p>}
    </section>
  )
}

function OrderDetailsPage({ sheet, sheetData, loading, onRefresh, onSaveOrder, exchangeRate, onExchangeRateChange }: { sheet: SheetDefinition; sheetData?: SheetDataState; loading: boolean; onRefresh: () => void; onSaveOrder: (sheetId: string, draft: OrderDraft, originalOrder?: SheetOrder) => void; exchangeRate: number; onExchangeRateChange: (value: number) => void }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { orderId } = useParams()
  const language = i18n.resolvedLanguage ?? 'en'
  const [itemQuery, setItemQuery] = useState('')
  const [itemSort, setItemSort] = useState('sales-desc')
  const [editOpen, setEditOpen] = useState(false)
  const [editNotice, setEditNotice] = useState('')
  const order = sheetData?.orders.find((item) => item.id === orderId)
  const [campaignEnabled, setCampaignEnabled] = useState(() => order?.isCampaign ?? false)
  const [campaignDiscount, setCampaignDiscount] = useState(() => String(order?.campaignDiscount ?? ''))
  const imageChoices = useMemo(() => {
    const seen = new Set<string>()
    return (sheetData?.orders ?? EMPTY_ORDERS).flatMap((entry) => entry.lines.flatMap((line, lineIndex) => line.images.map((url) => ({ url, label: line.itemName || line.imageName || entry.customerName || entry.lineName || t('createOrder.itemNumber', { number: lineIndex + 1 }), itemName: line.itemName || line.imageName || '', salePrice: line.salePrice }))))
      .filter((choice) => { const key = `${choice.url}|${choice.itemName}|${choice.salePrice}`; if (seen.has(key)) return false; seen.add(key); return true })
  }, [sheetData?.orders, t])
  if (loading && !sheetData) return <section className="app-screen detail-screen"><div className="detail-scroll-area"><div className="detail-skeleton-hero" /><div className="detail-skeleton-block" /><div className="detail-skeleton-block" /></div></section>
  if (sheetData?.error) return <section className="app-screen detail-screen"><div className="sheet-error" role="alert">{t('sheet.error')} <button type="button" onClick={onRefresh}>{t('sheet.retry')}</button></div></section>
  if (!order) return <Navigate to={`/admin/sheets/${sheet.id}`} replace />

  const heroImage = order.lines.flatMap((line) => line.images)[0]
  const grossSales = order.grossSales ?? order.lines.reduce((sum, line) => sum + line.salePrice, 0)
  const orderProfit = getProfitSummary([order])
  const discountAmount = campaignEnabled ? Math.min(grossSales, Math.max(0, Number(campaignDiscount) || 0)) : 0
  const netSales = Math.max(0, grossSales - discountAmount)
  const depositDue = getDepositDue(order, netSales)
  const saveStatus = (key: 'paymentStatus' | 'shippingStatus', value: string) => {
    onSaveOrder(sheet.id, { ...draftFromOrder(order, exchangeRate, sheet), [key]: value }, order)
    setEditNotice(t('orders.editSaved'))
    window.setTimeout(() => setEditNotice(''), 2500)
  }
  const saveCampaign = () => {
    onSaveOrder(sheet.id, { ...draftFromOrder(order, exchangeRate, sheet), isCampaign: campaignEnabled, campaignDiscount: campaignEnabled ? String(discountAmount) : '0' }, order)
    setEditNotice(t('orders.editSaved'))
    window.setTimeout(() => setEditNotice(''), 2500)
  }
  const visibleLines = order.lines.filter((line) => `${line.itemName} ${line.imageName ?? ''}`.toLocaleLowerCase().includes(itemQuery.toLocaleLowerCase())).sort((a, b) => {
    if (itemSort === 'sales-asc') return a.salePrice - b.salePrice
    if (itemSort === 'name') return a.itemName.localeCompare(b.itemName)
    return b.salePrice - a.salePrice
  })

  return (
    <section className="app-screen detail-screen" aria-label={t('screen.detail')}>
      <div className={`detail-hero${heroImage ? ' has-product-image' : ''}`}>
        {heroImage && <img src={heroImage} alt="" />}
        <button type="button" className="back-button" onClick={() => navigate(`/admin/sheets/${sheet.id}`)} aria-label={t('nav.backToOrders')}><ChevronLeft size={20} /></button>
        <div className="hero-label">
          <h1>{order.customerName || order.lineName}</h1>
          <p>{t(sheet.titleKey)} · {formatOrderDate(order.day, sheet, language)} · {formatMoney(order.totalSales, language)} THB</p>
        </div>
      </div>
      <div className="detail-scroll-area">
        <div className="detail-body">
          <div className="detail-title-row">
            <h2>{t('details.title')}</h2>
            <div className="detail-title-actions">
              <span className="sheet-row-number">{order.isOverride ? t('orders.editedLocally') : order.isLocal ? t('orders.deviceOnly') : `#${order.sheetRow}`}</span>
              <button type="button" className="edit-order-button btn btn-outline btn-sm" onClick={() => setEditOpen(true)}><Pencil size={14} /> {t('orders.edit')}</button>
            </div>
          </div>

          <div className="order-stats" aria-label={t('details.summary')}>
            <StatusBadge type="quantity" label={t('detail.quantity', { count: order.quantity, unit: order.quantity === 1 ? t('detail.piece') : t('detail.pieces') })} />
            <StatusBadge type="payment" status={order.paymentStatus} />
            <StatusBadge type="shipping" status={order.shippingStatus} />
          </div>

          <section className="detail-card customer-card">
            <div><span>{t('detail.lineName')}</span><strong>{order.lineName || t('detail.notSet')}</strong></div>
            <div><span>{t('detail.customer')}</span><strong>{order.customerName || t('detail.notSet')}</strong></div>
          </section>

          <section className="detail-status-controls" aria-label={t('details.summary')}>
            <label>{t('createOrder.paymentStatus')}<select className="select select-bordered select-sm select-primary" value={order.paymentStatus} onChange={(event) => saveStatus('paymentStatus', event.target.value)}><option value="">{t('detail.notSet')}</option><option value="ยังไม่ได้ชำระ">{t('detail.paymentUnpaid')}</option><option value="มัดจำ">{t('detail.paymentDeposit')}</option><option value="จ่ายเต็ม">{t('detail.paymentFull')}</option></select></label>
            <label>{t('createOrder.shippingStatus')}<select className="select select-bordered select-sm select-primary" value={order.shippingStatus} onChange={(event) => saveStatus('shippingStatus', event.target.value)}><option value="">{t('detail.notSet')}</option><option value="ยังไม่ได้สั่ง">{t('detail.shippingNotOrdered')}</option><option value="สั่งแล้ว">{t('detail.shippingOrdered')}</option><option value="รอเข้าไทย">{t('detail.shippingInbound')}</option><option value="ส่งแล้ว">{t('detail.shippingSent')}</option></select></label>
          </section>

          <section className="campaign-detail-card">
            <label className="campaign-toggle"><input type="checkbox" checked={campaignEnabled} onChange={(event) => setCampaignEnabled(event.target.checked)} />{t('detail.campaign')}</label>
            {campaignEnabled && <label>{t('detail.discount')} <span className="required-star">*</span><input type="number" min="0" max={grossSales} step="0.01" value={campaignDiscount} onChange={(event) => setCampaignDiscount(event.target.value)} /></label>}
            <div className="campaign-net-total"><span>{t('detail.totalBeforeDiscount')}</span><strong>{formatMoney(grossSales, language)} THB</strong></div>
            {campaignEnabled && <div className="campaign-net-total"><span>{t('detail.discount')}</span><strong>−{formatMoney(discountAmount, language)} THB</strong></div>}
            <div className="campaign-net-total campaign-final-total"><span>{t('detail.totalAfterDiscount')}</span><strong>{formatMoney(netSales, language)} THB</strong></div>
            <button type="button" className="save-campaign-button btn btn-primary btn-sm" onClick={saveCampaign}>{t('detail.saveCampaign')}</button>
          </section>

          <section className="detail-section">
            <h3>{t('detail.items')}</h3>
            <div className="item-list-controls">
              <input value={itemQuery} onChange={(event) => setItemQuery(event.target.value)} placeholder={t('orders.searchItems')} aria-label={t('orders.searchItems')} />
              <select className="select select-bordered select-sm select-primary" value={itemSort} onChange={(event) => setItemSort(event.target.value)} aria-label={t('filters.sortItems')}><option value="sales-desc">{t('filters.salesHigh')}</option><option value="sales-asc">{t('filters.salesLow')}</option><option value="name">{t('filters.nameAZ')}</option></select>
            </div>
            <div className="item-list">
              {visibleLines.map((line, index) => (
                <article className="item-row" key={`${order.id}-${line.row || index}`}>
                  {line.images.length > 0
                    ? <div className="item-images">{line.images.slice(0, 3).map((image, imageIndex) => <img key={`${image.slice(0, 48)}-${imageIndex}`} src={image} alt={t('detail.itemImage', { number: index + 1, image: imageIndex + 1 })} loading="lazy" />)}{line.images.length > 3 && <span>+{line.images.length - 3}</span>}</div>
                    : <span className="item-index"><Package size={15} /></span>}
                  <div className="item-description">
                    <strong>{line.itemName || t('detail.itemNumber', { number: index + 1 })}</strong>
                    {line.imageName && <span className="item-photo-name">{t('detail.photoName')}: {line.imageName}</span>}
                    <span>{t('detail.quantity', { count: line.quantity, unit: line.quantity === 1 ? t('detail.piece') : t('detail.pieces') })}</span>
                    {line.costRMB != null && <span className="item-cost-line">{t('createOrder.costRMB')}: {formatMoney(line.costRMB, language)} CNY{line.costTHB != null && ` · ${t('createOrder.costTHBPreview')}: ${formatMoney(line.costTHB, language)} THB`}</span>}
                    {line.attributes.length > 0 && <div className="item-attributes">{line.attributes.slice(0, 3).map((attribute) => <span key={`${attribute.key}-${attribute.value}`}>{fieldLabel(attribute.key, t)}: {attribute.value}</span>)}</div>}
                  </div>
                  <strong className="item-price">{line.salePrice ? `${formatMoney(line.salePrice, language)} THB` : '—'}</strong>
                </article>
              ))}
              {visibleLines.length === 0 && <p className="picker-empty">{t('orders.noMatch')}</p>}
            </div>
          </section>

          <section className="detail-card payment-card">
            <div><span>{t('detail.totalSales')}</span><strong>{formatMoney(netSales, language)} THB</strong></div>
            <div><span>{t('detail.totalProfit')}</span><strong className={orderProfit.amount === null ? 'profit-unavailable' : orderProfit.amount < 0 ? 'negative-text' : 'positive-text'}>{orderProfit.amount === null ? '—' : `${formatMoney(orderProfit.amount, language)} THB`}</strong>{orderProfit.amount === null ? <em className="profit-data-note">{t('analytics.noPeriodProfit')}</em> : orderProfit.knownLines < orderProfit.totalLines && <em className="profit-data-note">{t('analytics.profitCoverage', { known: orderProfit.knownLines, total: orderProfit.totalLines })}</em>}</div>
            {order.profitPercent !== null && <div><span>{t('detail.profitMargin')}</span><strong className={`profit-text ${order.profitPercent < 0 ? 'negative' : 'positive'}`}>{formatProfitPercent(order.profitPercent, language)}</strong></div>}
            {getPaidTotal(order) > 0 && <div><span>{t('detail.bank')}</span><strong>{formatMoney(getPaidTotal(order), language)} THB</strong></div>}
            {depositDue !== null && (depositDue > 0 || order.paymentStatus === 'จ่ายเต็ม') && <div><span>{t('detail.deposit')}</span><strong>{formatMoney(depositDue, language)} THB</strong></div>}
          </section>
        </div>
      </div>
      {editOpen && order && <CreateOrderDialog sheet={sheet} initialOrder={order} imageChoices={imageChoices} defaultExchangeRate={exchangeRate} onExchangeRateChange={onExchangeRateChange} onClose={() => setEditOpen(false)} onSave={(draft) => { onSaveOrder(sheet.id, draft, order); setEditOpen(false); setEditNotice(t('orders.editSaved')) }} />}
      {editNotice && <p className="app-toast" role="status">{editNotice}</p>}
    </section>
  )
}

const ADMIN_SESSION_KEY = 'sweetie-admin-session'
const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = '1234'
const ADMIN_SESSION_TTL_MS = 24 * 60 * 60 * 1000

function readAdminSessionExpiry() {
  try {
    const value = localStorage.getItem(ADMIN_SESSION_KEY)
    if (!value) return null
    const session = JSON.parse(value) as { username?: string; expiresAt?: number }
    if (session.username !== ADMIN_USERNAME || typeof session.expiresAt !== 'number' || session.expiresAt <= Date.now()) {
      localStorage.removeItem(ADMIN_SESSION_KEY)
      return null
    }
    return session.expiresAt
  } catch {
    return null
  }
}

function readAdminSession() {
  return readAdminSessionExpiry() !== null
}

function AdminLoginPage({ onLogin }: { onLogin: (username: string, password: string) => boolean }) {
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (onLogin(username, password)) {
      setError('')
      return
    }
    setError(t('auth.invalid'))
  }

  return (
    <section className="app-screen admin-login-screen" aria-label={t('auth.title')}>
      <div className="admin-login-card">
        <img src={sweetieLogo} alt={t('splash.logoAlt')} />
        <p>{t('auth.kicker')}</p>
        <h1>{t('auth.title')}</h1>
        <form onSubmit={submit}>
          <label>{t('auth.username')}<input className="input input-bordered" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
          <label>{t('auth.password')}<input className="input input-bordered" autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary">{t('auth.signIn')}</button>
          <small>{t('auth.temporary')}</small>
        </form>
      </div>
    </section>
  )
}

function AnalyticsPage({ dataBySheet, monthlyExpensesBySheet, loading }: { dataBySheet: Record<string, SheetDataState>; monthlyExpensesBySheet: Record<string, MonthlyExpense[]>; loading: boolean }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const currentSheet = getCurrentMonthSheet(dataBySheet)
  const currentOrders = dataBySheet[currentSheet.id]?.orders ?? EMPTY_ORDERS
  const language = i18n.resolvedLanguage ?? 'en'
  const [statusFilter, setStatusFilter] = useState('all')
  const [monthlySort, setMonthlySort] = useState('sales-desc')
  const matchesStatus = (order: SheetOrder) => {
    if (statusFilter === 'paid') return order.paymentStatus === 'จ่ายเต็ม'
    if (statusFilter === 'unpaid') return order.paymentStatus === 'ยังไม่ได้ชำระ'
    if (statusFilter === 'deposit') return order.paymentStatus === 'มัดจำ'
    if (statusFilter === 'shipped') return order.shippingStatus === 'ส่งแล้ว'
    if (statusFilter === 'not-ordered') return order.shippingStatus === 'ยังไม่ได้สั่ง'
    if (statusFilter === 'ordered') return order.shippingStatus === 'สั่งแล้ว'
    if (statusFilter === 'inbound') return order.shippingStatus === 'รอเข้าไทย'
    if (statusFilter === 'unlisted') return !order.paymentStatus && !order.shippingStatus
    return true
  }
  const filteredOrdersForSheet = (sheet: SheetDefinition) => (dataBySheet[sheet.id]?.orders ?? EMPTY_ORDERS).filter(matchesStatus)
  const scopedOrders = currentOrders.filter(matchesStatus)
  const currentExpenseTotal = (monthlyExpensesBySheet[currentSheet.id] ?? []).reduce((sum, expense) => sum + expense.amount, 0)
  const scopedProfit = getProfitSummary(scopedOrders, statusFilter === 'all' ? currentExpenseTotal : 0)
  const shipped = scopedOrders.filter((order) => order.shippingStatus === 'ส่งแล้ว').length
  const inbound = scopedOrders.filter((order) => order.shippingStatus === 'รอเข้าไทย').length
  const paid = scopedOrders.filter((order) => order.paymentStatus === 'จ่ายเต็ม').length
  const deposits = scopedOrders.filter((order) => order.paymentStatus === 'มัดจำ').length
  const salesSheets = SHEETS.filter((sheet) => sheet.kind === 'sales').sort((a, b) => a.year - b.year || MONTH_INDEX[a.monthKey] - MONTH_INDEX[b.monthKey])
  const currentSalesSheetIndex = salesSheets.findIndex((sheet) => sheet.id === currentSheet.id)
  const previousSalesSheet = currentSalesSheetIndex > 0 ? salesSheets[currentSalesSheetIndex - 1] : undefined
  const previousSalesState = previousSalesSheet ? dataBySheet[previousSalesSheet.id] : undefined
  const previousSalesOrders = previousSalesSheet ? filteredOrdersForSheet(previousSalesSheet) : EMPTY_ORDERS
  const currentSalesState = dataBySheet[currentSheet.id]
  const comparisonDate = getCurrentDate()
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

  return (
    <section className="app-screen home-screen analytics-screen" aria-label={t('screen.analytics')}>
      <div className="screen-fixed-header analytics-fixed-header">
        <header className="sales-summary analytics-summary">
          <p>{t('sheets.kind.sales')} · {t(currentSheet.titleKey)}</p>
          <h1>{t('analytics.title')}</h1>
          <p className="sales-growth">{loading ? t('sheet.loadingShort') : t('analytics.currentMonth')}</p>
        </header>
        <label className="analytics-status-filter"><span>{t('filters.status')}</span><select className="select select-bordered select-sm select-primary" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">{t('filters.allStatuses')}</option><option value="paid">{t('detail.paymentFull')}</option><option value="unpaid">{t('detail.paymentUnpaid')}</option><option value="deposit">{t('detail.paymentDeposit')}</option><option value="shipped">{t('detail.shippingSent')}</option><option value="not-ordered">{t('detail.shippingNotOrdered')}</option><option value="ordered">{t('detail.shippingOrdered')}</option><option value="inbound">{t('detail.shippingInbound')}</option><option value="unlisted">{t('filters.unlisted')}</option></select></label>
      </div>
      <div className="home-scroll-area analytics-scroll-area">
        <div className="analytics-metrics">
          {loading && Object.keys(dataBySheet).length === 0 ? Array.from({ length: 8 }, (_, index) => <div className="metric-card-skeleton" key={index}><i /><b /></div>) : <>
            <article className="metric-card featured"><span>{statusFilter === 'all' ? t('analytics.thisMonth') : t('analytics.filteredSales')}</span><strong>{formatMoney(sheetTotal(scopedOrders), language)} <small>THB</small></strong></article>
            <article className="metric-card"><span>{t('analytics.totalProfit')}</span><strong className={scopedProfit.amount === null ? 'profit-unavailable' : scopedProfit.amount < 0 ? 'negative-text' : 'positive-text'}>{scopedProfit.amount === null ? '—' : `${formatMoney(scopedProfit.amount, language)} THB`}</strong><em>{scopedProfit.amount === null ? t('analytics.noPeriodProfit') : scopedProfit.knownLines < scopedProfit.totalLines ? t('analytics.profitCoverage', { known: scopedProfit.knownLines, total: scopedProfit.totalLines }) : statusFilter === 'all' ? t('analytics.currentScopeProfit') : t('analytics.filteredScopeProfit')}</em></article>
            <article className={`metric-card trend-card${currentSalesChange === null ? ' unavailable' : currentSalesChange < 0 ? ' negative' : ' positive'}`}>
              <span>{t('analytics.monthlyChange')}</span>
              <strong>{formatSignedPercent(currentSalesChange, language)}</strong>
              <em>{previousSalesSheet && currentSalesChange !== null ? t('analytics.changeContext', { month: t(previousSalesSheet.titleKey) }) : t('analytics.noComparison')}</em>
            </article>
            <article className={`metric-card trend-card${yearOverYearChange === null ? ' unavailable' : yearOverYearChange < 0 ? ' negative' : ' positive'}`}>
              <span>{t('analytics.yearlyChange')}</span>
              <strong>{formatSignedPercent(yearOverYearChange, language)}</strong>
              <em>{previousYearSheet && yearOverYearChange !== null ? t('analytics.yearlyContext', { year: currentYear - 1 }) : t('analytics.noYearlyComparison')}</em>
            </article>
            <article className="metric-card"><span>{t('analytics.averageSales')}</span><strong>{formatMoney(averageSales, language)} <small>THB</small></strong><em>{t('analytics.averageMonths', { count: populatedSalesSheets.length })}</em></article>
            <article className="metric-card"><span>{t('analytics.averageProfit')}</span><strong>{averageProfit === null ? '—' : `${formatMoney(averageProfit, language)} THB`}</strong><em>{averageProfit === null ? t('analytics.noProfitData') : t('analytics.profitSample', { count: recordedProfits.length })}</em></article>
            <article className="metric-card"><span>{t('analytics.orders')}</span><strong>{scopedOrders.length}</strong></article>
            <article className="metric-card"><span>{t('analytics.items')}</span><strong>{scopedOrders.reduce((sum, order) => sum + order.quantity, 0)}</strong></article>
            <article className="metric-card"><span>{t('analytics.shipped')}</span><strong>{shipped}</strong></article>
          </>}
        </div>

        <section className="analytics-section">
          <h2>{t('analytics.statusTitle')}</h2>
          <div className="status-summary-row"><span className="status-badge paid">{t('detail.paymentFull')}</span><strong>{paid}</strong></div>
          <div className="status-summary-row"><span className="status-badge deposit">{t('detail.paymentDeposit')}</span><strong>{deposits}</strong></div>
          <div className="status-summary-row"><span className="status-badge shipped">{t('detail.shippingSent')}</span><strong>{shipped}</strong></div>
          <div className="status-summary-row"><span className="status-badge not-ordered">{t('detail.shippingNotOrdered')}</span><strong>{scopedOrders.filter((order) => order.shippingStatus === 'ยังไม่ได้สั่ง').length}</strong></div>
          <div className="status-summary-row"><span className="status-badge ordered">{t('detail.shippingOrdered')}</span><strong>{scopedOrders.filter((order) => order.shippingStatus === 'สั่งแล้ว').length}</strong></div>
          <div className="status-summary-row"><span className="status-badge inbound">{t('detail.shippingInbound')}</span><strong>{inbound}</strong></div>
        </section>

        <AnalyticsSettings />

        <section className="analytics-section sales-by-month">
          <div className="analytics-heading"><h2>{t('analytics.monthlySales')}</h2><label><span className="sr-only">{t('filters.sort')}</span><select className="select select-bordered select-sm select-primary" value={monthlySort} onChange={(event) => setMonthlySort(event.target.value)}><option value="sales-desc">{t('filters.salesHigh')}</option><option value="sales-asc">{t('filters.salesLow')}</option><option value="month">{t('filters.monthOrder')}</option></select></label></div>
          {sortedSalesSheets.map((sheet) => {
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
            return <button type="button" className="monthly-bar-row" key={sheet.id} onClick={() => navigate(`/admin/sheets/${sheet.id}`)}><span className="monthly-bar-month">{t(sheet.titleKey)}<small className={change === null ? 'trend-unavailable' : change < 0 ? 'negative-text' : 'positive-text'}>{change === null ? '—' : `${formatSignedPercent(change, language)}${isThisMonth ? ' MTD' : ' MoM'}`}</small></span><span className="monthly-bar"><i style={{ width: `${width}%` }} /></span><strong>{formatMoney(amount, language)}</strong></button>
          })}
        </section>
      </div>
      <BottomNavigation />
    </section>
  )
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(readAdminSession)
  const [dataBySheet, setDataBySheet] = useState<Record<string, SheetDataState>>({})
  const [localOrdersBySheet, setLocalOrdersBySheet] = useState<Record<string, SheetOrder[]>>(() => readAdminSession() ? loadLocalOrders() : {})
  const [monthlyExpensesBySheet, setMonthlyExpensesBySheet] = useState<Record<string, MonthlyExpense[]>>(() => readAdminSession() ? loadMonthlyExpenses() : {})
  const [exchangeRate, setExchangeRate] = useState(loadExchangeRate)
  const [localOrdersReady, setLocalOrdersReady] = useState(readAdminSession)
  const [loading, setLoading] = useState(readAdminSession)
  const [initialDataReady, setInitialDataReady] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [bootReady, setBootReady] = useState(false)
  const isAdminPath = location.pathname === '/admin' || location.pathname.startsWith('/admin/')

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setBootReady(true), 1000)
    return () => window.clearTimeout(timeoutId)
  }, [])

  useEffect(() => {
    if (!isAdminAuthenticated || !isAdminPath) return
    const controller = new AbortController()
    fetchAllSheets(controller.signal)
      .then((result) => setDataBySheet(result))
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
          setInitialDataReady(true)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
          setInitialDataReady(true)
        }
      })
    return () => controller.abort()
  }, [refreshKey, isAdminAuthenticated, isAdminPath])

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
      localStorage.setItem(EXCHANGE_RATE_KEY, String(exchangeRate))
    } catch {
      // Expense and exchange-rate settings remain active for this app session if storage is unavailable.
    }
  }, [monthlyExpensesBySheet, exchangeRate, isAdminAuthenticated, localOrdersReady])

  const mergedDataBySheet = useMemo(() => Object.fromEntries(SHEETS.map((sheet) => {
    const remote = dataBySheet[sheet.id] ?? { orders: [] }
    const localOrders = localOrdersBySheet[sheet.id] ?? []
    const localById = new Map(localOrders.map((order) => [order.id, order]))
    const remoteIds = new Set(remote.orders.map((order) => order.id))
    const overriddenRemote = remote.orders.map((order) => localById.get(order.id) ?? order)
    const newLocalOrders = localOrders.filter((order) => !remoteIds.has(order.id))
    return [sheet.id, { ...remote, orders: [...newLocalOrders, ...overriddenRemote] }]
  })), [dataBySheet, localOrdersBySheet])

  const refresh = useCallback(() => {
    setLoading(true)
    setRefreshKey((key) => key + 1)
  }, [])

  const login = (username: string, password: string) => {
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) return false
    try {
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ username, expiresAt: Date.now() + ADMIN_SESSION_TTL_MS }))
    } catch {
      // Authentication remains active for this app session if storage is blocked.
    }
    setLocalOrdersBySheet(loadLocalOrders())
    setMonthlyExpensesBySheet(loadMonthlyExpenses())
    setExchangeRate(loadExchangeRate())
    setLocalOrdersReady(true)
    setInitialDataReady(false)
    setLoading(true)
    setIsAdminAuthenticated(true)
    navigate('/admin/home', { replace: true })
    return true
  }

  const expireSession = useCallback(() => {
    try {
      localStorage.removeItem(ADMIN_SESSION_KEY)
    } catch {
      // Ignore storage restrictions; the in-memory guard still closes.
    }
    setIsAdminAuthenticated(false)
    setLocalOrdersBySheet({})
    setMonthlyExpensesBySheet({})
    setLocalOrdersReady(false)
    setDataBySheet({})
    setInitialDataReady(false)
    setLoading(false)
    navigate('/admin', { replace: true })
  }, [navigate])

  useEffect(() => {
    if (!isAdminAuthenticated) return
    const expiresAt = readAdminSessionExpiry()
    if (expiresAt === null) {
      const timeoutId = window.setTimeout(expireSession, 0)
      return () => window.clearTimeout(timeoutId)
    }
    const timeoutId = window.setTimeout(expireSession, Math.max(0, expiresAt - Date.now()))
    const onStorage = (event: StorageEvent) => {
      if (event.key === ADMIN_SESSION_KEY && !event.newValue) expireSession()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.clearTimeout(timeoutId)
      window.removeEventListener('storage', onStorage)
    }
  }, [expireSession, isAdminAuthenticated])


  const saveMonthlyExpenses = (sheetId: string, expenses: MonthlyExpense[]) => {
    setMonthlyExpensesBySheet((current) => ({ ...current, [sheetId]: expenses }))
  }

  const createLocalOrder = (sheetId: string, draft: OrderDraft, originalOrder?: SheetOrder) => {
    const rate = Number(draft.exchangeRate) > 0 ? Number(draft.exchangeRate) : exchangeRate
    const lines: SheetOrderLine[] = draft.lines.map((line) => {
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
        row: 0,
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
      id: originalOrder?.id ?? `local-${Date.now()}`,
      sheetRow: originalOrder?.sheetRow ?? 0,
      day: draft.day,
      lineName: draft.lineName.trim(),
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
    }
    setLocalOrdersBySheet((current) => {
      const existing = current[sheetId] ?? []
      const alreadySaved = existing.some((item) => item.id === order.id)
      return { ...current, [sheetId]: alreadySaved ? existing.map((item) => item.id === order.id ? order : item) : [order, ...existing] }
    })
    if (rate !== exchangeRate) setExchangeRate(rate)
  }

  const currentMonthSheet = getCurrentMonthSheet(mergedDataBySheet)

  if (!isAdminPath) {
    return <main className="app-stage"><div className="app-shell"><SplashScreen showLoading={false} /></div></main>
  }
  if (!isAdminAuthenticated && location.pathname !== '/admin') return <Navigate to="/admin" replace />
  if (!isAdminAuthenticated) {
    return <main className="app-stage"><div className="app-shell"><AdminLoginPage onLogin={login} /></div></main>
  }
  if (location.pathname === '/admin') return <Navigate to="/admin/home" replace />
  if (!bootReady || !initialDataReady) {
    return <main className="app-stage"><div className="app-shell"><SplashScreen /></div></main>
  }

  return (
    <main className="app-stage">
      <div className="app-shell">

        <Routes>
          <Route path="/admin/home" element={<HomePage dataBySheet={mergedDataBySheet} loading={loading} refreshing={loading && Object.keys(dataBySheet).length > 0} onRefresh={refresh} />} />
          <Route path="/admin/orders" element={<SheetRouteView sheet={currentMonthSheet} dataBySheet={mergedDataBySheet} loading={loading} onRefresh={refresh} onCreateOrder={createLocalOrder} monthlyExpensesBySheet={monthlyExpensesBySheet} onSaveMonthlyExpenses={saveMonthlyExpenses} exchangeRate={exchangeRate} onExchangeRateChange={setExchangeRate} />} />
          <Route path="/admin/sheets/:sheetId" element={<SheetRouteView dataBySheet={mergedDataBySheet} loading={loading} onRefresh={refresh} onCreateOrder={createLocalOrder} monthlyExpensesBySheet={monthlyExpensesBySheet} onSaveMonthlyExpenses={saveMonthlyExpenses} exchangeRate={exchangeRate} onExchangeRateChange={setExchangeRate} />} />
          <Route path="/admin/sheets/:sheetId/orders/:orderId" element={<OrderDetailsRoute dataBySheet={mergedDataBySheet} loading={loading} onRefresh={refresh} onSaveOrder={createLocalOrder} exchangeRate={exchangeRate} onExchangeRateChange={setExchangeRate} />} />
          <Route path="/admin/analytics" element={<AnalyticsPage dataBySheet={mergedDataBySheet} monthlyExpensesBySheet={monthlyExpensesBySheet} loading={loading} />} />
          <Route path="*" element={<Navigate to="/admin/home" replace />} />
        </Routes>
      </div>
    </main>
  )
}

function SheetRouteView({
  sheet: explicitSheet,
  dataBySheet,
  loading,
  onRefresh,
  onCreateOrder,
  monthlyExpensesBySheet,
  onSaveMonthlyExpenses,
  exchangeRate,
  onExchangeRateChange,
}: {
  sheet?: SheetDefinition
  dataBySheet: Record<string, SheetDataState>
  loading: boolean
  onRefresh: () => void
  onCreateOrder: (sheetId: string, draft: OrderDraft, originalOrder?: SheetOrder) => void
  monthlyExpensesBySheet: Record<string, MonthlyExpense[]>
  onSaveMonthlyExpenses: (sheetId: string, expenses: MonthlyExpense[]) => void
  exchangeRate: number
  onExchangeRateChange: (value: number) => void
}) {
  const { sheetId } = useParams()
  const sheet = explicitSheet ?? SHEETS.find((item) => item.id === sheetId)
  if (!sheet) return <Navigate to="/admin/home" replace />
  return <SheetOrdersPage key={sheet.id} sheet={sheet} sheetData={dataBySheet[sheet.id]} loading={loading} onRefresh={onRefresh} onCreateOrder={onCreateOrder} monthlyExpenses={monthlyExpensesBySheet[sheet.id] ?? []} onSaveMonthlyExpenses={onSaveMonthlyExpenses} exchangeRate={exchangeRate} onExchangeRateChange={onExchangeRateChange} />
}

function OrderDetailsRoute({ dataBySheet, loading, onRefresh, onSaveOrder, exchangeRate, onExchangeRateChange }: { dataBySheet: Record<string, SheetDataState>; loading: boolean; onRefresh: () => void; onSaveOrder: (sheetId: string, draft: OrderDraft, originalOrder?: SheetOrder) => void; exchangeRate: number; onExchangeRateChange: (value: number) => void }) {
  const { sheetId } = useParams()
  const sheet = SHEETS.find((item) => item.id === sheetId)
  if (!sheet) return <Navigate to="/admin/home" replace />
  return <OrderDetailsPage sheet={sheet} sheetData={dataBySheet[sheet.id]} loading={loading} onRefresh={onRefresh} onSaveOrder={onSaveOrder} exchangeRate={exchangeRate} onExchangeRateChange={onExchangeRateChange} />
}

export default App
