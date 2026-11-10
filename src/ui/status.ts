// Status labels and style keys shared by badges, filters and selects.
type Translate = (key: string) => string

export const PAYMENT_STATUSES = ['ยังไม่ได้ชำระ', 'มัดจำ', 'จ่ายเต็ม'] as const
export const SHIPPING_STATUSES = ['ยังไม่ได้สั่ง', 'สั่งแล้ว', 'รอเข้าไทย', 'ส่งแล้ว'] as const

export function paymentStatusLabel(status: string, t: Translate) {
  if (status === 'ยังไม่ได้ชำระ') return t('detail.paymentUnpaid')
  if (status === 'จ่ายเต็ม') return t('detail.paymentFull')
  if (status === 'มัดจำ') return t('detail.paymentDeposit')
  return status || t('detail.notSet')
}

export function shippingStatusLabel(status: string, t: Translate) {
  if (status === 'ยังไม่ได้สั่ง') return t('detail.shippingNotOrdered')
  if (status === 'สั่งแล้ว') return t('detail.shippingOrdered')
  if (status === 'รอเข้าไทย') return t('detail.shippingInbound')
  if (status === 'ส่งแล้ว') return t('detail.shippingSent')
  return status || t('detail.notSet')
}

export function paymentBadgeClass(status: string) {
  if (status === 'ยังไม่ได้ชำระ') return 'unpaid'
  if (status === 'จ่ายเต็ม') return 'paid'
  if (status === 'มัดจำ') return 'deposit'
  return 'neutral'
}

export function shippingBadgeClass(status: string) {
  if (status === 'ยังไม่ได้สั่ง') return 'not-ordered'
  if (status === 'สั่งแล้ว') return 'ordered'
  if (status === 'ส่งแล้ว') return 'shipped'
  if (status === 'รอเข้าไทย') return 'inbound'
  return 'neutral'
}

// Filter keys used by the Home, Orders and Analytics status filters.
export const STATUS_FILTERS = ['all', 'unpaid', 'deposit', 'paid', 'not-ordered', 'ordered', 'inbound', 'shipped', 'unlisted'] as const

export function statusFilterLabel(filter: string, t: Translate) {
  const keys: Record<string, string> = {
    all: 'filters.allStatuses',
    paid: 'detail.paymentFull',
    unpaid: 'detail.paymentUnpaid',
    deposit: 'detail.paymentDeposit',
    shipped: 'detail.shippingSent',
    'not-ordered': 'detail.shippingNotOrdered',
    ordered: 'detail.shippingOrdered',
    inbound: 'detail.shippingInbound',
    unlisted: 'filters.unlisted',
  }
  return t(keys[filter] ?? filter)
}

export function orderMatchesStatus(order: { paymentStatus: string; shippingStatus: string }, filter: string) {
  if (filter === 'paid') return order.paymentStatus === 'จ่ายเต็ม'
  if (filter === 'unpaid') return order.paymentStatus === 'ยังไม่ได้ชำระ'
  if (filter === 'deposit') return order.paymentStatus === 'มัดจำ'
  if (filter === 'shipped') return order.shippingStatus === 'ส่งแล้ว'
  if (filter === 'not-ordered') return order.shippingStatus === 'ยังไม่ได้สั่ง'
  if (filter === 'ordered') return order.shippingStatus === 'สั่งแล้ว'
  if (filter === 'inbound') return order.shippingStatus === 'รอเข้าไทย'
  if (filter === 'unlisted') return !order.paymentStatus && !order.shippingStatus
  return true
}
