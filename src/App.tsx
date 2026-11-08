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
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router'
import {
  fetchAllSheets,
  formatOrderDate,
  SHEETS,
  type SheetDataState,
  type SheetDefinition,
  type SheetOrder,
  type SheetOrderLine,
} from './sheet'

type DraftLine = {
  itemName: string
  quantity: string
  salePrice: string
  bankAmount: string
  depositAmount: string
  image: string
  imageName: string
  imageIsNew: boolean
}

type OrderDraft = {
  lineName: string
  customerName: string
  day: string
  paymentStatus: string
  shippingStatus: string
  lines: DraftLine[]
}

const LOCAL_ORDERS_KEY = 'sweetie-local-orders-v1'
const EMPTY_ORDERS: SheetOrder[] = []

function formatMoney(value: number, language: string) {
  return new Intl.NumberFormat(language === 'th' ? 'th-TH' : 'en-US', {
    maximumFractionDigits: 2,
  }).format(value)
}

function loadLocalOrders(): Record<string, SheetOrder[]> {
  try {
    const saved = localStorage.getItem(LOCAL_ORDERS_KEY)
    return saved ? JSON.parse(saved) as Record<string, SheetOrder[]> : {}
  } catch {
    return {}
  }
}

function getCurrentMonthSheet(dataBySheet: Record<string, SheetDataState>): SheetDefinition {
  const monthKey = ['jan', 'feb', 'mar', 'apr', 'may', 'june', 'july', 'aug', 'sep', 'oct', 'nov', 'dec'][new Date().getMonth()]
  const thisMonth = SHEETS.find((sheet) => sheet.kind === 'sales' && sheet.monthKey === monthKey)
  if (thisMonth) return thisMonth
  return [...SHEETS].reverse().find((sheet) => sheet.kind === 'sales' && (dataBySheet[sheet.id]?.orders.length ?? 0) > 0) ?? SHEETS[0]
}

function paymentStatusLabel(status: string, t: (key: string) => string) {
  if (status === 'จ่ายเต็ม') return t('detail.paymentFull')
  if (status === 'มัดจำ') return t('detail.paymentDeposit')
  return status || t('detail.notSet')
}

function shippingStatusLabel(status: string, t: (key: string) => string) {
  if (status === 'รอเข้าไทย') return t('detail.shippingInbound')
  if (status === 'ส่งแล้ว') return t('detail.shippingSent')
  return status || t('detail.notSet')
}

function paymentBadgeClass(status: string) {
  if (status === 'จ่ายเต็ม') return 'paid'
  if (status === 'มัดจำ') return 'deposit'
  return 'neutral'
}

function shippingBadgeClass(status: string) {
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

function SweetieMark() {
  return (
    <svg className="sweetie-mark" viewBox="0 0 190 150" role="img" aria-label="Sweetie">
      <path
        className="mark-heart"
        d="M95 137 18 67C-4 45 10 9 42 9c22 0 37 13 53 32C111 22 126 9 148 9c32 0 46 36 24 58L95 137Z"
      />
      <path className="mark-heart-line" d="M95 124 25 62C9 45 18 18 42 18c19 0 34 12 53 36 19-24 34-36 53-36 24 0 33 27 17 44l-70 62Z" />
      <text x="95" y="79" textAnchor="middle" className="mark-word">sweetie</text>
      <text x="95" y="99" textAnchor="middle" className="mark-caption">D E S T I N A T I O N</text>
      <circle cx="49" cy="38" r="2" className="mark-sparkle" />
      <circle cx="137" cy="38" r="2" className="mark-sparkle" />
      <circle cx="42" cy="52" r="1.5" className="mark-sparkle" />
      <circle cx="148" cy="52" r="1.5" className="mark-sparkle" />
    </svg>
  )
}

function LanguageToggle() {
  const { i18n, t } = useTranslation()
  const language = i18n.resolvedLanguage ?? 'en'

  return (
    <div className="language-toggle" aria-label={t('language')}>
      <button type="button" className={language === 'en' ? 'selected' : ''} onClick={() => void i18n.changeLanguage('en')}>EN</button>
      <button type="button" className={language === 'th' ? 'selected' : ''} onClick={() => void i18n.changeLanguage('th')}>TH</button>
    </div>
  )
}

function SplashScreen() {
  const { t } = useTranslation()

  return (
    <section className="app-screen splash-screen" aria-label={t('screen.splash')}>
      <div className="splash-content">
        <SweetieMark />
        <p className="splash-tagline">{t('splash.tagline')}</p>
      </div>
      <span className="splash-loading" aria-hidden="true"><i /></span>
    </section>
  )
}

function BottomNavigation() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const isHome = location.pathname === '/home'
  const isAnalytics = location.pathname === '/analytics'

  return (
    <nav className="bottom-nav" aria-label={t('nav.label')}>
      <button type="button" className={`nav-item${isHome ? ' active' : ''}`} aria-label={t('nav.home')} onClick={() => navigate('/home')}><Home size={22} fill={isHome ? 'currentColor' : 'none'} /></button>
      <button type="button" className={`nav-item${!isHome && !isAnalytics ? ' active' : ''}`} aria-label={t('nav.orders')} onClick={() => navigate('/orders')}><ClipboardList size={22} /></button>
      <button type="button" className={`nav-item${isAnalytics ? ' active' : ''}`} aria-label={t('nav.analytics')} onClick={() => navigate('/analytics')}><BarChart3 size={22} /></button>
    </nav>
  )
}

