import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  en: {
    translation: {
      language: 'Language',
      screen: { splash: 'Loading splash screen', home: 'Sheets home', sheetOrders: 'Orders in sheet', detail: 'Order details', analytics: 'Analytics', admin: 'Admin sign in' },
      splash: { tagline: 'Find Your Dream\nDestination With Us', continue: 'Skip loading and open home', logoAlt: 'Sweetie Station logo' },
      sheets: {
        kicker: 'Sweetie order book', chooseMonth: 'Choose a month', sheetCount: '{{count}} sheets · tap one to view its orders',
        allSheets: 'All sheets', orderCount: '{{count}} orders', monthSummary: '{{orders}} orders · {{total}} THB', search: 'Search sheets', noMatch: 'No sheets match this search.',
        kind: { sales: 'SALES', haul: 'HAUL' },
        may: 'May', june: 'June', haulJul: 'Guangzhou · 4–18 Jul', july: 'July', aug: 'August', sep: 'September',
        haulSep: 'Guangzhou · 16–23 Sep', oct: 'October', nov: 'November', dec: 'December',
      },
      orders: {
        title: 'Orders', orders: 'orders', refresh: 'Refresh', refreshing: 'Updating', open: 'Open order',
        item: 'item', items: 'items', oneItem: '1 item', manyItems: '{{count}} items', itemCount: '{{count}} items', resultCount: '{{shown}} of {{total}} orders', search: 'Search customer or item', searchItems: 'Search items', noMatch: 'No matching orders', deviceOnly: 'On this device', editedLocally: 'Edited on this device', edit: 'Edit', editSaved: 'Order changes saved on this device.', loadingMore: 'Loading more orders…', endOfList: 'You’re all caught up.', profit: 'Profit', profitUnavailable: '—',
      },
      details: { title: 'Order details', summary: 'Order summary' },
      settings: { title: 'Settings', displayLanguage: 'Display language' },
      auth: { kicker: 'Sweetie admin', title: 'Admin sign in', username: 'Username', password: 'Password', signIn: 'Sign in', logout: 'Log out', invalid: 'Incorrect username or password.', temporary: 'Temporary demo login only — not secure access control.' },
      detail: {
        orderDay: '{{day}}', quantity: '{{count}} {{unit}}', piece: 'pc', pieces: 'pcs', paymentFull: 'Paid in full', paymentDeposit: 'Deposit', paymentUnpaid: 'Unpaid',
        shippingNotOrdered: 'Not ordered', shippingOrdered: 'Ordered', shippingInbound: 'Waiting for Thailand', shippingSent: 'Shipped', notSet: 'Not listed', lineName: 'LINE name', customer: 'Customer',
        items: 'Items', itemNumber: 'Order item {{number}}', itemImage: 'Order item {{number}}, photo {{image}}', photoName: 'Photo name', profitMargin: 'Profit margin', campaign: 'Campaign', discount: 'Campaign discount', saveCampaign: 'Save campaign', totalBeforeDiscount: 'Before discount', totalAfterDiscount: 'After discount',
        totalSales: 'Sales total', totalProfit: 'Total profit', bank: 'Paid so far', deposit: 'Deposit due',
      },
      detailFields: {
        discount: 'Discount', chinaPrice: 'China price', costTHB: 'Cost (THB)', profit: 'Profit', shipping: 'Shipping',
        extraShipping: 'Extra shipping', productCostY: 'Product cost (Y)', productCostB: 'Product cost (B)', costRMB: 'Cost (RMB)',
        chinaShipping: 'China shipping', netProfit: 'Net profit',
      },
      createOrder: {
        title: 'Create an order', editTitle: 'Edit order', update: 'Save changes', open: 'Create order', close: 'Close create order', linePlaceholder: 'LINE account or handle',
        customerPlaceholder: 'Customer name', day: 'Order date', itemNumber: 'Item {{number}}', itemName: 'Item name', photoName: 'Name this photo', optional: 'optional', photoNamePlaceholder: 'e.g. Blue ribbon pouch',
        quantity: 'Quantity', price: 'Sale total (THB)', bank: 'Amount paid (THB)', costRMB: 'Unit cost (CNY)', exchangeRate: 'Exchange rate (THB per CNY)', exchangeRateHint: 'Default rate is saved on this device; adjust it when needed.', depositDue: 'Item deposit due', orderDepositDue: 'Order deposit due', costTHBPreview: 'Cost total', estimatedProfit: 'Estimated profit', isCampaign: 'Campaign order', campaignDiscount: 'Discount amount (THB)', afterDiscount: 'Total after discount', paymentStatusPreview: 'Payment status preview', paymentStatus: 'Payment status',
        shippingStatus: 'Shipping status', uploadPhoto: 'Upload item photo', chooseMonthImage: 'Use this month’s photo',
        monthOnlyImages: 'Photos from {{month}} only', filterMonthImages: 'Filter this month’s photos', noMonthImages: 'No item photos in this sheet yet.',
        selectedImage: 'Selected item photo', removeImage: 'Remove photo', addItem: 'Add another item', remove: 'Remove',
        cancel: 'Cancel', save: 'Save order', localOnly: 'Saved on this device only; it will not write back to Google Sheets.',
        savedNotice: 'Order saved on this device.', imageTypeError: 'Choose an image file.', imageReadError: 'This image could not be prepared.',
      },
      expenses: { title: 'Monthly expenses', note: 'Outside product costs · saved only on this device', add: 'Add expense', remove: 'Remove expense', category: 'Expense category', description: 'Description / note', amount: 'Amount (THB)', empty: 'No monthly expenses yet.', shipping: 'Shipping', packaging: 'Packaging', ads: 'Ads', other: 'Other' },
      analytics: {
        title: 'Analytics', currentMonth: 'Current month overview', sales: 'Sales', orders: 'Orders', items: 'Items', shipped: 'Shipped', totalSales: 'Total sales', totalProfit: 'Net profit', currentScopeProfit: 'For this month', filteredScopeProfit: 'Filtered order profit before monthly expenses', netProfitNote: 'After {{amount}} THB monthly expenses', partialProfitNote: 'Partial profit from {{known}}/{{total}} items; monthly expenses not deducted', monthlyChange: 'Monthly sales change', yearlyChange: 'Year-over-year sales change', changeContext: 'Compared with {{month}} for the same period and status filter', yearlyContext: 'Compared with {{year}} (full-month sales)', noComparison: 'No comparable previous-month baseline', noYearlyComparison: 'No same-month prior-year data', noPeriodProfit: 'No profit data for this period',
        statusTitle: 'Order status', monthlySales: 'Sales by month', allSheets: 'All sheets', thisMonth: 'Sales this month', filteredSales: 'Sales matching status', averageSales: 'Average monthly sales', averageProfit: 'Average profit / item', averageMonths: 'Across {{count}} populated months', profitSample: 'From {{count}} items with cost or profit data', profitCoverage: '{{known}} of {{total}} items have profit data', noProfitData: 'No profit data in linked sheets',
      },
      filters: { sheetType: 'Sheet type', allSheets: 'All types', sortSheets: 'Sort sheets', monthOrder: 'Month order', salesHigh: 'Sales: high to low', salesLow: 'Sales: low to high', ordersHigh: 'Orders: most first', nameAZ: 'Name: A to Z', status: 'Filter by status', allStatuses: 'All statuses', sort: 'Sort by', statusAZ: 'Status', newest: 'Newest first', oldest: 'Oldest first', unlisted: 'Status not listed', sortItems: 'Sort items', show: 'Filter', hide: 'Hide' },
      sheet: {
        loading: 'Loading workbook sheets…', loadingShort: 'Loading…', empty: 'No orders in this sheet yet.',
        error: 'Could not load this sheet.', errorShort: 'Unavailable', retry: 'Retry',
      },
      nav: {
        logout: 'Log out', label: 'Main navigation', home: 'Home', orders: 'Orders', analytics: 'Analytics', backToSheets: 'Back to all sheets',
        allSheets: 'All sheets', backToOrders: 'Back to orders',
      },
    },
  },
  th: {
    translation: {
      language: 'ภาษา',
      screen: { splash: 'หน้าจอเริ่มต้น', home: 'หน้ารวมชีต', sheetOrders: 'รายการคำสั่งซื้อในชีต', detail: 'รายละเอียดคำสั่งซื้อ', analytics: 'วิเคราะห์ข้อมูล', admin: 'เข้าสู่ระบบผู้ดูแล' },
      splash: { tagline: 'ค้นหาจุดหมายในฝัน\nไปกับเรา', continue: 'ข้ามหน้ารอและไปหน้าหลัก', logoAlt: 'โลโก้ Sweetie Station' },
      sheets: {
        kicker: 'สมุดออเดอร์ Sweetie', chooseMonth: 'เลือกเดือน', sheetCount: '{{count}} ชีต · แตะเพื่อดูคำสั่งซื้อ',
        allSheets: 'ชีตทั้งหมด', orderCount: '{{count}} ออเดอร์', monthSummary: '{{orders}} ออเดอร์ · {{total}} THB', search: 'ค้นหาชีต', noMatch: 'ไม่พบชีตที่ตรงกับคำค้นหา',
        kind: { sales: 'ยอดขาย', haul: 'หิ้วสินค้า' },
        may: 'พฤษภาคม', june: 'มิถุนายน', haulJul: 'กวางโจว · 4–18 ก.ค.', july: 'กรกฎาคม', aug: 'สิงหาคม', sep: 'กันยายน',
        haulSep: 'กวางโจว · 16–23 ก.ย.', oct: 'ตุลาคม', nov: 'พฤศจิกายน', dec: 'ธันวาคม',
      },
      orders: {
        title: 'รายการคำสั่งซื้อ', orders: 'ออเดอร์', refresh: 'รีเฟรช', refreshing: 'กำลังอัปเดต', open: 'เปิดคำสั่งซื้อ',
        item: 'ชิ้น', items: 'ชิ้น', oneItem: '1 ชิ้น', manyItems: '{{count}} ชิ้น', itemCount: '{{count}} รายการ', resultCount: 'แสดง {{shown}} จาก {{total}} ออเดอร์', search: 'ค้นหาลูกค้าหรือสินค้า', searchItems: 'ค้นหารายการสินค้า', noMatch: 'ไม่พบออเดอร์ที่ตรงกัน', deviceOnly: 'บันทึกในเครื่อง', editedLocally: 'แก้ไขในเครื่อง', edit: 'แก้ไข', editSaved: 'บันทึกการแก้ไขออเดอร์ไว้ในเครื่องแล้ว', loadingMore: 'กำลังโหลดออเดอร์เพิ่ม…', endOfList: 'แสดงครบแล้ว', profit: 'กำไร', profitUnavailable: '—',
      },
      details: { title: 'รายละเอียดคำสั่งซื้อ', summary: 'สรุปคำสั่งซื้อ' },
      settings: { title: 'ตั้งค่า', displayLanguage: 'ภาษาที่แสดง' },
      auth: { kicker: 'ผู้ดูแล Sweetie', title: 'เข้าสู่ระบบผู้ดูแล', username: 'ชื่อผู้ใช้', password: 'รหัสผ่าน', signIn: 'เข้าสู่ระบบ', logout: 'ออกจากระบบ', invalid: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', temporary: 'ล็อกอินชั่วคราวสำหรับตัวอย่าง — ยังไม่ใช่ระบบรักษาความปลอดภัย' },
      detail: {
        orderDay: '{{day}}', quantity: '{{count}} {{unit}}', piece: 'ชิ้น', pieces: 'ชิ้น', paymentFull: 'จ่ายเต็มแล้ว', paymentDeposit: 'มัดจำ', paymentUnpaid: 'ยังไม่ได้ชำระ',
        shippingNotOrdered: 'ยังไม่ได้สั่ง', shippingOrdered: 'สั่งแล้ว', shippingInbound: 'รอเข้าไทย', shippingSent: 'ส่งแล้ว', notSet: 'ไม่มีข้อมูล', lineName: 'ชื่อไลน์', customer: 'ชื่อลูกค้า',
        items: 'รายการสินค้า', itemNumber: 'รายการที่ {{number}}', itemImage: 'รายการที่ {{number}} รูปที่ {{image}}', photoName: 'ชื่อรูปภาพ', profitMargin: 'อัตรากำไร', campaign: 'แคมเปญ', discount: 'ส่วนลดแคมเปญ', saveCampaign: 'บันทึกแคมเปญ', totalBeforeDiscount: 'ก่อนหักส่วนลด', totalAfterDiscount: 'หลังหักส่วนลด',
        totalSales: 'ยอดขายรวม', totalProfit: 'กำไรรวม', bank: 'ยอดที่โอนแล้ว', deposit: 'ยอดมัดจำที่เหลือ',
      },
      detailFields: {
        discount: 'ส่วนลด', chinaPrice: 'ราคาจีน', costTHB: 'ต้นทุน (บาท)', profit: 'กำไร', shipping: 'ค่าส่ง',
        extraShipping: 'ค่าส่งเพิ่มเติม', productCostY: 'ค่าสินค้า (Y)', productCostB: 'ค่าสินค้า (B)', costRMB: 'ต้นทุน (หยวน)',
        chinaShipping: 'ค่าส่งจีน', netProfit: 'กำไรสุทธิ',
      },
      createOrder: {
        title: 'สร้างคำสั่งซื้อ', editTitle: 'แก้ไขออเดอร์', update: 'บันทึกการแก้ไข', open: 'สร้างออเดอร์', close: 'ปิดหน้าสร้างออเดอร์', linePlaceholder: 'บัญชีหรือชื่อ LINE',
        customerPlaceholder: 'ชื่อลูกค้า', day: 'วันที่สั่งซื้อ', itemNumber: 'สินค้า {{number}}', itemName: 'ชื่อสินค้า', photoName: 'ตั้งชื่อรูปภาพ', optional: 'ไม่บังคับ', photoNamePlaceholder: 'เช่น กระเป๋าริบบิ้นสีฟ้า',
        quantity: 'จำนวน', price: 'ยอดขาย (THB)', bank: 'ยอดที่โอนแล้ว (THB)', costRMB: 'ต้นทุนต่อชิ้น (หยวน)', exchangeRate: 'เรทหยวนเป็นบาท', exchangeRateHint: 'ใช้เรทตั้งต้นที่บันทึกไว้ในอุปกรณ์ และแก้ไขได้ตามต้องการ', depositDue: 'ยอดค้างชำระของรายการนี้', orderDepositDue: 'ยอดค้างชำระของออเดอร์', costTHBPreview: 'ต้นทุนรวม', estimatedProfit: 'กำไรโดยประมาณ', isCampaign: 'ออเดอร์แคมเปญ', campaignDiscount: 'ส่วนลด (บาท)', afterDiscount: 'ยอดหลังหักส่วนลด', paymentStatusPreview: 'สถานะชำระเงินอัตโนมัติ', paymentStatus: 'สถานะชำระเงิน',
        shippingStatus: 'สถานะจัดส่ง', uploadPhoto: 'อัปโหลดรูปสินค้า', chooseMonthImage: 'ใช้รูปจากเดือนนี้',
        monthOnlyImages: 'เลือกรูปจาก {{month}} เท่านั้น', filterMonthImages: 'ค้นหารูปในเดือนนี้', noMonthImages: 'ยังไม่มีรูปสินค้าในชีตนี้',
        selectedImage: 'รูปสินค้าที่เลือก', removeImage: 'ลบรูป', addItem: 'เพิ่มสินค้า', remove: 'ลบ',
        cancel: 'ยกเลิก', save: 'บันทึกออเดอร์', localOnly: 'บันทึกไว้ในอุปกรณ์นี้เท่านั้น ยังไม่ซิงก์กลับไป Google Sheets',
        savedNotice: 'บันทึกออเดอร์ไว้ในอุปกรณ์นี้แล้ว', imageTypeError: 'กรุณาเลือกไฟล์รูปภาพ', imageReadError: 'เตรียมรูปภาพนี้ไม่สำเร็จ',
      },
      expenses: { title: 'รายจ่ายประจำเดือน', note: 'รายจ่ายนอกเหนือจากต้นทุนสินค้า · บันทึกในอุปกรณ์นี้เท่านั้น', add: 'เพิ่มรายจ่าย', remove: 'ลบรายจ่าย', category: 'หมวดรายจ่าย', description: 'รายละเอียด / หมายเหตุ', amount: 'จำนวนเงิน (บาท)', empty: 'ยังไม่มีรายจ่ายประจำเดือน', shipping: 'ค่าขนส่ง', packaging: 'ค่าแพ็กเกจจิ้ง', ads: 'ค่าโฆษณา', other: 'อื่น ๆ' },
      analytics: {
        title: 'วิเคราะห์ข้อมูล', currentMonth: 'ภาพรวมเดือนปัจจุบัน', sales: 'ยอดขาย', orders: 'ออเดอร์', items: 'จำนวนสินค้า', shipped: 'ส่งแล้ว', totalSales: 'ยอดขายทั้งหมด', totalProfit: 'กำไรสุทธิหลังหักรายจ่าย', currentScopeProfit: 'ของเดือนนี้', filteredScopeProfit: 'กำไรจากออเดอร์ที่กรอง (ยังไม่หักรายจ่ายรายเดือน)', netProfitNote: 'หักรายจ่ายรายเดือน {{amount}} บาทแล้ว', partialProfitNote: 'มีข้อมูลกำไร {{known}}/{{total}} รายการ; ยังไม่หักรายจ่ายรายเดือน', monthlyChange: 'การเปลี่ยนแปลงยอดขายรายเดือน', yearlyChange: 'การเปลี่ยนแปลงยอดขายเทียบปีที่แล้ว', changeContext: 'เทียบกับช่วงเดียวกันของ{{month}} ตามตัวกรองสถานะเดียวกัน', yearlyContext: 'เทียบกับปี {{year}} (ยอดขายทั้งเดือน)', noComparison: 'ไม่มีฐานข้อมูลเดือนก่อนหน้าที่ใช้เปรียบเทียบได้', noYearlyComparison: 'ไม่มีข้อมูลเดือนเดียวกันของปีก่อน', noPeriodProfit: 'ช่วงเวลานี้ไม่มีข้อมูลกำไร',
        statusTitle: 'สถานะออเดอร์', monthlySales: 'ยอดขายรายเดือน', allSheets: 'ดูชีตทั้งหมด', thisMonth: 'ยอดขายเดือนนี้', filteredSales: 'ยอดขายตามสถานะ', averageSales: 'ยอดขายเฉลี่ยต่อเดือน', averageProfit: 'กำไรเฉลี่ยต่อรายการ', averageMonths: 'จาก {{count}} เดือนที่มีข้อมูล', profitSample: 'จาก {{count}} รายการที่มีข้อมูลต้นทุนหรือกำไร', profitCoverage: 'มีข้อมูลกำไร {{known}} จาก {{total}} รายการ', noProfitData: 'ชีตที่เชื่อมไว้ไม่มีข้อมูลกำไร',
      },
      filters: { sheetType: 'ประเภทชีต', allSheets: 'ทุกประเภท', sortSheets: 'เรียงชีต', monthOrder: 'ตามเดือน', salesHigh: 'ยอดขาย: มากไปน้อย', salesLow: 'ยอดขาย: น้อยไปมาก', ordersHigh: 'จำนวนออเดอร์: มากไปน้อย', nameAZ: 'ชื่อ: ก ถึง ฮ', status: 'กรองตามสถานะ', allStatuses: 'ทุกสถานะ', sort: 'เรียงตาม', statusAZ: 'สถานะ', newest: 'ใหม่ไปเก่า', oldest: 'เก่าไปใหม่', unlisted: 'ไม่ระบุสถานะ', sortItems: 'เรียงสินค้า', show: 'ตัวกรอง', hide: 'ซ่อนตัวกรอง' },
      sheet: {
        loading: 'กำลังโหลดข้อมูลทุกชีต…', loadingShort: 'กำลังโหลด…', empty: 'ยังไม่มีออเดอร์ในชีตนี้',
        error: 'โหลดชีตนี้ไม่สำเร็จ', errorShort: 'โหลดไม่ได้', retry: 'ลองอีกครั้ง',
      },
      nav: {
        logout: 'ออกจากระบบ', label: 'เมนูหลัก', home: 'หน้าหลัก', orders: 'ออเดอร์', analytics: 'วิเคราะห์ข้อมูล', backToSheets: 'กลับไปชีตทั้งหมด',
        allSheets: 'ชีตทั้งหมด', backToOrders: 'กลับไปยังคำสั่งซื้อ',
      },
    },
  },
} as const

let initialLanguage = 'en'
try {
  initialLanguage = localStorage.getItem('sweetie-language') ?? 'en'
} catch {
  // Keep English as the default when browser storage is unavailable.
}

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
