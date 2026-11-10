import type { ReactNode } from 'react'
import { BarChart3, ChevronLeft, ClipboardList, Home, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'
import { paymentBadgeClass, paymentStatusLabel, shippingBadgeClass, shippingStatusLabel } from './status'

/** Four-point sparkle used as a decorative accent. */
export function Sparkle({ className = '', size = 28 }: { className?: string; size?: number }) {
  return (
    <svg className={`sparkle ${className}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M12 0c.8 6.2 5.8 11.2 12 12-6.2.8-11.2 5.8-12 12-.8-6.2-5.8-11.2-12-12C6.2 11.2 11.2 6.2 12 0Z" />
    </svg>
  )
}

/** Pink header band with an underlined display title, optional back button and icon actions. */
export function ScreenHeader({ title, kicker, onBack, backLabel, actions, children }: {
  title: ReactNode
  kicker?: ReactNode
  onBack?: () => void
  backLabel?: string
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="screen-header">
      <div className="screen-header-row">
        {onBack && <button type="button" className="icon-button screen-back" onClick={onBack} aria-label={backLabel}><ChevronLeft size={26} strokeWidth={2.4} /></button>}
        <div className="screen-heading">
          {kicker && <p className="screen-kicker">{kicker}</p>}
          <h1 className="screen-title display">{title}</h1>
        </div>
        {actions && <div className="screen-header-actions">{actions}</div>}
      </div>
      {children}
    </header>
  )
}

export function SkeletonLine({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`skeleton block ${className}`} />
}

export function StatusBadge({ status = '', type, label }: { status?: string; type: 'payment' | 'shipping' | 'quantity'; label?: string }) {
  const { t } = useTranslation()
  if (type === 'quantity') return <span className="status-badge quantity">{label}</span>
  const text = type === 'payment' ? paymentStatusLabel(status, t) : shippingStatusLabel(status, t)
  const className = type === 'payment' ? paymentBadgeClass(status) : shippingBadgeClass(status)
  return <span className={`status-badge ${type} ${className}`}>{text}</span>
}

export function BottomNavigation() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const isHome = location.pathname === '/admin/home'
  const isAnalytics = location.pathname === '/admin/analytics'
  const isSettings = location.pathname === '/admin/settings'
  const isOrders = location.pathname === '/admin/orders' || location.pathname.startsWith('/admin/sheets/')
  const items = [
    { key: 'home', path: '/admin/home', active: isHome, icon: <Home size={23} fill={isHome ? 'currentColor' : 'none'} /> },
    { key: 'orders', path: '/admin/orders', active: isOrders, icon: <ClipboardList size={23} /> },
    { key: 'analytics', path: '/admin/analytics', active: isAnalytics, icon: <BarChart3 size={23} /> },
    { key: 'settings', path: '/admin/settings', active: isSettings, icon: <Settings size={23} /> },
  ]

  return (
    <nav className="bottom-nav" aria-label={t('nav.label')}>
      {items.map((item) => (
        <button key={item.key} type="button" className={`nav-item${item.active ? ' active' : ''}`} aria-current={item.active ? 'page' : undefined} onClick={() => navigate(item.path)}>
          {item.icon}<span>{t(`nav.${item.key}`)}</span>
        </button>
      ))}
    </nav>
  )
}
