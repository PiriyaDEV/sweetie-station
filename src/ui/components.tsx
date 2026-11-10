import { useRef, useState, type ReactNode } from 'react'
import { BarChart3, ChevronLeft, ClipboardList, Home, Settings, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'
import sweetieLogo from '../assets/sweetie-logo.webp'
import { useDialogAccessibility } from './hooks'
import { paymentBadgeClass, paymentStatusLabel, shippingBadgeClass, shippingStatusLabel } from './status'

const productPlaceholder = new URL('../assets/0065ab6781eed4ec716c07294dbb3933.PNG', import.meta.url).href

/** Four-point sparkle used as a decorative accent. */
export function Sparkle({ className = '', size = 28 }: { className?: string; size?: number }) {
  return (
    <svg className={`sparkle ${className}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M12 0c.8 6.2 5.8 11.2 12 12-6.2.8-11.2 5.8-12 12-.8-6.2-5.8-11.2-12-12C6.2 11.2 11.2 6.2 12 0Z" />
    </svg>
  )
}

/** Compact app-brand header with optional back navigation and page actions. */
export function ScreenHeader({ onBack, backLabel, actions, subtitle, children }: {
  onBack?: () => void
  backLabel?: string
  actions?: ReactNode
  subtitle?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="screen-header">
      <div className="screen-header-row">
        {onBack && <button type="button" className="icon-button screen-back" onClick={onBack} aria-label={backLabel}><ChevronLeft size={24} strokeWidth={2.4} /></button>}
        <div className="screen-heading"><h1 className="screen-title display">Sweetie</h1>{subtitle && <p className="screen-context">{subtitle}</p>}</div>
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
  const emoji = type === 'payment'
    ? status === 'จ่ายเต็ม' ? '✅' : status === 'มัดจำ' ? '💰' : status === 'ยังไม่ได้ชำระ' ? '⏳' : '❔'
    : status === 'ส่งแล้ว' ? '📦' : status === 'รอเข้าไทย' ? '🚢' : status === 'สั่งแล้ว' ? '🛍️' : status === 'ยังไม่ได้สั่ง' ? '⏳' : '❔'
  return <span className={`status-badge ${type} ${className}`}><span className="status-badge-emoji" aria-hidden="true">{emoji}</span>{text}</span>
}

/** Product photo that falls back to the shop placeholder when missing or broken. */
export function ProductImage({ src, alt, className = '' }: { src?: string; alt: string; className?: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const showFallback = !src || failedSource === src
  return <img
    className={`${className}${showFallback ? ' product-image-fallback' : ''}`.trim()}
    src={showFallback ? productPlaceholder : src}
    alt={showFallback ? '' : alt}
    loading="lazy"
    onError={() => { if (src && !showFallback) setFailedSource(src) }}
  />
}

export function ImagePreviewDialog({ src, alt, onClose }: { src?: string; alt: string; onClose: () => void }) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLElement | null>(null)
  useDialogAccessibility(dialogRef, onClose)
  return (
    <div className="modal-backdrop image-preview-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="image-preview-dialog" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={alt || t('detail.imagePreview')}>
        <button type="button" className="modal-close image-preview-close" data-dialog-initial-focus aria-label={t('detail.closeImagePreview')} onClick={onClose}><X size={20} /></button>
        <ProductImage className="image-preview-full" src={src} alt={alt} />
        {alt && <p className="image-preview-caption display">{alt}</p>}
      </section>
    </div>
  )
}

export function BottomNavigation({ desktop = false }: { desktop?: boolean }) {
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
    <nav className={desktop ? 'desktop-sidebar' : 'bottom-nav'} aria-label={t('nav.label')}>
      {desktop && <div className="sidebar-brand" aria-hidden="true"><img src={sweetieLogo} alt="" /><span className="display">Sweetie Station</span></div>}
      {items.map((item) => (
        <button key={item.key} type="button" className={`nav-item${item.active ? ' active' : ''}`} aria-current={item.active ? 'page' : undefined} onClick={() => navigate(item.path)}>
          {item.icon}<span>{t(`nav.${item.key}`)}</span>
        </button>
      ))}
    </nav>
  )
}
