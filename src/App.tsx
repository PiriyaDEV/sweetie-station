import { useEffect, useState } from 'react'
import {
  ChevronLeft,
  Clock3,
  Heart,
  Home,
  Send,
  UserRound,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router'
import cityPhoto from './assets/order-city.png'

type Order = {
  id: number
  month: string
  amount: string
  change: string
  hasPhoto?: boolean
}

const orders: Order[] = [
  { id: 1, month: 'Oct', amount: '1,000 THB', change: '+ 10,230 THB', hasPhoto: true },
  { id: 2, month: 'Oct', amount: '1,000 THB', change: '+ 10,230 THB' },
  { id: 3, month: 'Oct', amount: '1,000 THB', change: '+ 10,230 THB' },
  { id: 4, month: 'Oct', amount: '1,000 THB', change: '+ 10,230 THB' },
  { id: 5, month: 'Sep', amount: '850 THB', change: '+ 8,500 THB' },
  { id: 6, month: 'Sep', amount: '720 THB', change: '+ 7,200 THB' },
]

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
  const navigate = useNavigate()

  useEffect(() => {
    const timeoutId = window.setTimeout(() => navigate('/home', { replace: true }), 1800)
    return () => window.clearTimeout(timeoutId)
  }, [navigate])

  return (
    <section className="app-screen splash-screen" aria-label={t('screen.splash')}>
      <button type="button" className="splash-continue" onClick={() => navigate('/home')}>
        <span className="splash-content">
          <SweetieMark />
          <span className="splash-tagline">{t('splash.tagline')}</span>
        </span>
        <span className="splash-loading" aria-hidden="true"><i /></span>
        <span className="sr-only">{t('splash.continue')}</span>
      </button>
    </section>
  )
}

function BottomNavigation() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <nav className="bottom-nav" aria-label={t('nav.label')}>
      <button type="button" className="nav-item active" aria-label={t('nav.home')} onClick={() => navigate('/home')}><Home size={22} fill="currentColor" /></button>
      <button type="button" className="nav-item" aria-label={t('nav.orders')} onClick={() => navigate('/orders/1')}><Clock3 size={22} /></button>
      <button type="button" className="nav-item" aria-label={t('nav.favorites')} disabled><Heart size={22} /></button>
      <button type="button" className="nav-item" aria-label={t('nav.profile')} disabled><UserRound size={21} /></button>
    </nav>
  )
}

function HomeScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <section className="app-screen home-screen" aria-label={t('screen.home')}>
      <div className="home-scroll-area">
        <header className="sales-summary">
          <p>{t('sales.currentMonth')}</p>
          <h1>16,124.214 <span>THB</span></h1>
          <p className="sales-growth">+ 1,000 THB (12.34%)</p>
        </header>

        <div className="section-heading">
          <h2>{t('orders.title')}</h2>
          <button type="button" className="view-all">{t('orders.viewAll')}</button>
        </div>

        <div className="order-grid">
          {orders.map((order) => (
            <button
              type="button"
              className={`order-card${order.hasPhoto ? ' order-card-photo' : ''}`}
              key={order.id}
              onClick={() => navigate(`/orders/${order.id}`)}
              aria-label={`${t('orders.open')} ${t('orders.sale')}, ${order.month}`}
            >
              {order.hasPhoto && <img src={cityPhoto} alt="City storefront" />}
              {order.hasPhoto && <span className="favorite-badge"><Heart size={15} /></span>}
              <span className="order-caption">
                <span className="order-title">{t('orders.sale')}, {order.month}</span>
                <span className="order-value">{order.amount} <b>{order.change}</b></span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <BottomNavigation />
    </section>
  )
}

function OrderDetailsScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { orderId } = useParams()
  const order = orders.find((item) => item.id === Number(orderId))
  const [showMessage, setShowMessage] = useState(false)

  useEffect(() => {
    if (!showMessage) return
    const timeoutId = window.setTimeout(() => setShowMessage(false), 2200)
    return () => window.clearTimeout(timeoutId)
  }, [showMessage])

  if (!order) return <Navigate to="/home" replace />

  return (
    <section className="app-screen detail-screen" aria-label={t('screen.detail')}>
      <div className="detail-scroll-area">
        <div className="detail-hero">
          <button type="button" className="back-button" onClick={() => navigate('/home')} aria-label={t('nav.back')}>
            <ChevronLeft size={20} />
          </button>
          <div className="hero-label">
            <h1>{t('orders.sale')}, {order.month}</h1>
            <p>{order.amount} <b>{order.change}</b></p>
          </div>
        </div>

        <div className="detail-body">
          <h2>{t('details.title')}</h2>
          <div className="order-stats" aria-label={t('details.summary')}>
            <span><UserRound size={14} fill="currentColor" /> {t('details.ordersCount')}</span>
            <span><Clock3 size={14} fill="currentColor" /> {t('details.successCount')}</span>
            <span><Clock3 size={14} fill="currentColor" /> {t('details.ongoingCount')}</span>
          </div>

          <div className="customer-list">
            {Array.from({ length: 4 }, (_, index) => (
              <article className="customer-row" key={index}>
                <span className="customer-avatar"><UserRound size={17} fill="#d5d0c4" /><i>x1</i></span>
                <div className="customer-name">
                  <strong>{t('details.customer')}</strong>
                  <span>{t('details.person')}</span>
                </div>
                <div className="customer-amount">
                  <strong>550.00 THB</strong>
                  <span>+ 550.00 THB</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      {showMessage && <p className="app-toast" role="status">{t('details.comingSoon')}</p>}
      <button type="button" className="create-order-button" onClick={() => setShowMessage(true)}>
        {t('details.createOrder')} <Send size={19} />
      </button>
    </section>
  )
}

function App() {
  return (
    <main className="app-stage">
      <div className="app-shell">
        <LanguageToggle />
        <Routes>
          <Route path="/" element={<SplashScreen />} />
          <Route path="/home" element={<HomeScreen />} />
          <Route path="/orders/:orderId" element={<OrderDetailsScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </main>
  )
}

export default App
