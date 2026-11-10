import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  en: {
    translation: {
      language: 'Language',
      screen: { splash: 'Loading splash screen', home: 'Sheets home', sheetOrders: 'Orders in sheet', detail: 'Order details', analytics: 'Analytics', settings: 'Settings', admin: 'Admin sign in' },
      splash: { tagline: 'Pre-order your favorites\nfrom around the world', continue: 'Skip loading and open home', loading: 'Preparing your workspace…', logoAlt: 'Sweetie Station logo' },
      sheets: {
        kicker: 'Sweetie preorder shop', title: 'Sheets', sheetCountShort: '{{count}} sheets', unpaidCount: '{{count}} unpaid', current: 'Current month', chips: { all: 'All', sales: 'Sales', haul: 'Haul', unpaid: 'Unpaid' }, chooseMonth: 'Choose a month', sheetCount: '{{count}} sheets · tap one to view its orders',
        allSheets: 'All sheets', showControls: 'Show search and filters', hideControls: 'Hide search and filters', orderCount: '{{count}} orders', partialOrderCount: '{{count}}+ orders loaded', profit: 'Profit', partialProfit: 'Partial profit', monthSummary: '{{orders}} orders · {{total}} THB', search: 'Search sheets', noMatch: 'No sheets match this search.',
        kind: { sales: 'SALES', haul: 'HAUL' },
        jan: 'January', feb: 'February', mar: 'March', apr: 'April', may: 'May', june: 'June', haulJul: 'Guangzhou · 4–18 Jul', july: 'July', aug: 'August', sep: 'September',
        haulSep: 'Guangzhou · 16–23 Sep', oct: 'October', nov: 'November', dec: 'December',
      },
      orders: {
        title: 'Orders', orders: 'orders', statSales: 'Sales', statProfit: 'Net profit', refresh: 'Refresh', refreshing: 'Updating', pullToRefresh: 'Pull down to refresh', releaseToRefresh: 'Release to refresh', open: 'Open order', showSummary: 'Show month summary', hideSummary: 'Hide month summary',
        item: 'item', items: 'items', oneItem: '1 item', manyItems: '{{count}} items', itemCount: '{{count}} items', resultCount: '{{shown}} of {{total}} orders', resultCountPartial: '{{shown}} shown · {{total}}+ loaded', search: 'Search customer or item', closeSearch: 'Close search', searchItems: 'Search items', noMatch: 'No matching orders', compactView: 'Compact list', cardView: 'Detailed cards', edit: 'Edit', editSaved: 'Order changes saved to Google Sheets.', loadingMore: 'Loading more orders…', endOfList: 'You’re all caught up.', profit: 'Profit', profitUnavailable: '—',
      },
      details: { title: 'Order details', summary: 'Order summary', status: 'Order status', statusHint: 'Update payment and shipping here.', saving: 'Saving status…', itemCount: '{{count}} items' },
      lineContacts: { loading: 'Loading LINE contacts…' },
      settings: { title: 'Settings', kicker: 'Sweetie Station', subtitle: 'Manage your preferences and account.', preferences: 'Preferences', data: 'Data & backup', backupHint: 'Download a copy of your order and app data.', account: 'Account', displayLanguage: 'Display language' },
      sync: { idle: 'App settings not saved yet', syncing: 'Saving app settings…', synced: 'Google Sheets connected', offline: 'Google Sheets unavailable — local changes are not synced', syncNow: 'Save settings', storageNote: 'Orders and photos are written directly to their month tabs. Monthly expenses, app settings, and custom tab metadata are stored in Sweetie App Data.' },
      backup: { download: 'Download full backup', preparing: 'Preparing download…', success: 'Full backup downloaded.', error: 'Could not download the full backup.', exportMonthly: 'Export', reportSuccess: 'Monthly report downloaded.', reportError: 'Could not export the monthly report.' },
      auth: { kicker: 'Sweetie Station admin', title: 'Admin sign in', username: 'Username', password: 'Password', showPassword: 'Show password', hidePassword: 'Hide password', signIn: 'Sign in', signingIn: 'Signing in…', logout: 'Log out', invalid: 'Incorrect username or password.', connectionError: 'Could not connect. Please try again.', secureSession: 'Your session is protected.' },
      detail: {
        orderDay: '{{day}}', quantity: '{{count}} {{unit}}', piece: 'pc', pieces: 'pcs', paymentFull: 'Paid in full', paymentDeposit: 'Deposit', paymentUnpaid: 'Unpaid',
        shippingNotOrdered: 'Not ordered', shippingOrdered: 'Ordered', shippingInbound: 'Waiting for Thailand', shippingSent: 'Shipped', notSet: 'Not listed', lineName: 'LINE name', customer: 'Customer', mockCustomerImage: 'Mock customer avatar',
        items: 'Items', itemNumber: 'Order item {{number}}', itemImage: 'Order item {{number}}, photo {{image}}', photoName: 'Photo name', profitMargin: 'Profit margin', itemProfit: 'Profit', itemProfitPerUnit: 'Profit / item', previewImage: 'View full-size image', imagePreview: 'Product image preview', closeImagePreview: 'Close image preview', campaign: 'Campaign', discount: 'Campaign discount', saveCampaign: 'Save campaign', savingCampaign: 'Saving…', totalBeforeDiscount: 'Before discount', totalAfterDiscount: 'After discount',
        totalSales: 'Sales total', totalProfit: 'Total profit', bank: 'Paid so far', deposit: 'Deposit due',
      },
      detailFields: {
        discount: 'Discount', chinaPrice: 'China price', costTHB: 'Cost (THB)', profit: 'Profit', shipping: 'Shipping',
        extraShipping: 'Extra shipping', productCostY: 'Product cost (Y)', productCostB: 'Product cost (B)', costRMB: 'Cost (RMB)',
        chinaShipping: 'China shipping', netProfit: 'Net profit',
      },
      createOrder: {
        title: 'Create an order', increase: 'Increase quantity', decrease: 'Decrease quantity', editTitle: 'Edit order', update: 'Save changes', open: 'Create order', close: 'Close create order', discardUnsaved: 'Discard unsaved order changes?', orderInfo: 'Order information', stepInfo: 'Details', stepItems: 'Items', stepReview: 'Review', stepProgress: 'Step {{current}} of {{total}}', next: 'Next', back: 'Back', create: 'Create order', requiredFieldsNote: 'Required fields are marked *', fulfillmentPayment: 'Payment & shipping', statusHint: 'These statuses can be updated later.', campaignSummary: 'Campaign & totals', liveSummary: 'Totals update as you edit', linePlaceholder: 'LINE account or handle', useNewLine: 'Use “{{name}}” (new)',
        customerPlaceholder: 'Customer name', day: 'Order date', itemNumber: 'Item {{number}}', itemName: 'Item name', photoName: 'Name this photo', optional: 'optional', photoNamePlaceholder: 'e.g. Blue ribbon pouch',
        quantity: 'Quantity', price: 'Sale total (THB)', bank: 'Amount paid (THB)', costRMB: 'Unit cost (CNY)', exchangeRate: 'Exchange rate (THB per CNY)', exchangeRateHint: 'Default rate is saved on this device; adjust it when needed.', depositDue: 'Item deposit due', orderDepositDue: 'Order deposit due', costTHBPreview: 'Cost total', estimatedProfit: 'Estimated profit', isCampaign: 'Campaign order', campaignDiscount: 'Discount amount (THB)', afterDiscount: 'Total after discount', paymentStatusPreview: 'Payment status preview', paymentStatus: 'Payment status',
        shippingStatus: 'Shipping status', uploadPhoto: 'Upload item photo', chooseMonthImage: 'Use this month’s photo', imagePrefillHint: 'Choosing a saved photo fills in its item name and sale price.', preparingImage: 'Preparing image…',
        monthOnlyImages: 'Photos from {{month}} only', filterMonthImages: 'Filter this month’s photos', noMonthImages: 'No item photos in this sheet yet.',
        selectedImage: 'Selected item photo', removeImage: 'Remove photo', addItem: 'Add another item', remove: 'Remove',
        cancel: 'Cancel', save: 'Save order', localOnly: 'Saved directly to this Google Sheet.', saving: 'Saving to Google Sheets…', saveError: 'Could not save this order to Google Sheets.',
        savedNotice: 'Order saved to Google Sheets.', imageTypeError: 'Choose an image file.', imageReadError: 'This image could not be prepared.',
      },
      expenses: { title: 'Monthly expenses', settingsTitle: 'Monthly expenses settings', open: 'Expenses', close: 'Close monthly expenses', done: 'Done', save: 'Save expenses', savePrompt: 'Review your changes, then save them for this month.', note: 'Outside product costs', add: 'Add expense', remove: 'Remove expense', category: 'Expense category', description: 'Description / note', amount: 'Amount (THB)', empty: 'No monthly expenses yet.', discardUnsaved: 'Discard unsaved monthly expense changes?', shipping: 'Shipping', packaging: 'Packaging', ads: 'Ads', other: 'Other' },
      createSheet: { open: 'Create sheet', title: 'Create a sheet', close: 'Close create sheet', name: 'Sheet name', namePlaceholder: 'e.g. Special orders', month: 'Month', year: 'Year', preview: 'New sheet preview', destination: 'A new tab will be added to the connected Google spreadsheet.', create: 'Create sheet', localOnly: 'Creates a real tab in the connected Google spreadsheet.', creating: 'Creating sheet…', createError: 'Could not create the sheet in Google Sheets.', validation: 'Enter a sheet name and a year between 2000 and 2100.', discardUnsaved: 'Discard your unsaved sheet details?' },
      analytics: {
        title: 'Analytics', moreMetrics: 'More performance metrics', currentMonth: 'Current month overview', monthPicker: 'Month', monthOverview: 'Monthly overview', selectedMonthSales: 'Sales for selected month', itemProfit: 'Item profit', partialItemProfit: 'Partial product profit', topItems: 'Top items this month', topItemsHint: 'Ranked by units sold', topItemsEmpty: 'No identifiable item sales this month.', unnamedItem: 'Unlabeled item', unitsSold: '{{count}} sold', itemSalesValue: 'Sales', sales: 'Sales', orders: 'Orders', items: 'Items', shipped: 'Shipped', totalSales: 'Total sales', totalProfit: 'Net profit', currentScopeProfit: 'For this month', filteredScopeProfit: 'Filtered order profit before monthly expenses', netProfitNote: 'After {{amount}} THB monthly expenses', partialProfitNote: 'Partial profit from {{known}}/{{total}} items; monthly expenses not deducted', monthlyChange: 'Monthly sales change', yearlyChange: 'Year-over-year sales change', changeContext: 'Compared with {{month}} for the same period and status filter', yearlyContext: 'Compared with {{year}} (full-month sales)', noComparison: 'No comparable previous-month baseline', noYearlyComparison: 'No same-month prior-year data', noPeriodProfit: 'Add product cost or profit data to order items to calculate net profit.', noPeriodProfitShort: 'Cost/profit data needed',
        salesProfitGraph: 'Monthly sales & net profit', chartProfitNote: 'Lighter profit bars are partial: some items in that month have no cost recorded yet.', partialDataNote: 'Some monthly sheets could not be fully loaded; graph values may be partial.', statusTitle: 'Order status', monthlySales: 'Sales by month', allSheets: 'All sheets', thisMonth: 'Sales this month', filteredSales: 'Sales matching status', averageSales: 'Average monthly sales', averageProfit: 'Average profit / item', averageMonths: 'Across {{count}} populated months', profitSample: 'From {{count}} items with cost or profit data', profitCoverage: '{{known}} of {{total}} items have profit data', noProfitData: 'No profit data in linked sheets',
      },
      filters: { sheetType: 'Sheet type', allSheets: 'All types', sortSheets: 'Sort sheets', monthOrder: 'Month order', salesHigh: 'Sales: high to low', salesHighShort: 'Top sales', salesLow: 'Sales: low to high', salesLowShort: 'Low sales', ordersHigh: 'Orders: most first', nameAZ: 'Name: A to Z', nameAZShort: 'A–Z', status: 'Filter by status', allStatuses: 'All statuses', sort: 'Sort by', statusAZ: 'Status', newest: 'Newest first', oldest: 'Oldest first', unlisted: 'Status not listed', sortItems: 'Sort items', sheetControls: 'Sheet search and filters', activeCount: '{{count}} active filters', clear: 'Clear filters', show: 'Filter', hide: 'Hide' },
      sheet: {
        loading: 'Loading workbook sheets…', loadingShort: 'Loading…', loadingMoreData: 'Downloading more orders…', loadMoreError: 'Could not download the next batch.', empty: 'No orders in this sheet yet.',
        error: 'Could not load this sheet.', errorShort: 'Unavailable', retry: 'Retry',
      },
      nav: {
        logout: 'Log out', label: 'Main navigation', home: 'Home', orders: 'Orders', analytics: 'Analytics', settings: 'Settings', backToSheets: 'Back to all sheets',
        allSheets: 'All sheets', backToOrders: 'Back to orders',
      },
    },
  },
  th: {
    translation: {
      language: 'ภาษา',
      screen: { splash: 'หน้าจอเริ่มต้น', home: 'หน้ารวมชีต', sheetOrders: 'รายการคำสั่งซื้อในชีต', detail: 'รายละเอียดคำสั่งซื้อ', analytics: 'วิเคราะห์ข้อมูล', settings: 'ตั้งค่า', admin: 'เข้าสู่ระบบผู้ดูแล' },
      splash: { tagline: 'พรีออเดอร์ของน่ารักจากทั่วโลก\nส่งตรงถึงมือคุณ', continue: 'ข้ามหน้ารอและไปหน้าหลัก', loading: 'กำลังเตรียมพื้นที่ทำงาน…', logoAlt: 'โลโก้ Sweetie Station' },
      sheets: {
        kicker: 'จัดการพรีออเดอร์ Sweetie', title: 'ชีต', sheetCountShort: '{{count}} ชีต', unpaidCount: 'ค้างจ่าย {{count}}', current: 'เดือนปัจจุบัน', chips: { all: 'ทั้งหมด', sales: 'ยอดขาย', haul: 'หิ้วสินค้า', unpaid: 'ค้างจ่าย' }, chooseMonth: 'เลือกเดือน', sheetCount: '{{count}} ชีต · แตะเพื่อดูคำสั่งซื้อ',
        allSheets: 'ชีตทั้งหมด', showControls: 'แสดงช่องค้นหาและตัวกรอง', hideControls: 'ซ่อนช่องค้นหาและตัวกรอง', orderCount: '{{count}} ออเดอร์', partialOrderCount: 'โหลดแล้วอย่างน้อย {{count}} ออเดอร์', profit: 'กำไรสุทธิ', partialProfit: 'กำไรบางส่วน', monthSummary: '{{orders}} ออเดอร์ · {{total}} THB', search: 'ค้นหาชีต', noMatch: 'ไม่พบชีตที่ตรงกับคำค้นหา',
        kind: { sales: 'ยอดขาย', haul: 'หิ้วสินค้า' },
        jan: 'มกราคม', feb: 'กุมภาพันธ์', mar: 'มีนาคม', apr: 'เมษายน', may: 'พฤษภาคม', june: 'มิถุนายน', haulJul: 'กวางโจว · 4–18 ก.ค.', july: 'กรกฎาคม', aug: 'สิงหาคม', sep: 'กันยายน',
        haulSep: 'กวางโจว · 16–23 ก.ย.', oct: 'ตุลาคม', nov: 'พฤศจิกายน', dec: 'ธันวาคม',
      },
      orders: {
        title: 'รายการคำสั่งซื้อ', orders: 'ออเดอร์', statSales: 'ยอดขาย', statProfit: 'กำไรสุทธิ', refresh: 'รีเฟรช', refreshing: 'กำลังอัปเดต', pullToRefresh: 'ดึงลงเพื่อรีเฟรช', releaseToRefresh: 'ปล่อยเพื่อรีเฟรช', open: 'เปิดคำสั่งซื้อ', showSummary: 'แสดงสรุปรายเดือน', hideSummary: 'ซ่อนสรุปรายเดือน',
        item: 'ชิ้น', items: 'ชิ้น', oneItem: '1 ชิ้น', manyItems: '{{count}} ชิ้น', itemCount: '{{count}} รายการ', resultCount: 'แสดง {{shown}} จาก {{total}} ออเดอร์', resultCountPartial: 'แสดง {{shown}} · โหลดแล้ว {{total}}+ ออเดอร์', search: 'ค้นหาลูกค้าหรือสินค้า', closeSearch: 'ปิดช่องค้นหา', searchItems: 'ค้นหารายการสินค้า', noMatch: 'ไม่พบออเดอร์ที่ตรงกัน', compactView: 'รายการแบบย่อ', cardView: 'การ์ดแบบละเอียด', edit: 'แก้ไข', editSaved: 'บันทึกการแก้ไขออเดอร์ลง Google Sheets แล้ว', loadingMore: 'กำลังโหลดออเดอร์เพิ่ม…', endOfList: 'แสดงครบแล้ว', profit: 'กำไร', profitUnavailable: '—',
      },
      details: { title: 'รายละเอียดคำสั่งซื้อ', summary: 'สรุปคำสั่งซื้อ', status: 'สถานะออเดอร์', statusHint: 'เปลี่ยนสถานะชำระเงินและจัดส่งได้ที่นี่', saving: 'กำลังบันทึกสถานะ…', itemCount: '{{count}} ชิ้น' },
      lineContacts: { loading: 'กำลังโหลดรายชื่อ LINE…' },
      settings: { title: 'ตั้งค่า', kicker: 'Sweetie Station', subtitle: 'จัดการภาษาและบัญชีของคุณ', preferences: 'การตั้งค่า', data: 'ข้อมูลและการสำรอง', backupHint: 'ดาวน์โหลดสำเนาข้อมูลออเดอร์และการตั้งค่าแอป', account: 'บัญชี', displayLanguage: 'ภาษาที่แสดง' },
      sync: { idle: 'ยังไม่ได้บันทึกการตั้งค่าแอป', syncing: 'กำลังบันทึกการตั้งค่าแอป…', synced: 'เชื่อมต่อ Google Sheets แล้ว', offline: 'เชื่อมต่อ Google Sheets ไม่ได้ — การเปลี่ยนแปลงในเครื่องยังไม่ถูกบันทึก', syncNow: 'บันทึกการตั้งค่า', storageNote: 'ออเดอร์และรูปจะเขียนลงแท็บรายเดือนโดยตรง ส่วนรายจ่ายรายเดือน การตั้งค่าแอป และข้อมูลแท็บที่สร้างเพิ่มจะเก็บใน Sweetie App Data' },
      backup: { download: 'ดาวน์โหลดข้อมูลสำรองทั้งหมด', preparing: 'กำลังเตรียมไฟล์…', success: 'ดาวน์โหลดข้อมูลสำรองแล้ว', error: 'ดาวน์โหลดข้อมูลสำรองไม่สำเร็จ', exportMonthly: 'ส่งออก', reportSuccess: 'ดาวน์โหลดรายงานรายเดือนแล้ว', reportError: 'ส่งออกรายงานรายเดือนไม่สำเร็จ' },
      auth: { kicker: 'ผู้ดูแล Sweetie Station', title: 'เข้าสู่ระบบผู้ดูแล', username: 'ชื่อผู้ใช้', password: 'รหัสผ่าน', showPassword: 'แสดงรหัสผ่าน', hidePassword: 'ซ่อนรหัสผ่าน', signIn: 'เข้าสู่ระบบ', signingIn: 'กำลังเข้าสู่ระบบ…', logout: 'ออกจากระบบ', invalid: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', connectionError: 'เชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง', secureSession: 'เซสชันของคุณได้รับการปกป้อง' },
      detail: {
        orderDay: '{{day}}', quantity: '{{count}} {{unit}}', piece: 'ชิ้น', pieces: 'ชิ้น', paymentFull: 'จ่ายเต็มแล้ว', paymentDeposit: 'มัดจำ', paymentUnpaid: 'ยังไม่ได้ชำระ',
        shippingNotOrdered: 'ยังไม่ได้สั่ง', shippingOrdered: 'สั่งแล้ว', shippingInbound: 'รอเข้าไทย', shippingSent: 'ส่งแล้ว', notSet: 'ไม่มีข้อมูล', lineName: 'ชื่อไลน์', customer: 'ชื่อลูกค้า', mockCustomerImage: 'รูปโปรไฟล์ตัวอย่าง',
        items: 'รายการสินค้า', itemNumber: 'รายการที่ {{number}}', itemImage: 'รายการที่ {{number}} รูปที่ {{image}}', photoName: 'ชื่อรูปภาพ', profitMargin: 'อัตรากำไร', itemProfit: 'กำไรสินค้า', itemProfitPerUnit: 'กำไร/ชิ้น', previewImage: 'ดูรูปสินค้าแบบเต็มขนาด', imagePreview: 'ตัวอย่างรูปสินค้า', closeImagePreview: 'ปิดรูปสินค้า', campaign: 'แคมเปญ', discount: 'ส่วนลดแคมเปญ', saveCampaign: 'บันทึกแคมเปญ', savingCampaign: 'กำลังบันทึก…', totalBeforeDiscount: 'ก่อนหักส่วนลด', totalAfterDiscount: 'หลังหักส่วนลด',
        totalSales: 'ยอดขายรวม', totalProfit: 'กำไรรวม', bank: 'ยอดที่โอนแล้ว', deposit: 'ยอดมัดจำที่เหลือ',
      },
      detailFields: {
        discount: 'ส่วนลด', chinaPrice: 'ราคาจีน', costTHB: 'ต้นทุน (บาท)', profit: 'กำไร', shipping: 'ค่าส่ง',
        extraShipping: 'ค่าส่งเพิ่มเติม', productCostY: 'ค่าสินค้า (Y)', productCostB: 'ค่าสินค้า (B)', costRMB: 'ต้นทุน (หยวน)',
        chinaShipping: 'ค่าส่งจีน', netProfit: 'กำไรสุทธิ',
      },
      createOrder: {
        title: 'สร้างคำสั่งซื้อ', increase: 'เพิ่มจำนวน', decrease: 'ลดจำนวน', editTitle: 'แก้ไขออเดอร์', update: 'บันทึกการแก้ไข', open: 'สร้างออเดอร์', close: 'ปิดหน้าสร้างออเดอร์', discardUnsaved: 'มีข้อมูลออเดอร์ที่ยังไม่บันทึก ต้องการละทิ้งหรือไม่?', orderInfo: 'ข้อมูลออเดอร์', stepInfo: 'ข้อมูล', stepItems: 'สินค้า', stepReview: 'ยืนยัน', stepProgress: 'ขั้นตอน {{current}} จาก {{total}}', next: 'ถัดไป', back: 'ย้อนกลับ', create: 'สร้างออเดอร์', requiredFieldsNote: 'ช่องที่ต้องกรอกมีเครื่องหมาย *', fulfillmentPayment: 'การชำระเงินและจัดส่ง', statusHint: 'เปลี่ยนสถานะภายหลังได้', campaignSummary: 'แคมเปญและยอดรวม', liveSummary: 'ยอดจะอัปเดตตามข้อมูลที่กรอก', linePlaceholder: 'บัญชีหรือชื่อ LINE', useNewLine: 'ใช้ “{{name}}” (ใหม่)',
        customerPlaceholder: 'ชื่อลูกค้า', day: 'วันที่สั่งซื้อ', itemNumber: 'สินค้า {{number}}', itemName: 'ชื่อสินค้า', photoName: 'ตั้งชื่อรูปภาพ', optional: 'ไม่บังคับ', photoNamePlaceholder: 'เช่น กระเป๋าริบบิ้นสีฟ้า',
        quantity: 'จำนวน', price: 'ยอดขาย (THB)', bank: 'ยอดที่โอนแล้ว (THB)', costRMB: 'ต้นทุนต่อชิ้น (หยวน)', exchangeRate: 'เรทหยวนเป็นบาท', exchangeRateHint: 'ใช้เรทตั้งต้นที่บันทึกไว้ในอุปกรณ์ และแก้ไขได้ตามต้องการ', depositDue: 'ยอดค้างชำระของรายการนี้', orderDepositDue: 'ยอดค้างชำระของออเดอร์', costTHBPreview: 'ต้นทุนรวม', estimatedProfit: 'กำไรโดยประมาณ', isCampaign: 'ออเดอร์แคมเปญ', campaignDiscount: 'ส่วนลด (บาท)', afterDiscount: 'ยอดหลังหักส่วนลด', paymentStatusPreview: 'สถานะชำระเงินอัตโนมัติ', paymentStatus: 'สถานะชำระเงิน',
        shippingStatus: 'สถานะจัดส่ง', uploadPhoto: 'อัปโหลดรูปสินค้า', chooseMonthImage: 'ใช้รูปจากเดือนนี้', imagePrefillHint: 'เมื่อเลือกรูปที่มีอยู่ ระบบจะเติมชื่อสินค้าและยอดขายให้อัตโนมัติ', preparingImage: 'กำลังเตรียมรูป…',
        monthOnlyImages: 'เลือกรูปจาก {{month}} เท่านั้น', filterMonthImages: 'ค้นหารูปในเดือนนี้', noMonthImages: 'ยังไม่มีรูปสินค้าในชีตนี้',
        selectedImage: 'รูปสินค้าที่เลือก', removeImage: 'ลบรูป', addItem: 'เพิ่มสินค้า', remove: 'ลบ',
        cancel: 'ยกเลิก', save: 'บันทึกออเดอร์', localOnly: 'ออเดอร์นี้จะบันทึกในแท็บ Sweetie App Data ของ Google Sheets',
        savedNotice: 'บันทึกออเดอร์ลง Google Sheets แล้ว', imageTypeError: 'กรุณาเลือกไฟล์รูปภาพ', imageReadError: 'เตรียมรูปภาพนี้ไม่สำเร็จ',
      },
      expenses: { title: 'รายจ่ายประจำเดือน', settingsTitle: 'ตั้งค่ารายจ่ายประจำเดือน', open: 'รายจ่าย', close: 'ปิดรายจ่ายประจำเดือน', done: 'เสร็จสิ้น', save: 'บันทึกรายจ่าย', savePrompt: 'ตรวจสอบรายการ แล้วกดยืนยันเพื่อบันทึกรายจ่ายของเดือนนี้', note: 'รายจ่ายนอกเหนือจากต้นทุนสินค้า', add: 'เพิ่มรายจ่าย', remove: 'ลบรายจ่าย', category: 'หมวดรายจ่าย', description: 'รายละเอียด / หมายเหตุ', amount: 'จำนวนเงิน (บาท)', empty: 'ยังไม่มีรายจ่ายประจำเดือน', discardUnsaved: 'ต้องการละทิ้งรายการรายจ่ายที่ยังไม่บันทึกหรือไม่?', shipping: 'ค่าขนส่ง', packaging: 'ค่าแพ็กเกจจิ้ง', ads: 'ค่าโฆษณา', other: 'อื่น ๆ' },
      createSheet: { open: 'สร้างชีต', title: 'สร้างชีตใหม่', close: 'ปิดหน้าสร้างชีต', name: 'ชื่อชีต', namePlaceholder: 'เช่น ออเดอร์พิเศษ', month: 'เดือน', year: 'ปี', preview: 'ตัวอย่างชีตใหม่', destination: 'ระบบจะเพิ่มแท็บใหม่ใน Google Spreadsheet ที่เชื่อมต่อ', create: 'สร้างชีต', localOnly: 'สร้างแท็บจริงใน Google Spreadsheet ที่เชื่อมต่อ', creating: 'กำลังสร้างชีต…', createError: 'สร้างชีตใน Google Sheets ไม่สำเร็จ', validation: 'กรุณาใส่ชื่อชีตและปีระหว่าง 2000–2100', discardUnsaved: 'ต้องการละทิ้งข้อมูลชีตที่ยังไม่บันทึกหรือไม่?' },
      analytics: {
        title: 'วิเคราะห์ข้อมูล', moreMetrics: 'ดูตัวชี้วัดเพิ่มเติม', currentMonth: 'ภาพรวมเดือนปัจจุบัน', monthPicker: 'เดือน', monthOverview: 'ภาพรวมรายเดือน', selectedMonthSales: 'ยอดขายเดือนที่เลือก', itemProfit: 'กำไรสินค้า', partialItemProfit: 'กำไรสินค้าบางส่วน', topItems: 'สินค้าขายดีประจำเดือน', topItemsHint: 'เรียงตามจำนวนชิ้นที่ขายได้', topItemsEmpty: 'เดือนนี้ยังไม่มีข้อมูลสินค้าที่ระบุชื่อหรือรูปได้', unnamedItem: 'สินค้าไม่ระบุชื่อ', unitsSold: 'ขายได้ {{count}} ชิ้น', itemSalesValue: 'ยอดขาย', sales: 'ยอดขาย', orders: 'ออเดอร์', items: 'จำนวนสินค้า', shipped: 'ส่งแล้ว', totalSales: 'ยอดขายทั้งหมด', totalProfit: 'กำไรสุทธิหลังหักรายจ่าย', currentScopeProfit: 'ของเดือนนี้', filteredScopeProfit: 'กำไรจากออเดอร์ที่กรอง (ยังไม่หักรายจ่ายรายเดือน)', netProfitNote: 'หักรายจ่ายรายเดือน {{amount}} บาทแล้ว', partialProfitNote: 'มีข้อมูลกำไร {{known}}/{{total}} รายการ; ยังไม่หักรายจ่ายรายเดือน', monthlyChange: 'การเปลี่ยนแปลงยอดขายรายเดือน', yearlyChange: 'การเปลี่ยนแปลงยอดขายเทียบปีที่แล้ว', changeContext: 'เทียบกับช่วงเดียวกันของ{{month}} ตามตัวกรองสถานะเดียวกัน', yearlyContext: 'เทียบกับปี {{year}} (ยอดขายทั้งเดือน)', noComparison: 'ไม่มีฐานข้อมูลเดือนก่อนหน้าที่ใช้เปรียบเทียบได้', noYearlyComparison: 'ไม่มีข้อมูลเดือนเดียวกันของปีก่อน', noPeriodProfit: 'กรอกต้นทุนหรือกำไรของสินค้าในออเดอร์เพื่อคำนวณกำไรสุทธิ', noPeriodProfitShort: 'ยังไม่มีข้อมูลต้นทุน/กำไร',
        salesProfitGraph: 'กราฟยอดขายและกำไรสุทธิรายเดือน', chartProfitNote: 'แท่งกำไรสีอ่อนคือกำไรบางส่วน เพราะบางรายการในเดือนนั้นยังไม่มีต้นทุน', partialDataNote: 'บางชีตโหลดข้อมูลได้ไม่ครบ กราฟจึงอาจแสดงยอดบางส่วน', statusTitle: 'สถานะออเดอร์', monthlySales: 'ยอดขายรายเดือน', allSheets: 'ดูชีตทั้งหมด', thisMonth: 'ยอดขายเดือนนี้', filteredSales: 'ยอดขายตามสถานะ', averageSales: 'ยอดขายเฉลี่ยต่อเดือน', averageProfit: 'กำไรเฉลี่ยต่อรายการ', averageMonths: 'จาก {{count}} เดือนที่มีข้อมูล', profitSample: 'จาก {{count}} รายการที่มีข้อมูลต้นทุนหรือกำไร', profitCoverage: 'มีข้อมูลกำไร {{known}} จาก {{total}} รายการ', noProfitData: 'ชีตที่เชื่อมไว้ไม่มีข้อมูลกำไร',
      },
      filters: { sheetType: 'ประเภทชีต', allSheets: 'ทุกประเภท', sortSheets: 'เรียงชีต', monthOrder: 'ตามเดือน', salesHigh: 'ยอดขาย: มากไปน้อย', salesHighShort: 'ยอดขายสูง', salesLow: 'ยอดขาย: น้อยไปมาก', salesLowShort: 'ยอดขายต่ำ', ordersHigh: 'จำนวนออเดอร์: มากไปน้อย', nameAZ: 'ชื่อ: ก ถึง ฮ', nameAZShort: 'ชื่อ A–Z', status: 'กรองตามสถานะ', allStatuses: 'ทุกสถานะ', sort: 'เรียงตาม', statusAZ: 'สถานะ', newest: 'ใหม่ไปเก่า', oldest: 'เก่าไปใหม่', unlisted: 'ไม่ระบุสถานะ', sortItems: 'เรียงสินค้า', sheetControls: 'ค้นหาและตัวกรองชีต', activeCount: 'ตัวกรองที่ใช้ {{count}} รายการ', clear: 'ล้างตัวกรอง', show: 'ตัวกรอง', hide: 'ซ่อนตัวกรอง' },
      sheet: {
        loading: 'กำลังโหลดข้อมูลทุกชีต…', loadingShort: 'กำลังโหลด…', loadingMoreData: 'กำลังดาวน์โหลดออเดอร์เพิ่ม…', loadMoreError: 'ดาวน์โหลดออเดอร์ชุดถัดไปไม่สำเร็จ', empty: 'ยังไม่มีออเดอร์ในชีตนี้',
        error: 'โหลดชีตนี้ไม่สำเร็จ', errorShort: 'โหลดไม่ได้', retry: 'ลองอีกครั้ง',
      },
      nav: {
        logout: 'ออกจากระบบ', label: 'เมนูหลัก', home: 'หน้าหลัก', orders: 'ออเดอร์', analytics: 'วิเคราะห์ข้อมูล', settings: 'ตั้งค่า', backToSheets: 'กลับไปชีตทั้งหมด',
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