function sheetTotal(orders: SheetOrder[]) {
  return orders.reduce((sum, order) => sum + order.totalSales, 0)
}

function getPreviewImage(orders: SheetOrder[]) {
  return orders.flatMap((order) => order.lines).flatMap((line) => line.images)[0]
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

  const sheetRows = SHEETS.map((sheet, index) => ({
    sheet,
    index,
    orders: dataBySheet[sheet.id]?.orders ?? EMPTY_ORDERS,
    error: dataBySheet[sheet.id]?.error,
  }))
  const visibleSheets = sheetRows
    .filter(({ sheet }) => kindFilter === 'all' || sheet.kind === kindFilter)
    .filter(({ sheet }) => t(sheet.titleKey).toLocaleLowerCase().includes(query.toLocaleLowerCase()))
    .filter(({ orders }) => statusFilter === 'all' || orders.some((order) => {
      if (statusFilter === 'paid') return order.paymentStatus === 'จ่ายเต็ม'
      if (statusFilter === 'deposit') return order.paymentStatus === 'มัดจำ'
      if (statusFilter === 'shipped') return order.shippingStatus === 'ส่งแล้ว'
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
    <section className="app-screen home-screen" aria-label={t('screen.home')}>
      <div className="home-scroll-area">
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
          <label><span className="sr-only">{t('filters.sheetType')}</span><select value={kindFilter} onChange={(event) => setKindFilter(event.target.value)}><option value="all">{t('filters.allSheets')}</option><option value="sales">{t('sheets.kind.sales')}</option><option value="haul">{t('sheets.kind.haul')}</option></select></label>
          <label><span className="sr-only">{t('filters.status')}</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">{t('filters.allStatuses')}</option><option value="paid">{t('detail.paymentFull')}</option><option value="deposit">{t('detail.paymentDeposit')}</option><option value="shipped">{t('detail.shippingSent')}</option><option value="inbound">{t('detail.shippingInbound')}</option><option value="unlisted">{t('filters.unlisted')}</option></select></label>
          <label><span className="sr-only">{t('filters.sortSheets')}</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="month">{t('filters.monthOrder')}</option><option value="sales-desc">{t('filters.salesHigh')}</option><option value="sales-asc">{t('filters.salesLow')}</option><option value="orders-desc">{t('filters.ordersHigh')}</option><option value="name">{t('filters.nameAZ')}</option></select></label>
        </div>

        {loading && Object.keys(dataBySheet).length === 0 ? <div className="sheet-grid" aria-label={t('sheet.loading')}>
          {Array.from({ length: 6 }, (_, index) => <div className="sheet-card-skeleton" key={index}><i /><b /><b /></div>)}
        </div> : <>
          {!loading && visibleSheets.length === 0 && <p className="sheet-message">{t('sheets.noMatch')}</p>}
          <div className="sheet-grid">
            {visibleSheets.map(({ sheet, orders, error }) => {
              const image = getPreviewImage(orders)
              return (
                <button
                  type="button"
                  className="sheet-card"
                  key={sheet.id}
                  onClick={() => navigate(`/sheets/${sheet.id}`)}
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
          </div>
        </>}
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
      className="order-list-row"
      onClick={() => navigate(`/sheets/${sheet.id}/orders/${order.id}`)}
      aria-label={`${t('orders.open')} ${order.customerName || order.lineName}`}
    >
      <span className="order-row-photo">
        {image ? <img src={image} alt="" loading="lazy" /> : <Package size={22} />}
      </span>
      <span className="order-row-main">
        <span className="order-row-title">{order.customerName || order.lineName}</span>
        <span className="order-row-subtitle">{order.lineName} · {formatOrderDate(order.day, sheet, language)} · {order.quantity === 1 ? t('orders.oneItem') : t('orders.manyItems', { count: order.quantity })}</span>
        <span className="order-row-badges">
          <StatusBadge type="payment" status={order.paymentStatus} />
          <StatusBadge type="shipping" status={order.shippingStatus} />
          {order.isLocal && <span className="status-badge local">{t('orders.deviceOnly')}</span>}
        </span>
      </span>
      <span className="order-row-total">{formatMoney(order.totalSales, language)}<small>THB</small></span>
    </button>
  )
}

function getDefaultDay(sheet: SheetDefinition) {
  const monthIndex: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, june: 5, july: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }
  const now = new Date()
  return String(now.getMonth() === monthIndex[sheet.monthKey] ? now.getDate() : 1)
}

function emptyDraft(sheet: SheetDefinition): OrderDraft {
  return {
    lineName: '',
    customerName: '',
    day: getDefaultDay(sheet),
    paymentStatus: '',
    shippingStatus: '',
    lines: [{ itemName: '', quantity: '1', salePrice: '', bankAmount: '', depositAmount: '', image: '', imageName: '', imageIsNew: false }],
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
  onClose,
  onSave,
}: {
  sheet: SheetDefinition
  imageChoices: Array<{ url: string; label: string }>
  onClose: () => void
  onSave: (draft: OrderDraft) => void
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(() => emptyDraft(sheet))
  const [openPicker, setOpenPicker] = useState<number | null>(null)
  const [imageQuery, setImageQuery] = useState('')
  const [imageError, setImageError] = useState('')

  const updateField = <K extends keyof OrderDraft>(key: K, value: OrderDraft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const updateLine = (index: number, key: 'itemName' | 'quantity' | 'salePrice' | 'bankAmount' | 'depositAmount' | 'image' | 'imageName', value: string) => {
    setDraft((current) => ({
      ...current,
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
      updateLine(index, 'image', image)
      updateLine(index, 'imageName', '')
      setDraft((current) => ({ ...current, lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, imageIsNew: true } : line) }))
      setImageError('')
    } catch {
      setImageError(t('createOrder.imageReadError'))
    }
  }

  const filteredImages = imageChoices.filter((choice) => choice.label.toLocaleLowerCase().includes(imageQuery.toLocaleLowerCase()))

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSave(draft)
  }

  return createPortal(
    <div className="modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="create-order-modal" role="dialog" aria-modal="true" aria-labelledby="create-order-heading">
        <header className="modal-header">
          <div>
            <p>{t(sheet.titleKey)}</p>
            <h2 id="create-order-heading">{t('createOrder.title')}</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t('createOrder.close')}><X size={20} /></button>
        </header>

        <form className="order-form" onSubmit={submit}>
          <div className="form-grid two-columns">
            <label>{t('detail.lineName')}<input value={draft.lineName} onChange={(event) => updateField('lineName', event.target.value)} placeholder={t('createOrder.linePlaceholder')} /></label>
            <label>{t('detail.customer')}<input value={draft.customerName} onChange={(event) => updateField('customerName', event.target.value)} required placeholder={t('createOrder.customerPlaceholder')} /></label>
          </div>
          <label className="day-field">{t('createOrder.day')}<input type="number" min="1" max="31" value={draft.day} onChange={(event) => updateField('day', event.target.value)} required /></label>

          <div className="form-section-heading"><h3>{t('detail.items')}</h3><span>{t('createOrder.monthOnlyImages', { month: t(sheet.titleKey) })}</span></div>

          {draft.lines.map((line, index) => (
            <section className="draft-line-card" key={index}>
              <div className="draft-line-heading"><strong>{t('createOrder.itemNumber', { number: index + 1 })}</strong>{draft.lines.length > 1 && <button type="button" className="remove-line" onClick={() => setDraft((current) => ({ ...current, lines: current.lines.filter((_, lineIndex) => lineIndex !== index) }))}>{t('createOrder.remove')}</button>}</div>
              <label>{t('createOrder.itemName')}<input value={line.itemName} onChange={(event) => updateLine(index, 'itemName', event.target.value)} required /></label>
              <div className="form-grid two-columns">
                <label>{t('createOrder.quantity')}<input type="number" min="1" value={line.quantity} onChange={(event) => updateLine(index, 'quantity', event.target.value)} required /></label>
                <label>{t('createOrder.price')}<input type="number" min="0" step="0.01" value={line.salePrice} onChange={(event) => updateLine(index, 'salePrice', event.target.value)} required /></label>
                <label>{t('createOrder.bank')}<input type="number" min="0" step="0.01" value={line.bankAmount} onChange={(event) => updateLine(index, 'bankAmount', event.target.value)} /></label>
                <label>{t('createOrder.depositAmount')}<input type="number" min="0" step="0.01" value={line.depositAmount} onChange={(event) => updateLine(index, 'depositAmount', event.target.value)} /></label>
              </div>

              <div className="image-source-row">
                <label className="upload-image-button">
                  <ImagePlus size={16} /> {t('createOrder.uploadPhoto')}
                  <input type="file" accept="image/*" onChange={(event) => void handleFile(index, event.target.files?.[0])} />
                </label>
                <button type="button" className="choose-month-image" onClick={() => { setOpenPicker(openPicker === index ? null : index); setImageQuery('') }} disabled={imageChoices.length === 0}>
                  {t('createOrder.chooseMonthImage')}
                </button>
              </div>

              {line.image && <div className="draft-image-preview"><img src={line.image} alt={t('createOrder.selectedImage')} /><button type="button" onClick={() => { updateLine(index, 'image', ''); updateLine(index, 'imageName', ''); setDraft((current) => ({ ...current, lines: current.lines.map((item, lineIndex) => lineIndex === index ? { ...item, imageIsNew: false } : item) })) }}>{t('createOrder.removeImage')}</button></div>}
              {line.image && line.imageIsNew && <label>{t('createOrder.photoName')} ({t('createOrder.optional')})<input value={line.imageName} onChange={(event) => updateLine(index, 'imageName', event.target.value)} placeholder={t('createOrder.photoNamePlaceholder')} /></label>}

              {openPicker === index && <div className="month-image-picker">
                <input value={imageQuery} onChange={(event) => setImageQuery(event.target.value)} placeholder={t('createOrder.filterMonthImages')} aria-label={t('createOrder.filterMonthImages')} />
                <div className="month-image-grid">
                  {filteredImages.map((choice) => <button type="button" key={choice.url} title={choice.label} onClick={() => { updateLine(index, 'image', choice.url); updateLine(index, 'imageName', ''); setDraft((current) => ({ ...current, lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, imageIsNew: false } : line) })); setOpenPicker(null) }}><img src={choice.url} alt={choice.label} /></button>)}
                  {filteredImages.length === 0 && <span className="picker-empty">{t('createOrder.noMonthImages')}</span>}
                </div>
              </div>}
            </section>
          ))}
          <button type="button" className="add-line-button" onClick={() => setDraft((current) => ({ ...current, lines: [...current.lines, { itemName: '', quantity: '1', salePrice: '', bankAmount: '', depositAmount: '', image: '', imageName: '', imageIsNew: false }] }))}><Plus size={15} /> {t('createOrder.addItem')}</button>

          <div className="form-grid two-columns">
            <label>{t('createOrder.paymentStatus')}<select value={draft.paymentStatus} onChange={(event) => updateField('paymentStatus', event.target.value)}><option value="">{t('detail.notSet')}</option><option value="จ่ายเต็ม">{t('detail.paymentFull')}</option><option value="มัดจำ">{t('detail.paymentDeposit')}</option></select></label>
            <label>{t('createOrder.shippingStatus')}<select value={draft.shippingStatus} onChange={(event) => updateField('shippingStatus', event.target.value)}><option value="">{t('detail.notSet')}</option><option value="รอเข้าไทย">{t('detail.shippingInbound')}</option><option value="ส่งแล้ว">{t('detail.shippingSent')}</option></select></label>
          </div>
          {imageError && <p className="form-error" role="alert">{imageError}</p>}
          <p className="local-save-note">{t('createOrder.localOnly')}</p>
          <footer className="modal-actions">
            <button type="button" className="cancel-order-button" onClick={onClose}>{t('createOrder.cancel')}</button>
            <button type="submit" className="save-order-button"><Check size={16} /> {t('createOrder.save')}</button>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  )
}

function SheetOrdersPage({
  sheet,
  sheetData,
  loading,
  onRefresh,
  onCreateOrder,
}: {
  sheet: SheetDefinition
  sheetData?: SheetDataState
  loading: boolean
  onRefresh: () => void
  onCreateOrder: (sheetId: string, draft: OrderDraft) => void
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const language = i18n.resolvedLanguage ?? 'en'
  const scrollRootRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('sales-desc')
  const [visibleCount, setVisibleCount] = useState(10)
  const [createOpen, setCreateOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const orders = sheetData?.orders ?? EMPTY_ORDERS

  const sortedOrders = useMemo(() => {
    const matching = orders.filter((order) => {
      const searchText = `${order.lineName} ${order.customerName} ${order.lines.map((line) => line.itemName).join(' ')} ${order.paymentStatus} ${order.shippingStatus}`.toLocaleLowerCase()
      if (!searchText.includes(query.toLocaleLowerCase())) return false
      if (statusFilter === 'paid') return order.paymentStatus === 'จ่ายเต็ม'
      if (statusFilter === 'deposit') return order.paymentStatus === 'มัดจำ'
      if (statusFilter === 'shipped') return order.shippingStatus === 'ส่งแล้ว'
      if (statusFilter === 'inbound') return order.shippingStatus === 'รอเข้าไทย'
      if (statusFilter === 'unlisted') return !order.paymentStatus && !order.shippingStatus
      return true
    })
    return matching.sort((a, b) => {
      if (sortBy === 'sales-asc') return a.totalSales - b.totalSales
      if (sortBy === 'status') return `${a.paymentStatus}-${a.shippingStatus}`.localeCompare(`${b.paymentStatus}-${b.shippingStatus}`)
      if (sortBy === 'oldest') return a.sheetRow - b.sheetRow
      if (sortBy === 'newest') return Number(b.isLocal) - Number(a.isLocal) || b.sheetRow - a.sheetRow
      return b.totalSales - a.totalSales
    })
  }, [orders, query, sortBy, statusFilter])
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
    return orders.flatMap((order) => order.lines.flatMap((line, lineIndex) => line.images.map((url) => ({ url, label: line.itemName || line.imageName || order.customerName || order.lineName || t('createOrder.itemNumber', { number: lineIndex + 1 }) }))))
      .filter((choice) => {
        if (seen.has(choice.url)) return false
        seen.add(choice.url)
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
      <div className="home-scroll-area" ref={scrollRootRef}>
        <button type="button" className="screen-back-button" onClick={() => navigate('/home')} aria-label={t('nav.backToSheets')}>
          <ChevronLeft size={18} /> {t('nav.allSheets')}
        </button>
        <header className="sales-summary month-summary">
          <p>{t(`sheets.kind.${sheet.kind}`)}</p>
          <h1>{t(sheet.titleKey)}</h1>
          <p className="sales-growth">{loading && !sheetData ? t('sheet.loadingShort') : t('sheets.monthSummary', { orders: orders.length, total: formatMoney(sheetTotal(orders), language) })}</p>
        </header>

        <div className="order-list-heading">
          <div><h2>{t('orders.title')}</h2><span>{t('orders.resultCount', { shown: visibleOrders.length, total: sortedOrders.length })}</span></div>
          <button type="button" className="view-all" onClick={onRefresh} disabled={loading}><RefreshCw size={13} className={loading ? 'refreshing-icon' : ''} />{loading ? t('orders.refreshing') : t('orders.refresh')}</button>
        </div>

        <label className="order-search">
          <Search size={16} />
          <span className="sr-only">{t('orders.search')}</span>
          <input value={query} onChange={(event) => updateQuery(event.target.value)} placeholder={t('orders.search')} />
        </label>
        <div className="order-filter-row">
          <label><span className="sr-only">{t('filters.status')}</span><select value={statusFilter} onChange={(event) => updateStatus(event.target.value)}><option value="all">{t('filters.allStatuses')}</option><option value="paid">{t('detail.paymentFull')}</option><option value="deposit">{t('detail.paymentDeposit')}</option><option value="shipped">{t('detail.shippingSent')}</option><option value="inbound">{t('detail.shippingInbound')}</option><option value="unlisted">{t('filters.unlisted')}</option></select></label>
          <label><span className="sr-only">{t('filters.sort')}</span><select value={sortBy} onChange={(event) => updateSort(event.target.value)}><option value="sales-desc">{t('filters.salesHigh')}</option><option value="sales-asc">{t('filters.salesLow')}</option><option value="status">{t('filters.statusAZ')}</option><option value="newest">{t('filters.newest')}</option><option value="oldest">{t('filters.oldest')}</option></select></label>
        </div>

        {sheetData?.error && <div className="sheet-error" role="alert">{t('sheet.error')} <button type="button" onClick={onRefresh}>{t('sheet.retry')}</button></div>}
        {!sheetData && loading && <div className="order-list-table">{Array.from({ length: 6 }, (_, index) => <div className="skeleton-order-row" key={index}><i /><span><b /><b /><em /></span><b /></div>)}</div>}
        {sheetData && !sheetData.error && orders.length === 0 && <p className="sheet-message">{t('sheet.empty')}</p>}
        {query && sortedOrders.length === 0 && <p className="sheet-message">{t('orders.noMatch')}</p>}

        <div className="order-list-table">
          {visibleOrders.map((order) => <OrderListRow key={order.id} order={order} sheet={sheet} />)}
        </div>
        {hasMore && <div className="load-more-sentinel" ref={sentinelRef} aria-live="polite"><span className="loading-more-dot" /> {t('orders.loadingMore')}</div>}
        {!hasMore && sortedOrders.length > 10 && <p className="list-end-note">{t('orders.endOfList')}</p>}
      </div>
      <div className="create-order-dock"><button type="button" className="create-order-list-button" onClick={() => setCreateOpen(true)}><Plus size={17} /> {t('createOrder.open')}</button></div>
      <BottomNavigation />
      {createOpen && <CreateOrderDialog sheet={sheet} imageChoices={imageChoices} onClose={() => setCreateOpen(false)} onSave={saveLocalOrder} />}
      {notice && <p className="app-toast" role="status">{notice}</p>}
    </section>
  )
}

function OrderDetailsPage({ sheet, sheetData, loading, onRefresh }: { sheet: SheetDefinition; sheetData?: SheetDataState; loading: boolean; onRefresh: () => void }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { orderId } = useParams()
  const language = i18n.resolvedLanguage ?? 'en'
  const [itemQuery, setItemQuery] = useState('')
  const [itemSort, setItemSort] = useState('sales-desc')
  const order = sheetData?.orders.find((item) => item.id === orderId)
  if (loading && !sheetData) return <section className="app-screen detail-screen"><div className="detail-scroll-area"><div className="detail-skeleton-hero" /><div className="detail-skeleton-block" /><div className="detail-skeleton-block" /></div></section>
  if (sheetData?.error) return <section className="app-screen detail-screen"><div className="sheet-error" role="alert">{t('sheet.error')} <button type="button" onClick={onRefresh}>{t('sheet.retry')}</button></div></section>
  if (!order) return <Navigate to={`/sheets/${sheet.id}`} replace />

  const heroImage = order.lines.flatMap((line) => line.images)[0]
  const visibleLines = order.lines.filter((line) => `${line.itemName} ${line.imageName ?? ''}`.toLocaleLowerCase().includes(itemQuery.toLocaleLowerCase())).sort((a, b) => {
    if (itemSort === 'sales-asc') return a.salePrice - b.salePrice
    if (itemSort === 'name') return a.itemName.localeCompare(b.itemName)
    return b.salePrice - a.salePrice
  })

  return (
    <section className="app-screen detail-screen" aria-label={t('screen.detail')}>
      <div className="detail-scroll-area">
        <div className={`detail-hero${heroImage ? ' has-product-image' : ''}`}>
          {heroImage && <img src={heroImage} alt="" />}
          <button type="button" className="back-button" onClick={() => navigate(`/sheets/${sheet.id}`)} aria-label={t('nav.backToOrders')}><ChevronLeft size={20} /></button>
          <div className="hero-label">
            <h1>{order.customerName || order.lineName}</h1>
            <p>{t(sheet.titleKey)} · {formatOrderDate(order.day, sheet, language)} · {formatMoney(order.totalSales, language)} THB</p>
          </div>
        </div>

        <div className="detail-body">
          <div className="detail-title-row">
            <h2>{t('details.title')}</h2>
            <span className="sheet-row-number">{order.isLocal ? t('orders.deviceOnly') : `#${order.sheetRow}`}</span>
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

          <section className="detail-section">
            <h3>{t('detail.items')}</h3>
            <div className="item-list-controls">
              <input value={itemQuery} onChange={(event) => setItemQuery(event.target.value)} placeholder={t('orders.searchItems')} aria-label={t('orders.searchItems')} />
              <select value={itemSort} onChange={(event) => setItemSort(event.target.value)} aria-label={t('filters.sortItems')}><option value="sales-desc">{t('filters.salesHigh')}</option><option value="sales-asc">{t('filters.salesLow')}</option><option value="name">{t('filters.nameAZ')}</option></select>
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
                    {line.attributes.length > 0 && <div className="item-attributes">{line.attributes.slice(0, 3).map((attribute) => <span key={`${attribute.key}-${attribute.value}`}>{fieldLabel(attribute.key, t)}: {attribute.value}</span>)}</div>}
                  </div>
                  <strong className="item-price">{line.salePrice ? `${formatMoney(line.salePrice, language)} THB` : '—'}</strong>
                </article>
              ))}
              {visibleLines.length === 0 && <p className="picker-empty">{t('orders.noMatch')}</p>}
            </div>
          </section>

          <section className="detail-card payment-card">
            <div><span>{t('detail.totalSales')}</span><strong>{formatMoney(order.totalSales, language)} THB</strong></div>
            {order.bankTotal > 0 && <div><span>{t('detail.bank')}</span><strong>{formatMoney(order.bankTotal, language)} THB</strong></div>}
            {order.depositTotal > 0 && <div><span>{t('detail.deposit')}</span><strong>{formatMoney(order.depositTotal, language)} THB</strong></div>}
          </section>
        </div>
      </div>
    </section>
  )
}

function AnalyticsPage({ dataBySheet, loading }: { dataBySheet: Record<string, SheetDataState>; loading: boolean }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const currentSheet = getCurrentMonthSheet(dataBySheet)
  const currentOrders = dataBySheet[currentSheet.id]?.orders ?? EMPTY_ORDERS
  const language = i18n.resolvedLanguage ?? 'en'
  const [statusFilter, setStatusFilter] = useState('all')
  const [monthlySort, setMonthlySort] = useState('sales-desc')
  const matchesStatus = (order: SheetOrder) => {
    if (statusFilter === 'paid') return order.paymentStatus === 'จ่ายเต็ม'
    if (statusFilter === 'deposit') return order.paymentStatus === 'มัดจำ'
    if (statusFilter === 'shipped') return order.shippingStatus === 'ส่งแล้ว'
    if (statusFilter === 'inbound') return order.shippingStatus === 'รอเข้าไทย'
    if (statusFilter === 'unlisted') return !order.paymentStatus && !order.shippingStatus
    return true
  }
  const scopedOrders = currentOrders.filter(matchesStatus)
  const shipped = scopedOrders.filter((order) => order.shippingStatus === 'ส่งแล้ว').length
  const inbound = scopedOrders.filter((order) => order.shippingStatus === 'รอเข้าไทย').length
  const paid = scopedOrders.filter((order) => order.paymentStatus === 'จ่ายเต็ม').length
  const deposits = scopedOrders.filter((order) => order.paymentStatus === 'มัดจำ').length
  const salesSheets = SHEETS.filter((sheet) => sheet.kind === 'sales')
  const populatedSalesSheets = salesSheets.filter((sheet) => (dataBySheet[sheet.id]?.orders.length ?? 0) > 0)
  const averageSales = populatedSalesSheets.length
    ? populatedSalesSheets.reduce((sum, sheet) => sum + sheetTotal(dataBySheet[sheet.id]?.orders ?? []), 0) / populatedSalesSheets.length
    : 0
  const recordedProfits = SHEETS.flatMap((sheet) => dataBySheet[sheet.id]?.orders ?? [])
    .flatMap((order) => order.lines)
    .flatMap((line) => line.profitAmount == null ? [] : [line.profitAmount])
  const averageProfit = recordedProfits.length ? recordedProfits.reduce((sum, value) => sum + value, 0) / recordedProfits.length : null
  const sortedSalesSheets = [...salesSheets].sort((a, b) => {
    if (monthlySort === 'sales-asc') return sheetTotal(dataBySheet[a.id]?.orders ?? []) - sheetTotal(dataBySheet[b.id]?.orders ?? [])
    if (monthlySort === 'month') return salesSheets.indexOf(a) - salesSheets.indexOf(b)
    return sheetTotal(dataBySheet[b.id]?.orders ?? []) - sheetTotal(dataBySheet[a.id]?.orders ?? [])
  })
  const maximum = Math.max(1, ...salesSheets.map((sheet) => sheetTotal(dataBySheet[sheet.id]?.orders ?? [])))

  return (
    <section className="app-screen home-screen analytics-screen" aria-label={t('screen.analytics')}>
      <div className="home-scroll-area">
        <header className="sales-summary analytics-summary">
          <p>{t('sheets.kind.sales')} · {t(currentSheet.titleKey)}</p>
          <h1>{t('analytics.title')}</h1>
          <p className="sales-growth">{loading ? t('sheet.loadingShort') : t('analytics.currentMonth')}</p>
        </header>

        <label className="analytics-status-filter"><span>{t('filters.status')}</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">{t('filters.allStatuses')}</option><option value="paid">{t('detail.paymentFull')}</option><option value="deposit">{t('detail.paymentDeposit')}</option><option value="shipped">{t('detail.shippingSent')}</option><option value="inbound">{t('detail.shippingInbound')}</option><option value="unlisted">{t('filters.unlisted')}</option></select></label>

        <div className="analytics-metrics">
          {loading && Object.keys(dataBySheet).length === 0 ? Array.from({ length: 6 }, (_, index) => <div className="metric-card-skeleton" key={index}><i /><b /></div>) : <>
            <article className="metric-card featured"><span>{t('analytics.thisMonth')}</span><strong>{formatMoney(sheetTotal(scopedOrders), language)} <small>THB</small></strong></article>
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
          <div className="status-summary-row"><span className="status-badge inbound">{t('detail.shippingInbound')}</span><strong>{inbound}</strong></div>
        </section>

        <section className="analytics-section sales-by-month">
          <div className="analytics-heading"><h2>{t('analytics.monthlySales')}</h2><label><span className="sr-only">{t('filters.sort')}</span><select value={monthlySort} onChange={(event) => setMonthlySort(event.target.value)}><option value="sales-desc">{t('filters.salesHigh')}</option><option value="sales-asc">{t('filters.salesLow')}</option><option value="month">{t('filters.monthOrder')}</option></select></label></div>
          {sortedSalesSheets.map((sheet) => {
            const amount = sheetTotal(dataBySheet[sheet.id]?.orders ?? [])
            const width = Math.max(amount > 0 ? 5 : 0, Math.round((amount / maximum) * 100))
            return <button type="button" className="monthly-bar-row" key={sheet.id} onClick={() => navigate(`/sheets/${sheet.id}`)}><span>{t(sheet.titleKey)}</span><span className="monthly-bar"><i style={{ width: `${width}%` }} /></span><strong>{formatMoney(amount, language)}</strong></button>
          })}
        </section>
      </div>
      <BottomNavigation />
    </section>
  )
}

function App() {
  const [dataBySheet, setDataBySheet] = useState<Record<string, SheetDataState>>({})
  const [localOrdersBySheet, setLocalOrdersBySheet] = useState<Record<string, SheetOrder[]>>(loadLocalOrders)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [bootReady, setBootReady] = useState(false)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setBootReady(true), 1000)
    return () => window.clearTimeout(timeoutId)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchAllSheets(controller.signal)
      .then((result) => setDataBySheet(result))
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [refreshKey])

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(localOrdersBySheet))
    } catch {
      // The current session remains usable if browser storage is full or disabled.
    }
  }, [localOrdersBySheet])

  const mergedDataBySheet = useMemo(() => Object.fromEntries(SHEETS.map((sheet) => {
    const remote = dataBySheet[sheet.id] ?? { orders: [] }
    return [sheet.id, {
      ...remote,
      orders: [...(localOrdersBySheet[sheet.id] ?? []), ...remote.orders],
    }]
  })), [dataBySheet, localOrdersBySheet])

  const refresh = useCallback(() => {
    setLoading(true)
    setRefreshKey((key) => key + 1)
  }, [])

  const createLocalOrder = (sheetId: string, draft: OrderDraft) => {
    const lines: SheetOrderLine[] = draft.lines.map((line) => ({
      row: 0,
      itemName: line.itemName.trim(),
      imageName: line.imageName.trim() || undefined,
      quantity: Number(line.quantity) || 1,
      salePrice: Number(line.salePrice) || 0,
      bankAmount: Number(line.bankAmount) || 0,
      depositAmount: Number(line.depositAmount) || 0,
      profitAmount: null,
      images: line.image ? [line.image] : [],
      attributes: [],
    }))
    const order: SheetOrder = {
      id: `local-${Date.now()}`,
      sheetRow: 0,
      day: draft.day,
      lineName: draft.lineName.trim(),
      customerName: draft.customerName.trim(),
      paymentStatus: draft.paymentStatus,
      shippingStatus: draft.shippingStatus,
      lines,
      totalSales: lines.reduce((sum, line) => sum + line.salePrice, 0),
      bankTotal: lines.reduce((sum, line) => sum + line.bankAmount, 0),
      depositTotal: lines.reduce((sum, line) => sum + line.depositAmount, 0),
      quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
      isLocal: true,
    }
    setLocalOrdersBySheet((current) => ({ ...current, [sheetId]: [order, ...(current[sheetId] ?? [])] }))
  }

  const currentMonthSheet = getCurrentMonthSheet(mergedDataBySheet)

  return (
    <main className="app-stage">
      <div className="app-shell">
        <LanguageToggle />
        {!bootReady ? <SplashScreen /> : <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomePage dataBySheet={mergedDataBySheet} loading={loading} refreshing={loading && Object.keys(dataBySheet).length > 0} onRefresh={refresh} />} />
          <Route path="/orders" element={<SheetRouteView sheet={currentMonthSheet} dataBySheet={mergedDataBySheet} loading={loading} onRefresh={refresh} onCreateOrder={createLocalOrder} />} />
          <Route path="/sheets/:sheetId" element={<SheetRouteView dataBySheet={mergedDataBySheet} loading={loading} onRefresh={refresh} onCreateOrder={createLocalOrder} />} />
          <Route path="/sheets/:sheetId/orders/:orderId" element={<OrderDetailsRoute dataBySheet={mergedDataBySheet} loading={loading} onRefresh={refresh} />} />
          <Route path="/analytics" element={<AnalyticsPage dataBySheet={mergedDataBySheet} loading={loading} />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>}
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
}: {
  sheet?: SheetDefinition
  dataBySheet: Record<string, SheetDataState>
  loading: boolean
  onRefresh: () => void
  onCreateOrder: (sheetId: string, draft: OrderDraft) => void
}) {
  const { sheetId } = useParams()
  const sheet = explicitSheet ?? SHEETS.find((item) => item.id === sheetId)
  if (!sheet) return <Navigate to="/home" replace />
  return <SheetOrdersPage key={sheet.id} sheet={sheet} sheetData={dataBySheet[sheet.id]} loading={loading} onRefresh={onRefresh} onCreateOrder={onCreateOrder} />
}

function OrderDetailsRoute({ dataBySheet, loading, onRefresh }: { dataBySheet: Record<string, SheetDataState>; loading: boolean; onRefresh: () => void }) {
  const { sheetId } = useParams()
  const sheet = SHEETS.find((item) => item.id === sheetId)
  if (!sheet) return <Navigate to="/home" replace />
  return <OrderDetailsPage sheet={sheet} sheetData={dataBySheet[sheet.id]} loading={loading} onRefresh={onRefresh} />
}

export default App
