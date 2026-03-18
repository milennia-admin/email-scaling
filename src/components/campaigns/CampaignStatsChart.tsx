'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface CampaignStatsChartProps {
  totalSent: number
  uniqueOpens: number
  totalClicks: number
  bounces: number
  unsubscribes: number
}

const BARS = [
  { key: 'value', label: 'Sent', color: '#6366f1' },
]

const COLORS: Record<string, string> = {
  Sent: '#6366f1',
  'Unique Opens': '#10b981',
  Clicks: '#3b82f6',
  Bounces: '#f59e0b',
  Unsubscribes: '#ef4444',
}

interface TooltipPayloadItem {
  name: string
  value: number
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-lg px-3 py-2">
      <p className="text-sm font-medium text-gray-900">{payload[0].name}</p>
      <p className="text-lg font-semibold text-gray-900 tabular-nums">
        {payload[0].value.toLocaleString()}
      </p>
    </div>
  )
}

export default function CampaignStatsChart({
  totalSent,
  uniqueOpens,
  totalClicks,
  bounces,
  unsubscribes,
}: CampaignStatsChartProps) {
  const data = [
    { name: 'Sent', value: totalSent },
    { name: 'Unique Opens', value: uniqueOpens },
    { name: 'Clicks', value: totalClicks },
    { name: 'Bounces', value: bounces },
    { name: 'Unsubscribes', value: unsubscribes },
  ]

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
        barSize={48}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
          }
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={COLORS[entry.name] ?? '#6366f1'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
