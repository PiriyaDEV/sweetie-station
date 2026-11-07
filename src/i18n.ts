import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  en: {
    translation: {
      language: 'Language',
      screen: { splash: 'Loading splash screen', home: 'Home screen', detail: 'Order details screen' },
      splash: { tagline: 'Find Your Dream\nDestination With Us', continue: 'Skip loading and open home' },
      sales: { currentMonth: 'Total Sales (Current Month)' },
      orders: { title: 'Order List', viewAll: 'View all', sale: 'Sales', open: 'Open order' },
      details: {
        title: 'Details', summary: 'Order summary', ordersCount: '8 Orders', successCount: '1 Success', ongoingCount: '2 Ongoing',
        customer: 'Pound', person: 'Piriya Chaigul', createOrder: 'Create Order', comingSoon: 'Create order flow is coming soon.',
      },
      nav: { label: 'Main navigation', home: 'Home', orders: 'Orders', favorites: 'Favorites', profile: 'Profile', back: 'Back to orders' },
    },
  },
  th: {
    translation: {
      language: 'ภาษา',
      screen: { splash: 'หน้าจอเริ่มต้น', home: 'หน้าหลัก', detail: 'รายละเอียดคำสั่งซื้อ' },
      splash: { tagline: 'ค้นหาจุดหมายในฝัน\nไปกับเรา', continue: 'ข้ามหน้ารอและไปหน้าหลัก' },
      sales: { currentMonth: 'ยอดขายรวม (เดือนนี้)' },
      orders: { title: 'รายการคำสั่งซื้อ', viewAll: 'ดูทั้งหมด', sale: 'ยอดขาย', open: 'เปิดคำสั่งซื้อ' },
      details: {
        title: 'รายละเอียด', summary: 'สรุปคำสั่งซื้อ', ordersCount: '8 รายการ', successCount: 'สำเร็จ 1', ongoingCount: 'กำลังดำเนินการ 2',
        customer: 'Pound', person: 'Piriya Chaigul', createOrder: 'สร้างคำสั่งซื้อ', comingSoon: 'ขั้นตอนสร้างคำสั่งซื้อกำลังจะเปิดให้ใช้งาน',
      },
      nav: { label: 'เมนูหลัก', home: 'หน้าหลัก', orders: 'คำสั่งซื้อ', favorites: 'รายการโปรด', profile: 'โปรไฟล์', back: 'กลับไปยังคำสั่งซื้อ' },
    },
  },
} as const

void i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
