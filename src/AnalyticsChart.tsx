import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type MonthlyChartPoint = {
  label: string
  sales: number
  netProfit: number | null
}

export default function AnalyticsChart({
  data,
  salesLabel,
  profitLabel,
  formatMoney,
}: {
  data: MonthlyChartPoint[]
  salesLabel: string
  profitLabel: string
  formatMoney: (value: number) => string
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} accessibilityLayer>
        <CartesianGrid stroke="#e2e2e2" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#707070', fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#d9d9d9' }} />
        <YAxis yAxisId="sales" tickFormatter={(value) => formatMoney(Number(value))} tick={{ fill: '#8a8a8a', fontSize: 11 }} tickLine={false} axisLine={false} width={54} />
        <YAxis yAxisId="profit" orientation="right" tickFormatter={(value) => formatMoney(Number(value))} tick={{ fill: '#8a8a8a', fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
        <Tooltip formatter={(value) => [`${formatMoney(Number(value))} THB`]} labelStyle={{ color: '#212121', fontSize: 11, fontWeight: 600 }} contentStyle={{ border: 0, borderRadius: 14, boxShadow: '0 10px 24px rgb(0 0 0 / 12%)', fontSize: 11 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar yAxisId="sales" dataKey="sales" name={salesLabel} fill="#ff1f6d" radius={[8, 8, 0, 0]} />
        <Line yAxisId="profit" type="monotone" dataKey="netProfit" name={profitLabel} stroke="#212121" strokeWidth={2.5} dot={{ r: 4, fill: '#212121', stroke: '#fff', strokeWidth: 2 }} connectNulls={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
