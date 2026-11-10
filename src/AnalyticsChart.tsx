import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type MonthlyChartPoint = {
  label: string
  shortLabel: string
  sales: number
  netProfit: number | null
  profitPartial: boolean
}

const SALES = '#dd5f86'
const PROFIT = '#4a3a2e'
const PROFIT_PARTIAL = '#b8a79c'

function compact(value: number) {
  const absolute = Math.abs(value)
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (absolute >= 1_000) return `${(value / 1_000).toFixed(absolute >= 10_000 ? 0 : 1).replace(/\.0$/, '')}k`
  return String(value)
}

export default function AnalyticsChart({
  data,
  salesLabel,
  profitLabel,
  partialLabel,
  formatMoney,
}: {
  data: MonthlyChartPoint[]
  salesLabel: string
  profitLabel: string
  partialLabel: string
  formatMoney: (value: number) => string
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 pb-2 text-[12px] font-semibold text-ink" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5"><i className="inline-block size-2.5 rounded-sm" style={{ background: SALES }} />{salesLabel}</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block size-2.5 rounded-sm" style={{ background: PROFIT }} />{profitLabel}</span>
        <span className="inline-flex items-center gap-1.5"><i className="inline-block size-2.5 rounded-sm" style={{ background: PROFIT_PARTIAL }} />{partialLabel}</span>
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -6 }} barGap={2} barCategoryGap="22%" accessibilityLayer>
            <CartesianGrid stroke="#f3dbe5" strokeDasharray="3 4" vertical={false} />
            <XAxis dataKey="shortLabel" interval={0} tick={{ fill: '#8f7c74', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#f0d3df' }} />
            <YAxis tickFormatter={(value) => compact(Number(value))} tick={{ fill: '#8f7c74', fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              cursor={{ fill: 'rgb(221 95 134 / 8%)' }}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ''}
              formatter={(value, name, item) => {
                const point = item.payload as MonthlyChartPoint
                const label = name === 'netProfit' ? (point.profitPartial ? partialLabel : profitLabel) : salesLabel
                return [`${formatMoney(Number(value))} THB`, label]
              }}
              labelStyle={{ color: '#4a3a2e', fontSize: 12, fontWeight: 700 }}
              contentStyle={{ border: 0, borderRadius: 14, boxShadow: '0 10px 24px rgb(120 60 80 / 14%)', fontSize: 12 }}
            />
            <Bar dataKey="sales" name="sales" fill={SALES} radius={[6, 6, 0, 0]} maxBarSize={18} />
            <Bar dataKey="netProfit" name="netProfit" radius={[6, 6, 0, 0]} maxBarSize={18}>
              {data.map((point) => <Cell key={point.label} fill={point.profitPartial ? PROFIT_PARTIAL : PROFIT} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
