import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  en: {
    translation: {
      language: 'Language',
      screen: { splash: 'Loading splash screen', home: 'Sheets home', sheetOrders: 'Orders in sheet', detail: 'Order details', analytics: 'Analytics', admin: 'Admin sign in' },
      splash: { tagline: 'Pre-order your favorites\nfrom around the world', continue: 'Skip loading and open home', logoAlt: 'Sweetie Station logo' },
      sheets: {
        kicker: 'Sweetie preorder shop', chooseMonth: 'Choose a month', sheetCount: '{{count}} sheets · tap one to view its orders',
        allSheets: 'All sheets', orderCount: '{{count}} orders', partialOrderCount: '{{count}}+ orders loaded', profit: 'Profit', partialProfit: 'Partial profit', monthSummary: '{{orders}} orders · {{total}} THB', search: 'Search sheets', noMatch: 'No sheets match this search.',
        kind: { sales: 'SALES', haul: 'HAUL' },
        jan: 'January', feb: 'February', mar: 'March', apr: 'April', may: 'May', june: 'June', haulJul: 'Guangzhou · 4–18 Jul', july: 'July', aug: 'August', sep: 'September',
        haulSep: 'Guangzhou · 16–23 Sep', oct: 'October', nov: 'November', dec: 'December',
      },
      orders: {
        title: 'Orders', orders: 'orders', refresh: 'Refresh', refreshing: 'Updating', open: 'Open order', showSummary: 'Show summary and tools', hideSummary: 'Hide summary and tools',
        item: 'item', items: 'items', oneItem: '1 item', manyItems: '{{count}} items', itemCount: '{{count}} items', resultCount: '{{shown}} of {{total}} orders', resultCountPartial: '{{shown}} shown · {{total}}+ loaded', search: 'Search customer or item', closeSearch: 'Close search', searchItems: 'Search items', noMatch: 'No matching orders', edit: 'Edit', editSaved: 'Order changes saved to Google Sheets.', loadingMore: 'Loading more orders…', endOfList: 'You’re all caught up.', profit: 'Profit', profitUnavailable: '—',
      },
      details: { title: 'Order details', summary: 'Order summary' },
      settings: { title: 'Settings', displayLanguage: 'Display language' },
      sync: { idle: 'App settings not saved yet', syncing: 'Saving app settings…', synced: 'Google Sheets connected', offline: 'Google Sheets unavailable — local changes are not synced', syncNow: 'Save settings', storageNote: 'Orders and photos are written directly to their month tabs. Monthly expenses, app settings, and custom tab metadata are stored in Sweetie App Data.' },
      backup: { download: 'Download full backup', preparing: 'Preparing download…', success: 'Full backup downloaded.', error: 'Could not download the full backup.', exportMonthly: 'Export', reportSuccess: 'Monthly report downloaded.', reportError: 'Could not export the monthly report.' },
      auth: { kicker: 'Sweetie Station admin', title: 'Admin sign in', username: 'Username', password: 'Password', signIn: 'Sign in', signingIn: 'Signing in…', logout: 'Log out', invalid: 'Incorrect username or password.', connectionError: 'Could not connect. Please try again.', secureSession: 'Your session is protected.' },
      detail: {
        orderDay: '{{day}}', quantity: '{{count}} {{unit}}', piece: 'pc', pieces: 'pcs', paymentFull: 'Paid in full', paymentDeposit: 'Deposit', paymentUnpaid: 'Unpaid',
        shippingNotOrdered: 'Not ordered', shippingOrdered: 'Ordered', shippingInbound: 'Waiting for Thailand', shippingSent: 'Shipped', notSet: 'Not listed', lineName: 'LINE name', customer: 'Customer', mockCustomerImage: 'Mock customer avatar',
        items: 'Items', itemNumber: 'Order item {{number}}', itemImage: 'Order item {{number}}, photo {{image}}', photoName: 'Photo name', profitMargin: 'Profit margin', campaign: 'Campaign', discount: 'Campaign discount', saveCampaign: 'Save campaign', totalBeforeDiscount: 'Before discount', totalAfterDiscount: 'After discount',
        totalSales: 'Sales total', totalProfit: 'Total profit', bank: 'Paid so far', deposit: 'Deposit due',
      },
      detailFields: {
        discount: 'Discount', chinaPrice: 'China price', costTHB: 'Cost (THB)', profit: 'Profit', shipping: 'Shipping',
        extraShipping: 'Extra shipping', productCostY: 'Product cost (Y)', productCostB: 'Product cost (B)', costRMB: 'Cost (RMB)',
        chinaShipping: 'China shipping', netProfit: 'Net profit',
      },
      createOrder: {
        title: 'Create an order', editTitle: 'Edit order', update: 'Save changes', open: 'Create order', close: 'Close create order', linePlaceholder: 'LINE account or handle', pickLine: 'Search LINE contacts…',
        customerPlaceholder: 'Customer name', day: 'Order date', itemNumber: 'Item {{number}}', itemName: 'Item name', photoName: 'Name this photo', optional: 'optional', photoNamePlaceholder: 'e.g. Blue ribbon pouch',
        quantity: 'Quantity', price: 'Sale total (THB)', bank: 'Amount paid (THB)', costRMB: 'Unit cost (CNY)', exchangeRate: 'Exchange rate (THB per CNY)', exchangeRateHint: 'Default rate is saved on this device; adjust it when needed.', depositDue: 'Item deposit due', orderDepositDue: 'Order deposit due', costTHBPreview: 'Cost total', estimatedProfit: 'Estimated profit', isCampaign: 'Campaign order', campaignDiscount: 'Discount amount (THB)', afterDiscount: 'Total after discount', paymentStatusPreview: 'Payment status preview', paymentStatus: 'Payment status',
        shippingStatus: 'Shipping status', uploadPhoto: 'Upload item photo', chooseMonthImage: 'Use this month’s photo',
        monthOnlyImages: 'Photos from {{month}} only', filterMonthImages: 'Filter this month’s photos', noMonthImages: 'No item photos in this sheet yet.',
        selectedImage: 'Selected item photo', removeImage: 'Remove photo', addItem: 'Add another item', remove: 'Remove',
        cancel: 'Cancel', save: 'Save order', localOnly: 'Saved directly to this Google Sheet.', saving: 'Saving to Google Sheets…', saveError: 'Could not save this order to Google Sheets.',
        savedNotice: 'Order saved to Google Sheets.', imageTypeError: 'Choose an image file.', imageReadError: 'This image could not be prepared.',
      },
      expenses: { title: 'Monthly expenses', settingsTitle: 'Monthly expenses settings', open: 'Expenses', close: 'Close monthly expenses', done: 'Done', note: 'Outside product costs', add: 'Add expense', remove: 'Remove expense', category: 'Expense category', description: 'Description / note', amount: 'Amount (THB)', empty: 'No monthly expenses yet.', shipping: 'Shipping', packaging: 'Packaging', ads: 'Ads', other: 'Other' },
      createSheet: { open: 'Create sheet', title: 'Create a sheet', close: 'Close create sheet', name: 'Sheet name', namePlaceholder: 'e.g. Special orders', month: 'Month', year: 'Year', create: 'Create sheet', localOnly: 'Creates a real tab in the connected Google spreadsheet.', creating: 'Creating sheet…', createError: 'Could not create the sheet in Google Sheets.', validation: 'Enter a sheet name and a year between 2000 and 2100.' },
      analytics: {
        title: 'Analytics', currentMonth: 'Current month overview', sales: 'Sales', orders: 'Orders', items: 'Items', shipped: 'Shipped', totalSales: 'Total sales', totalProfit: 'Net profit', currentScopeProfit: 'For this month', filteredScopeProfit: 'Filtered order profit before monthly expenses', netProfitNote: 'After {{amount}} THB monthly expenses', partialProfitNote: 'Partial profit from {{known}}/{{total}} items; monthly expenses not deducted', monthlyChange: 'Monthly sales change', yearlyChange: 'Year-over-year sales change', changeContext: 'Compared with {{month}} for the same period and status filter', yearlyContext: 'Compared with {{year}} (full-month sales)', noComparison: 'No comparable previous-month baseline', noYearlyComparison: 'No same-month prior-year data', noPeriodProfit: 'Add product cost or profit data to order items to calculate net profit.', noPeriodProfitShort: 'Cost/profit data needed',
        salesProfitGraph: 'Monthly sales & net profit', chartProfitNote: 'Net profit is plotted only when all item costs are recorded for that month.', partialDataNote: 'Some monthly sheets could not be fully loaded; graph values may be partial.', statusTitle: 'Order status', monthlySales: 'Sales by month', allSheets: 'All sheets', thisMonth: 'Sales this month', filteredSales: 'Sales matching status', averageSales: 'Average monthly sales', averageProfit: 'Average profit / item', averageMonths: 'Across {{count}} populated months', profitSample: 'From {{count}} items with cost or profit data', profitCoverage: '{{known}} of {{total}} items have profit data', noProfitData: 'No profit data in linked sheets',
      },
      filters: { sheetType: 'Sheet type', allSheets: 'All types', sortSheets: 'Sort sheets', monthOrder: 'Month order', salesHigh: 'Sales: high to low', salesHighShort: 'Top sales', salesLow: 'Sales: low to high', salesLowShort: 'Low sales', ordersHigh: 'Orders: most first', nameAZ: 'Name: A to Z', nameAZShort: 'A–Z', status: 'Filter by status', allStatuses: 'All statuses', sort: 'Sort by', statusAZ: 'Status', newest: 'Newest first', oldest: 'Oldest first', unlisted: 'Status not listed', sortItems: 'Sort items', show: 'Filter', hide: 'Hide' },
      sheet: {
        loading: 'Loading workbook sheets…', loadingShort: 'Loading…', loadingMoreData: 'Downloading more orders…', loadMoreError: 'Could not download the next batch.', empty: 'No orders in this sheet yet.',
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
      splash: { tagline: 'พรีออเดอร์ของน่ารักจากทั่วโลก\nส่งตรงถึงมือคุณ', continue: 'ข้ามหน้ารอและไปหน้าหลัก', logoAlt: 'โลโก้ Sweetie Station' },
      sheets: {
        kicker: 'จัดการพรีออเดอร์ Sweetie', chooseMonth: 'เลือกเดือน', sheetCount: '{{count}} ชีต · แตะเพื่อดูคำสั่งซื้อ',
        allSheets: 'ชีตทั้งหมด', orderCount: '{{count}} ออเดอร์', partialOrderCount: 'โหลดแล้วอย่างน้อย {{count}} ออเดอร์', profit: 'กำไรสุทธิ', partialProfit: 'กำไรบางส่วน', monthSummary: '{{orders}} ออเดอร์ · {{total}} THB', search: 'ค้นหาชีต', noMatch: 'ไม่พบชีตที่ตรงกับคำค้นหา',
        kind: { sales: 'ยอดขาย', haul: 'หิ้วสินค้า' },
        jan: 'มกราคม', feb: 'กุมภาพันธ์', mar: 'มีนาคม', apr: 'เมษายน', may: 'พฤษภาคม', june: 'มิถุนายน', haulJul: 'กวางโจว · 4–18 ก.ค.', july: 'กรกฎาคม', aug: 'สิงหาคม', sep: 'กันยายน',
        haulSep: 'กวางโจว · 16–23 ก.ย.', oct: 'ตุลาคม', nov: 'พฤศจิกายน', dec: 'ธันวาคม',
      },
      orders: {
        title: 'รายการคำสั่งซื้อ', orders: 'ออเดอร์', refresh: 'รีเฟรช', refreshing: 'กำลังอัปเดต', open: 'เปิดคำสั่งซื้อ', showSummary: 'แสดงสรุปและเครื่องมือ', hideSummary: 'ซ่อนสรุปและเครื่องมือ',
        item: 'ชิ้น', items: 'ชิ้น', oneItem: '1 ชิ้น', manyItems: '{{count}} ชิ้น', itemCount: '{{count}} รายการ', resultCount: 'แสดง {{shown}} จาก {{total}} ออเดอร์', resultCountPartial: 'แสดง {{shown}} · โหลดแล้ว {{total}}+ ออเดอร์', search: 'ค้นหาลูกค้าหรือสินค้า', closeSearch: 'ปิดช่องค้นหา', searchItems: 'ค้นหารายการสินค้า', noMatch: 'ไม่พบออเดอร์ที่ตรงกัน', edit: 'แก้ไข', editSaved: 'บันทึกการแก้ไขออเดอร์ลง Google Sheets แล้ว', loadingMore: 'กำลังโหลดออเดอร์เพิ่ม…', endOfList: 'แสดงครบแล้ว', profit: 'กำไร', profitUnavailable: '—',
      },
      details: { title: 'รายละเอียดคำสั่งซื้อ', summary: 'สรุปคำสั่งซื้อ' },
      settings: { title: 'ตั้งค่า', displayLanguage: 'ภาษาที่แสดง' },
      sync: { idle: 'ยังไม่ได้บันทึกการตั้งค่าแอป', syncing: 'กำลังบันทึกการตั้งค่าแอป…', synced: 'เชื่อมต่อ Google Sheets แล้ว', offline: 'เชื่อมต่อ Google Sheets ไม่ได้ — การเปลี่ยนแปลงในเครื่องยังไม่ถูกบันทึก', syncNow: 'บันทึกการตั้งค่า', storageNote: 'ออเดอร์และรูปจะเขียนลงแท็บรายเดือนโดยตรง ส่วนรายจ่ายรายเดือน การตั้งค่าแอป และข้อมูลแท็บที่สร้างเพิ่มจะเก็บใน Sweetie App Data' },
      backup: { download: 'ดาวน์โหลดข้อมูลสำรองทั้งหมด', preparing: 'กำลังเตรียมไฟล์…', success: 'ดาวน์โหลดข้อมูลสำรองแล้ว', error: 'ดาวน์โหลดข้อมูลสำรองไม่สำเร็จ', exportMonthly: 'ส่งออก', reportSuccess: 'ดาวน์โหลดรายงานรายเดือนแล้ว', reportError: 'ส่งออกรายงานรายเดือนไม่สำเร็จ' },
      auth: { kicker: 'ผู้ดูแล Sweetie Station', title: 'เข้าสู่ระบบผู้ดูแล', username: 'ชื่อผู้ใช้', password: 'รหัสผ่าน', signIn: 'เข้าสู่ระบบ', signingIn: 'กำลังเข้าสู่ระบบ…', logout: 'ออกจากระบบ', invalid: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', connectionError: 'เชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง', secureSession: 'เซสชันของคุณได้รับการปกป้อง' },
      detail: {
        orderDay: '{{day}}', quantity: '{{count}} {{unit}}', piece: 'ชิ้น', pieces: 'ชิ้น', paymentFull: 'จ่ายเต็มแล้ว', paymentDeposit: 'มัดจำ', paymentUnpaid: 'ยังไม่ได้ชำระ',
        shippingNotOrdered: 'ยังไม่ได้สั่ง', shippingOrdered: 'สั่งแล้ว', shippingInbound: 'รอเข้าไทย', shippingSent: 'ส่งแล้ว', notSet: 'ไม่มีข้อมูล', lineName: 'ชื่อไลน์', customer: 'ชื่อลูกค้า', mockCustomerImage: 'รูปโปรไฟล์ตัวอย่าง',
        items: 'รายการสินค้า', itemNumber: 'รายการที่ {{number}}', itemImage: 'รายการที่ {{number}} รูปที่ {{image}}', photoName: 'ชื่อรูปภาพ', profitMargin: 'อัตรากำไร', campaign: 'แคมเปญ', discount: 'ส่วนลดแคมเปญ', saveCampaign: 'บันทึกแคมเปญ', totalBeforeDiscount: 'ก่อนหักส่วนลด', totalAfterDiscount: 'หลังหักส่วนลด',
        totalSales: 'ยอดขายรวม', totalProfit: 'กำไรรวม', bank: 'ยอดที่โอนแล้ว', deposit: 'ยอดมัดจำที่เหลือ',
      },
      detailFields: {
        discount: 'ส่วนลด', chinaPrice: 'ราคาจีน', costTHB: 'ต้นทุน (บาท)', profit: 'กำไร', shipping: 'ค่าส่ง',
        extraShipping: 'ค่าส่งเพิ่มเติม', productCostY: 'ค่าสินค้า (Y)', productCostB: 'ค่าสินค้า (B)', costRMB: 'ต้นทุน (หยวน)',
        chinaShipping: 'ค่าส่งจีน', netProfit: 'กำไรสุทธิ',
      },
      createOrder: {
        title: 'สร้างคำสั่งซื้อ', editTitle: 'แก้ไขออเดอร์', update: 'บันทึกการแก้ไข', open: 'สร้างออเดอร์', close: 'ปิดหน้าสร้างออเดอร์', linePlaceholder: 'บัญชีหรือชื่อ LINE', pickLine: 'ค้นหารายชื่อจาก LINE…',
        customerPlaceholder: 'ชื่อลูกค้า', day: 'วันที่สั่งซื้อ', itemNumber: 'สินค้า {{number}}', itemName: 'ชื่อสินค้า', photoName: 'ตั้งชื่อรูปภาพ', optional: 'ไม่บังคับ', photoNamePlaceholder: 'เช่น กระเป๋าริบบิ้นสีฟ้า',
        quantity: 'จำนวน', price: 'ยอดขาย (THB)', bank: 'ยอดที่โอนแล้ว (THB)', costRMB: 'ต้นทุนต่อชิ้น (หยวน)', exchangeRate: 'เรทหยวนเป็นบาท', exchangeRateHint: 'ใช้เรทตั้งต้นที่บันทึกไว้ในอุปกรณ์ และแก้ไขได้ตามต้องการ', depositDue: 'ยอดค้างชำระของรายการนี้', orderDepositDue: 'ยอดค้างชำระของออเดอร์', costTHBPreview: 'ต้นทุนรวม', estimatedProfit: 'กำไรโดยประมาณ', isCampaign: 'ออเดอร์แคมเปญ', campaignDiscount: 'ส่วนลด (บาท)', afterDiscount: 'ยอดหลังหักส่วนลด', paymentStatusPreview: 'สถานะชำระเงินอัตโนมัติ', paymentStatus: 'สถานะชำระเงิน',
        shippingStatus: 'สถานะจัดส่ง', uploadPhoto: 'อัปโหลดรูปสินค้า', chooseMonthImage: 'ใช้รูปจากเดือนนี้',
        monthOnlyImages: 'เลือกรูปจาก {{month}} เท่านั้น', filterMonthImages: 'ค้นหารูปในเดือนนี้', noMonthImages: 'ยังไม่มีรูปสินค้าในชีตนี้',
        selectedImage: 'รูปสินค้าที่เลือก', removeImage: 'ลบรูป', addItem: 'เพิ่มสินค้า', remove: 'ลบ',
        cancel: 'ยกเลิก', save: 'บันทึกออเดอร์', localOnly: 'ออเดอร์นี้จะบันทึกในแท็บ Sweetie App Data ของ Google Sheets',
        savedNotice: 'บันทึกออเดอร์ลง Google Sheets แล้ว', imageTypeError: 'กรุณาเลือกไฟล์รูปภาพ', imageReadError: 'เตรียมรูปภาพนี้ไม่สำเร็จ',
      },
      expenses: { title: 'รายจ่ายประจำเดือน', settingsTitle: 'ตั้งค่ารายจ่ายประจำเดือน', open: 'รายจ่าย', close: 'ปิดรายจ่ายประจำเดือน', done: 'เสร็จสิ้น', note: 'รายจ่ายนอกเหนือจากต้นทุนสินค้า', add: 'เพิ่มรายจ่าย', remove: 'ลบรายจ่าย', category: 'หมวดรายจ่าย', description: 'รายละเอียด / หมายเหตุ', amount: 'จำนวนเงิน (บาท)', empty: 'ยังไม่มีรายจ่ายประจำเดือน', shipping: 'ค่าขนส่ง', packaging: 'ค่าแพ็กเกจจิ้ง', ads: 'ค่าโฆษณา', other: 'อื่น ๆ' },
      createSheet: { open: 'สร้างชีต', title: 'สร้างชีตใหม่', close: 'ปิดหน้าสร้างชีต', name: 'ชื่อชีต', namePlaceholder: 'เช่น ออเดอร์พิเศษ', month: 'เดือน', year: 'ปี', create: 'สร้างชีต', localOnly: 'สร้างแท็บจริงใน Google Spreadsheet ที่เชื่อมต่อ', creating: 'กำลังสร้างชีต…', createError: 'สร้างชีตใน Google Sheets ไม่สำเร็จ', validation: 'กรุณาใส่ชื่อชีตและปีระหว่าง 2000–2100' },
      analytics: {
        title: 'วิเคราะห์ข้อมูล', currentMonth: 'ภาพรวมเดือนปัจจุบัน', sales: 'ยอดขาย', orders: 'ออเดอร์', items: 'จำนวนสินค้า', shipped: 'ส่งแล้ว', totalSales: 'ยอดขายทั้งหมด', totalProfit: 'กำไรสุทธิหลังหักรายจ่าย', currentScopeProfit: 'ของเดือนนี้', filteredScopeProfit: 'กำไรจากออเดอร์ที่กรอง (ยังไม่หักรายจ่ายรายเดือน)', netProfitNote: 'หักรายจ่ายรายเดือน {{amount}} บาทแล้ว', partialProfitNote: 'มีข้อมูลกำไร {{known}}/{{total}} รายการ; ยังไม่หักรายจ่ายรายเดือน', monthlyChange: 'การเปลี่ยนแปลงยอดขายรายเดือน', yearlyChange: 'การเปลี่ยนแปลงยอดขายเทียบปีที่แล้ว', changeContext: 'เทียบกับช่วงเดียวกันของ{{month}} ตามตัวกรองสถานะเดียวกัน', yearlyContext: 'เทียบกับปี {{year}} (ยอดขายทั้งเดือน)', noComparison: 'ไม่มีฐานข้อมูลเดือนก่อนหน้าที่ใช้เปรียบเทียบได้', noYearlyComparison: 'ไม่มีข้อมูลเดือนเดียวกันของปีก่อน', noPeriodProfit: 'กรอกต้นทุนหรือกำไรของสินค้าในออเดอร์เพื่อคำนวณกำไรสุทธิ', noPeriodProfitShort: 'ยังไม่มีข้อมูลต้นทุน/กำไร',
        salesProfitGraph: 'กราฟยอดขายและกำไรสุทธิรายเดือน', chartProfitNote: 'จะแสดงกำไรสุทธิเมื่อมีข้อมูลต้นทุนครบทุกชิ้นในเดือนนั้น', partialDataNote: 'บางชีตโหลดข้อมูลได้ไม่ครบ กราฟจึงอาจแสดงยอดบางส่วน', statusTitle: 'สถานะออเดอร์', monthlySales: 'ยอดขายรายเดือน', allSheets: 'ดูชีตทั้งหมด', thisMonth: 'ยอดขายเดือนนี้', filteredSales: 'ยอดขายตามสถานะ', averageSales: 'ยอดขายเฉลี่ยต่อเดือน', averageProfit: 'กำไรเฉลี่ยต่อรายการ', averageMonths: 'จาก {{count}} เดือนที่มีข้อมูล', profitSample: 'จาก {{count}} รายการที่มีข้อมูลต้นทุนหรือกำไร', profitCoverage: 'มีข้อมูลกำไร {{known}} จาก {{total}} รายการ', noProfitData: 'ชีตที่เชื่อมไว้ไม่มีข้อมูลกำไร',
      },
      filters: { sheetType: 'ประเภทชีต', allSheets: 'ทุกประเภท', sortSheets: 'เรียงชีต', monthOrder: 'ตามเดือน', salesHigh: 'ยอดขาย: มากไปน้อย', salesHighShort: 'ยอดขายสูง', salesLow: 'ยอดขาย: น้อยไปมาก', salesLowShort: 'ยอดขายต่ำ', ordersHigh: 'จำนวนออเดอร์: มากไปน้อย', nameAZ: 'ชื่อ: ก ถึง ฮ', nameAZShort: 'ชื่อ A–Z', status: 'กรองตามสถานะ', allStatuses: 'ทุกสถานะ', sort: 'เรียงตาม', statusAZ: 'สถานะ', newest: 'ใหม่ไปเก่า', oldest: 'เก่าไปใหม่', unlisted: 'ไม่ระบุสถานะ', sortItems: 'เรียงสินค้า', show: 'ตัวกรอง', hide: 'ซ่อนตัวกรอง' },
      sheet: {
        loading: 'กำลังโหลดข้อมูลทุกชีต…', loadingShort: 'กำลังโหลด…', loadingMoreData: 'กำลังดาวน์โหลดออเดอร์เพิ่ม…', loadMoreError: 'ดาวน์โหลดออเดอร์ชุดถัดไปไม่สำเร็จ', empty: 'ยังไม่มีออเดอร์ในชีตนี้',
        error: 'โหลดชีตนี้ไม่สำเร็จ', errorShort: 'โหลดไม่ได้', retry: 'ลองอีกครั้ง',
      },
      nav: {
        logout: 'ออกจากระบบ', label: 'เมนูหลัก', home: 'หน้าหลัก', orders: 'ออเดอร์', analytics: 'วิเคราะห์ข้อมูล', backToSheets: 'กลับไปชีตทั้งหมด',
        allSheets: 'ชีตทั้งหมด', backToOrders: 'กลับไปยังคำสั่งซื้อ',
      },
    },
  },
} as const

const languageDefaultVersionKey = 'sweetie-language-default-th-v1'
const explicitLanguageChoiceKey = 'sweetie-language-user-selected'
let initialLanguage = 'th'
try {
  const savedLanguage = localStorage.getItem('sweetie-language')
  const explicitlySelected = localStorage.getItem(explicitLanguageChoiceKey) === '1'
  const defaultMigrated = localStorage.getItem(languageDefaultVersionKey) === '1'
  const validSavedLanguage = savedLanguage === 'th' || savedLanguage === 'en'

  // Older builds defaulted to English and copied it to the shared snapshot. Migrate that
  // implicit default once, while preserving a language the user explicitly selected.
  initialLanguage = defaultMigrated
    ? validSavedLanguage ? savedLanguage : 'th'
    : explicitlySelected && validSavedLanguage ? savedLanguage : 'th'
  localStorage.setItem('sweetie-language', initialLanguage)
  localStorage.setItem(languageDefaultVersionKey, '1')
} catch {
  // Keep Thai as the default when browser storage is unavailable.
}

if (typeof document !== 'undefined') document.documentElement.lang = initialLanguage

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
