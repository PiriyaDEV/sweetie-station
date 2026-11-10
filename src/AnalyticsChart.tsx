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
        <CartesianGrid stroke="#f1e9e7" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: '#887d7a', fontSize: 9 }} tickLine={false} axisLine={{ stroke: '#e9dfdd' }} />
        <YAxis yAxisId="sales" tickFormatter={(value) => formatMoney(Number(value))} tick={{ fill: '#9a8f8c', fontSize: 8 }} tickLine={false} axisLine={false} width={54} />
        <YAxis yAxisId="profit" orientation="right" tickFormatter={(value) => formatMoney(Number(value))} tick={{ fill: '#9a8f8c', fontSize: 8 }} tickLine={false} axisLine={false} width={48} />
        <Tooltip formatter={(value) => [`${formatMoney(Number(value))} THB`]} labelStyle={{ color: '#453d3b', fontSize: 10 }} contentStyle={{ border: '1px solid #eee3e1', borderRadius: 10, fontSize: 9 }} />
        <Legend wrapperStyle={{ fontSize: 9 }} />
        <Bar yAxisId="sales" dataKey="sales" name={salesLabel} fill="#c66a86" radius={[4, 4, 0, 0]} />
        <Line yAxisId="profit" type="monotone" dataKey="netProfit" name={profitLabel} stroke="#5c8d3a" strokeWidth={2.5} dot={{ r: 3.5, fill: '#5c8d3a' }} connectNulls={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
