import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  en: {
    translation: {
      language: 'Language',
      screen: { splash: 'Loading splash screen', home: 'Sheets home', sheetOrders: 'Orders in sheet', detail: 'Order details', analytics: 'Analytics' },
      splash: { tagline: 'Find Your Dream\nDestination With Us', continue: 'Skip loading and open home' },
      sheets: {
        kicker: 'Sweetie order book', chooseMonth: 'Choose a month', sheetCount: '{{count}} sheets · tap one to view its orders',
        allSheets: 'All sheets', orderCount: '{{count}} orders', monthSummary: '{{orders}} orders · {{total}} THB',
        kind: { sales: 'SALES', haul: 'HAUL' },
        may: 'May', june: 'June', haulJul: 'Guangzhou · 4–18 Jul', july: 'July', aug: 'August', sep: 'September',
        haulSep: 'Guangzhou · 16–23 Sep', oct: 'October', nov: 'November', dec: 'December',
      },
      orders: {
        title: 'Orders', orders: 'orders', refresh: 'Refresh', refreshing: 'Updating', open: 'Open order',
        item: 'item', items: 'items', oneItem: '1 item', manyItems: '{{count}} items', search: 'Search customer or item', noMatch: 'No matching orders', deviceOnly: 'On this device',
      },
      details: { title: 'Order details', summary: 'Order summary' },
      detail: {
        orderDay: '{{day}}', quantity: '{{count}} {{unit}}', piece: 'pc', pieces: 'pcs', paymentFull: 'Paid in full', paymentDeposit: 'Deposit',
        shippingInbound: 'Waiting for Thailand', shippingSent: 'Shipped', notSet: 'Not listed', lineName: 'LINE name', customer: 'Customer',
        items: 'Items', itemNumber: 'Order item {{number}}', itemImage: 'Order item {{number}}, photo {{image}}',
        totalSales: 'Sales total', bank: 'BANK recorded', deposit: 'Deposit recorded',
      },
      detailFields: {
        discount: 'Discount', chinaPrice: 'China price', costTHB: 'Cost (THB)', profit: 'Profit', shipping: 'Shipping',
        extraShipping: 'Extra shipping', productCostY: 'Product cost (Y)', productCostB: 'Product cost (B)', costRMB: 'Cost (RMB)',
        chinaShipping: 'China shipping', netProfit: 'Net profit',
      },
      createOrder: {
        title: 'Create an order', open: 'Create order', close: 'Close create order', linePlaceholder: 'LINE account or handle',
        customerPlaceholder: 'Customer name', day: 'Order day', itemNumber: 'Item {{number}}', itemName: 'Item name',
        quantity: 'Quantity', price: 'Sale price (THB)', bank: 'Paid to bank (THB)', depositAmount: 'Deposit (THB)', paymentStatus: 'Payment status',
        shippingStatus: 'Shipping status', uploadPhoto: 'Upload item photo', chooseMonthImage: 'Use this month’s photo',
        monthOnlyImages: 'Photos from {{month}} only', filterMonthImages: 'Filter this month’s photos', noMonthImages: 'No item photos in this sheet yet.',
        selectedImage: 'Selected item photo', removeImage: 'Remove photo', addItem: 'Add another item', remove: 'Remove',
        cancel: 'Cancel', save: 'Save order', localOnly: 'Saved on this device only; it will not write back to Google Sheets.',
        savedNotice: 'Order saved on this device.', imageTypeError: 'Choose an image file.', imageReadError: 'This image could not be prepared.',
      },
      analytics: {
        title: 'Analytics', currentMonth: 'Current month overview', sales: 'Sales', orders: 'Orders', items: 'Items', shipped: 'Shipped',
        statusTitle: 'Order status', monthlySales: 'Sales by month', allSheets: 'All sheets',
      },
      sheet: {
        loading: 'Loading workbook sheets…', loadingShort: 'Loading…', empty: 'No orders in this sheet yet.',
        error: 'Could not load this sheet.', errorShort: 'Unavailable', retry: 'Retry',
      },
      nav: {
        label: 'Main navigation', home: 'Home', orders: 'Orders', analytics: 'Analytics', backToSheets: 'Back to all sheets',
        allSheets: 'All sheets', backToOrders: 'Back to orders',
      },
    },
  },
  th: {
    translation: {
      language: 'ภาษา',
      screen: { splash: 'หน้าจอเริ่มต้น', home: 'หน้ารวมชีต', sheetOrders: 'รายการคำสั่งซื้อในชีต', detail: 'รายละเอียดคำสั่งซื้อ', analytics: 'วิเคราะห์ข้อมูล' },
      splash: { tagline: 'ค้นหาจุดหมายในฝัน\nไปกับเรา', continue: 'ข้ามหน้ารอและไปหน้าหลัก' },
      sheets: {
        kicker: 'สมุดออเดอร์ Sweetie', chooseMonth: 'เลือกเดือน', sheetCount: '{{count}} ชีต · แตะเพื่อดูคำสั่งซื้อ',
        allSheets: 'ชีตทั้งหมด', orderCount: '{{count}} ออเดอร์', monthSummary: '{{orders}} ออเดอร์ · {{total}} THB',
        kind: { sales: 'ยอดขาย', haul: 'หิ้วสินค้า' },
        may: 'พฤษภาคม', june: 'มิถุนายน', haulJul: 'กวางโจว · 4–18 ก.ค.', july: 'กรกฎาคม', aug: 'สิงหาคม', sep: 'กันยายน',
        haulSep: 'กวางโจว · 16–23 ก.ย.', oct: 'ตุลาคม', nov: 'พฤศจิกายน', dec: 'ธันวาคม',
      },
      orders: {
        title: 'รายการคำสั่งซื้อ', orders: 'ออเดอร์', refresh: 'รีเฟรช', refreshing: 'กำลังอัปเดต', open: 'เปิดคำสั่งซื้อ',
        item: 'ชิ้น', items: 'ชิ้น', oneItem: '1 ชิ้น', manyItems: '{{count}} ชิ้น', search: 'ค้นหาลูกค้าหรือสินค้า', noMatch: 'ไม่พบออเดอร์ที่ตรงกัน', deviceOnly: 'บันทึกในเครื่อง',
      },
      details: { title: 'รายละเอียดคำสั่งซื้อ', summary: 'สรุปคำสั่งซื้อ' },
      detail: {
        orderDay: '{{day}}', quantity: '{{count}} {{unit}}', piece: 'ชิ้น', pieces: 'ชิ้น', paymentFull: 'จ่ายเต็มแล้ว', paymentDeposit: 'มัดจำ',
        shippingInbound: 'รอเข้าไทย', shippingSent: 'ส่งแล้ว', notSet: 'ไม่มีข้อมูล', lineName: 'ชื่อไลน์', customer: 'ชื่อลูกค้า',
        items: 'รายการสินค้า', itemNumber: 'รายการที่ {{number}}', itemImage: 'รายการที่ {{number}} รูปที่ {{image}}',
        totalSales: 'ยอดขายรวม', bank: 'ยอดโอน (BANK)', deposit: 'ยอดมัดจำ',
      },
      detailFields: {
        discount: 'ส่วนลด', chinaPrice: 'ราคาจีน', costTHB: 'ต้นทุน (บาท)', profit: 'กำไร', shipping: 'ค่าส่ง',
        extraShipping: 'ค่าส่งเพิ่มเติม', productCostY: 'ค่าสินค้า (Y)', productCostB: 'ค่าสินค้า (B)', costRMB: 'ต้นทุน (หยวน)',
        chinaShipping: 'ค่าส่งจีน', netProfit: 'กำไรสุทธิ',
      },
      createOrder: {
        title: 'สร้างคำสั่งซื้อ', open: 'สร้างออเดอร์', close: 'ปิดหน้าสร้างออเดอร์', linePlaceholder: 'บัญชีหรือชื่อ LINE',
        customerPlaceholder: 'ชื่อลูกค้า', day: 'วันที่สั่งซื้อ', itemNumber: 'สินค้า {{number}}', itemName: 'ชื่อสินค้า',
        quantity: 'จำนวน', price: 'ราคาขาย (THB)', bank: 'ยอดโอน (THB)', depositAmount: 'ยอดมัดจำ (THB)', paymentStatus: 'สถานะชำระเงิน',
        shippingStatus: 'สถานะจัดส่ง', uploadPhoto: 'อัปโหลดรูปสินค้า', chooseMonthImage: 'ใช้รูปจากเดือนนี้',
        monthOnlyImages: 'เลือกรูปจาก {{month}} เท่านั้น', filterMonthImages: 'ค้นหารูปในเดือนนี้', noMonthImages: 'ยังไม่มีรูปสินค้าในชีตนี้',
        selectedImage: 'รูปสินค้าที่เลือก', removeImage: 'ลบรูป', addItem: 'เพิ่มสินค้า', remove: 'ลบ',
        cancel: 'ยกเลิก', save: 'บันทึกออเดอร์', localOnly: 'บันทึกไว้ในอุปกรณ์นี้เท่านั้น ยังไม่ซิงก์กลับไป Google Sheets',
        savedNotice: 'บันทึกออเดอร์ไว้ในอุปกรณ์นี้แล้ว', imageTypeError: 'กรุณาเลือกไฟล์รูปภาพ', imageReadError: 'เตรียมรูปภาพนี้ไม่สำเร็จ',
      },
      analytics: {
        title: 'วิเคราะห์ข้อมูล', currentMonth: 'ภาพรวมเดือนปัจจุบัน', sales: 'ยอดขาย', orders: 'ออเดอร์', items: 'จำนวนสินค้า', shipped: 'ส่งแล้ว',
        statusTitle: 'สถานะออเดอร์', monthlySales: 'ยอดขายรายเดือน', allSheets: 'ดูชีตทั้งหมด',
      },
      sheet: {
        loading: 'กำลังโหลดข้อมูลทุกชีต…', loadingShort: 'กำลังโหลด…', empty: 'ยังไม่มีออเดอร์ในชีตนี้',
        error: 'โหลดชีตนี้ไม่สำเร็จ', errorShort: 'โหลดไม่ได้', retry: 'ลองอีกครั้ง',
      },
      nav: {
        label: 'เมนูหลัก', home: 'หน้าหลัก', orders: 'ออเดอร์', analytics: 'วิเคราะห์ข้อมูล', backToSheets: 'กลับไปชีตทั้งหมด',
        allSheets: 'ชีตทั้งหมด', backToOrders: 'กลับไปยังคำสั่งซื้อ',
      },
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
