'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface PerformanceComparisonChartProps {
  openRate: number      // this campaign, 0–1
  clickRate: number     // this campaign, 0–1
  avgOpenRate: number   // account average, 0–1
  avgClickRate: number  // account average, 0–1
}

interface TooltipPayloadItem {
  name: string
  value: number
  fill: string
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-lg px-3 py-2.5 space-y-1">
      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{label}</p>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ background: item.fill }} />
          <span className="text-xs text-gray-600">{item.name}:</span>
          <span className="text-xs font-semibold text-gray-900">
            {(item.value).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  )
}

export default function PerformanceComparisonChart({
  openRate,
  clickRate,
  avgOpenRate,
  avgClickRate,
}: PerformanceComparisonChartProps) {
  const data = [
    {
      metric: 'Open Rate',
      'This campaign': parseFloat((openRate * 100).toFixed(2)),
      'Account avg': parseFloat((avgOpenRate * 100).toFixed(2)),
    },
    {
      metric: 'Click Rate',
      'This campaign': parseFloat((clickRate * 100).toFixed(2)),
      'Account avg': parseFloat((avgClickRate * 100).toFixed(2)),
    },
  ]

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
        barCategoryGap="30%"
        barGap={4}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="metric"
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v}%`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
        <Legend
          wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
          iconType="square"
          iconSize={10}
        />
        <Bar dataKey="This campaign" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={56} />
        <Bar dataKey="Account avg" fill="#d1d5db" radius={[3, 3, 0, 0]} maxBarSize={56} />
      </BarChart>
    </ResponsiveContainer>
  )
}
