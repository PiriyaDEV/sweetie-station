// Dev-only fake API so the UI can be previewed without Google Sheets or real credentials.
// Enabled with `npm run dev:mock`. Never bundled into the production build.
import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

const SHEET_GIDS = ['246786947', '2065480441', '767554552', '1487621265', '1083277464', '1314167799', '51699199', '1666163539', '402607796', '905302264']

const LINE_NAMES = ['mintyy', 'Ploy 🍓', 'June.c', 'nampetch', 'Fah ☁️', 'Bam bam', 'aomsin', 'Kaewkaew', 'Nicha', 'pangpond', 'Mook 🎀', 'Earn', 'Bow', 'Praew', 'Toey']
const CUSTOMERS = ['มินตรา ใจดี', 'พลอย ศรีสุข', 'จูน ชัยวัฒน์', 'น้ำเพชร ทองดี', 'ฟ้า รุ่งเรือง', 'แบม วงศ์ใหญ่', 'ออมสิน แก้วใส', 'แก้วตา มณี', 'ณิชา พรหมมา', 'ปังปอนด์ สายสุข', 'มุก ดาวเรือง', 'เอิร์น ใจงาม', 'โบว์ สีชมพู', 'แพรว นิลสุวรรณ', 'เตย ศรีวงศ์']
const ITEMS = ['Melody flower keychain', 'Stella Lou plush bag', 'Kuromi hair clip set', 'Miffy charm', 'Duffy & ShellieMay plush', 'Hello Kitty sandals', 'Cinnamoroll pouch', 'LinaBell headband', 'Pochacco mini figure', 'Lotso tote bag', 'Blind box · Sweet series', 'Ribbon phone strap']
const PAYMENT = ['จ่ายเต็ม', 'จ่ายเต็ม', 'มัดจำ', 'ยังไม่ได้ชำระ']
const SHIPPING = ['ส่งแล้ว', 'รอเข้าไทย', 'สั่งแล้ว', 'ยังไม่ได้สั่ง']

function seeded(seed: number) {
  let value = seed % 2147483647
  if (value <= 0) value += 2147483646
  return () => (value = (value * 16807) % 2147483647) / 2147483647
}

function csvCell(value: string | number) {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function buildSheetCsv(gid: string) {
  const random = seeded(Number(gid.slice(-6)) || 7)
  const pick = <T,>(list: T[]) => list[Math.floor(random() * list.length)]
  const headers = ['วันที่', 'ชื่อไลน์', 'ชื่อจริง', 'รายการ', 'จำนวน', 'ราคาขาย', 'BANK', 'ราคามัดจำ', 'ต้นทุน(บาท)', 'กำไรสุทธิ', 'Sweetie Image Data', 'Sweetie Payment Status', 'Sweetie Shipping Status']
  const rows: (string | number)[][] = [headers]
  const orderCount = gid === '905302264' ? 0 : 14 + Math.floor(random() * 14)
  for (let order = 0; order < orderCount; order += 1) {
    const day = Math.min(28, 1 + Math.floor((order / orderCount) * 28))
    const who = Math.floor(random() * LINE_NAMES.length)
    const lines = 1 + Math.floor(random() * 3)
    const payment = pick(PAYMENT)
    const shipping = pick(SHIPPING)
    const missingCost = random() < 0.12
    for (let line = 0; line < lines; line += 1) {
      const quantity = 1 + Math.floor(random() * 2)
      const sale = (190 + Math.floor(random() * 12) * 60) * quantity
      const cost = Math.round(sale * (0.55 + random() * 0.25))
      const image = `/order-images/image${1 + Math.floor(random() * 520)}.webp`
      const paid = payment === 'จ่ายเต็ม' ? sale : payment === 'มัดจำ' ? Math.round(sale / 2) : 0
      rows.push([
        line === 0 ? String(day) : '',
        line === 0 ? LINE_NAMES[who] : '',
        line === 0 ? CUSTOMERS[who] : '',
        pick(ITEMS),
        quantity,
        sale,
        paid,
        Math.round(sale / 2),
        missingCost ? '' : cost,
        missingCost ? '' : sale - cost,
        JSON.stringify([image]),
        line === 0 ? payment : '',
        line === 0 ? shipping : '',
      ])
    }
  }
  return rows.map((row) => row.map(csvCell).join(',')).join('\n')
}

function json(response: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  response.writeHead(status, { 'content-type': 'application/json', ...headers })
  response.end(JSON.stringify(body))
}

async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(chunk as Buffer)
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') } catch { return {} }
}

export function mockApi(): Plugin {
  let snapshot: Record<string, unknown> | null = null
  const csvByGid = new Map<string, string>()
  const csvFor = (gid: string) => {
    if (!csvByGid.has(gid)) csvByGid.set(gid, SHEET_GIDS.includes(gid) ? buildSheetCsv(gid) : 'วันที่,ชื่อไลน์,รายการ')
    return csvByGid.get(gid) as string
  }
  return {
    name: 'sweetie-mock-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url ?? '/', 'http://localhost')
        if (!url.pathname.startsWith('/api/')) return next()
        const signedIn = /sweetie_mock=1/.test(request.headers.cookie ?? '')
        const method = request.method ?? 'GET'
        await new Promise((resolve) => setTimeout(resolve, 250))

        if (url.pathname === '/api/auth') {
          if (method === 'GET') return json(response, 200, { authenticated: signedIn })
          if (method === 'DELETE') return json(response, 200, { ok: true }, { 'set-cookie': 'sweetie_mock=; Path=/; Max-Age=0' })
          const body = await readBody(request)
          if (!body.username || !body.password) return json(response, 401, { error: 'Invalid' })
          return json(response, 200, { ok: true }, { 'set-cookie': 'sweetie_mock=1; Path=/; HttpOnly; SameSite=Lax' })
        }
        if (!signedIn) return json(response, 401, { error: 'Your session has expired. Please sign in again.' })

        if (url.pathname === '/api/data') {
          if (method === 'GET') return json(response, 200, { snapshot })
          snapshot = await readBody(request)
          return json(response, 200, { ok: true })
        }
        if (url.pathname === '/api/sheets') {
          if (method === 'POST') {
            const body = await readBody(request)
            const sheetId = String(900000000 + csvByGid.size)
            csvByGid.set(sheetId, 'วันที่,ชื่อไลน์,รายการ')
            return json(response, 201, { ok: true, sheet: { sheetId, title: body.name } })
          }
          const csv = csvFor(url.searchParams.get('gid') ?? '')
          const [header, ...rows] = csv.split('\n')
          const offset = Number(url.searchParams.get('offset') ?? 0)
          const limit = Number(url.searchParams.get('limit') ?? 120)
          response.writeHead(200, { 'content-type': 'text/csv; charset=utf-8' })
          return response.end([header, ...rows.slice(offset, offset + limit)].join('\n'))
        }
        if (url.pathname === '/api/orders') {
          await readBody(request)
          return json(response, 200, { ok: true, orderId: `mock-${Date.now()}`, rowNumbers: [] })
        }
        if (url.pathname === '/api/line-contacts') return json(response, 200, { contacts: [] })
        return json(response, 404, { error: 'Not mocked' })
      })
    },
  }
}
