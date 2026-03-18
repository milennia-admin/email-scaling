'use client'

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface CampaignStatsChartProps {
  uniqueOpens: number
  totalClicks: number
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

const BAR_COLORS = ['#10b981', '#6366f1']

export default function CampaignStatsChart({
  uniqueOpens,
  totalClicks,
}: CampaignStatsChartProps) {
  const data = [
    { name: 'Unique Opens', value: uniqueOpens },
    { name: 'Clicks', value: totalClicks },
  ]

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
        barSize={72}
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
          {data.map((_, i) => (
            <Cell key={i} fill={BAR_COLORS[i] ?? '#6366f1'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
