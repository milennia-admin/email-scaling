'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export interface TrendPoint {
  label: string
  openRate: number  // 0–100 (percentage)
  clickRate: number // 0–100 (percentage)
}

interface TooltipPayloadItem {
  name: string
  value: number
  color: string
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
    <div className="rounded-lg border border-gray-200 bg-white shadow-lg px-3 py-2.5 space-y-1 max-w-[200px]">
      <p className="text-xs font-semibold text-gray-700 truncate">{label}</p>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
          <span className="text-xs text-gray-500">{item.name}:</span>
          <span className="text-xs font-semibold text-gray-900">
            {item.value.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  )
}

interface CampaignTrendChartProps {
  data: TrendPoint[]
}

export default function CampaignTrendChart({ data }: CampaignTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-52 text-gray-400">
        <p className="text-sm">No campaign data yet</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart
        data={data}
        margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v}%`}
          domain={[0, 'auto']}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
          iconType="circle"
          iconSize={8}
        />
        <Line
          type="monotone"
          dataKey="openRate"
          name="Open Rate"
          stroke="#6366f1"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
        <Line
          type="monotone"
          dataKey="clickRate"
          name="Click Rate"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
