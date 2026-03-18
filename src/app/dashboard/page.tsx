import { createClient } from '@/lib/supabase/server'
import Header from '@/components/dashboard/Header'
import SyncButton from '@/components/dashboard/SyncButton'
import CampaignTrendChart from '@/components/dashboard/CampaignTrendChart'
import type { TrendPoint } from '@/components/dashboard/CampaignTrendChart'
import type { DbSyncLog, DbCampaign } from '@/types/database'

async function getLastSync(supabase: ReturnType<typeof createClient>): Promise<DbSyncLog | null> {
  const { data } = await supabase
    .from('sync_logs')
    .select('*')
    .eq('status', 'completed')
    .eq('source_type', 'activecampaign')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data as DbSyncLog | null
}

async function getCampaignCount(supabase: ReturnType<typeof createClient>): Promise<number> {
  const { count } = await supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true })

  return count ?? 0
}

async function getContactCount(supabase: ReturnType<typeof createClient>): Promise<number> {
  const { count } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })

  return count ?? 0
}

interface CampaignSummary {
  id: string
  name: string
  sendDate: string | null
  openRate: number | null
  clickRate: number | null
  totalSent: number
}

async function getRecentCampaigns(
  supabase: ReturnType<typeof createClient>
): Promise<CampaignSummary[]> {
  const { data } = await supabase
    .from('campaigns')
    .select('external_id, name, send_date, open_rate, click_rate, total_sent')
    .eq('status', 'sent')
    .order('send_date', { ascending: false, nullsFirst: false })
    .limit(8)

  return ((data ?? []) as DbCampaign[]).map((c) => ({
    id: c.external_id,
    name: c.name,
    sendDate: c.send_date,
    openRate: c.open_rate,
    clickRate: c.click_rate,
    totalSent: c.total_sent,
  }))
}

async function getAccountAverages(
  supabase: ReturnType<typeof createClient>
): Promise<{ avgOpenRate: number; avgClickRate: number }> {
  const { data } = await supabase
    .from('campaigns')
    .select('open_rate, click_rate')
    .eq('status', 'sent')
    .not('open_rate', 'is', null)
    .not('click_rate', 'is', null)

  const rows = (data ?? []) as Array<{ open_rate: number; click_rate: number }>
  if (rows.length === 0) return { avgOpenRate: 0, avgClickRate: 0 }

  const avgOpenRate = rows.reduce((s, r) => s + r.open_rate, 0) / rows.length
  const avgClickRate = rows.reduce((s, r) => s + r.click_rate, 0) / rows.length
  return { avgOpenRate, avgClickRate }
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatPct(rate: number | null): string {
  if (!rate) return '—'
  return `${(rate * 100).toFixed(1)}%`
}

function openRateColor(rate: number | null): string {
  if (!rate) return 'text-gray-400'
  if (rate > 0.25) return 'text-green-600'
  if (rate >= 0.15) return 'text-yellow-600'
  return 'text-red-500'
}

const COMING_SOON = [
  {
    title: 'Attribution',
    description: 'Lead source analysis and revenue attribution powered by Hyros data.',
    href: '/dashboard/attribution',
  },
  {
    title: 'Analytics',
    description: 'Cross-channel reporting: email performance, pipeline conversion, ad ROI.',
    href: '/dashboard/analytics',
  },
]

export default async function DashboardPage() {
  const supabase = createClient()
  const [lastSync, campaignCount, contactCount, recentCampaigns, { avgOpenRate, avgClickRate }] =
    await Promise.all([
      getLastSync(supabase),
      getCampaignCount(supabase),
      getContactCount(supabase),
      getRecentCampaigns(supabase),
      getAccountAverages(supabase),
    ])

  // Build trend data (oldest -> newest for the chart)
  const trendData: TrendPoint[] = [...recentCampaigns]
    .reverse()
    .filter((c) => c.openRate !== null)
    .map((c) => ({
      label: c.name.length > 24 ? c.name.slice(0, 22) + '...' : c.name,
      openRate: parseFloat(((c.openRate ?? 0) * 100).toFixed(2)),
      clickRate: parseFloat(((c.clickRate ?? 0) * 100).toFixed(2)),
    }))

  return (
    <div>
      <Header
        title="Overview"
        subtitle="Milennia email marketing dashboard"
        actions={<SyncButton lastSyncAt={lastSync?.completed_at ?? null} />}
      />

      <div className="px-6 py-6 space-y-6">
        {/* Sync status banner */}
        {lastSync ? (
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <div className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
            <p className="text-sm text-green-700">
              Last synced from ActiveCampaign{' '}
              <span className="font-medium">{formatRelativeTime(lastSync.completed_at!)}</span>
              {' '}—{' '}
              {lastSync.records_upserted.toLocaleString()} records updated
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
            <div className="h-2 w-2 rounded-full bg-yellow-500 flex-shrink-0" />
            <p className="text-sm text-yellow-700">
              No sync has run yet. Click <span className="font-medium">Sync now</span> to import data from ActiveCampaign.
            </p>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Campaigns synced', value: campaignCount.toLocaleString(), colorClass: 'text-gray-900' },
            { label: 'Contacts synced', value: contactCount.toLocaleString(), colorClass: 'text-gray-900' },
            {
              label: 'Avg open rate',
              value: avgOpenRate > 0 ? formatPct(avgOpenRate) : '—',
              colorClass: openRateColor(avgOpenRate),
            },
            {
              label: 'Avg click rate',
              value: avgClickRate > 0 ? formatPct(avgClickRate) : '—',
              colorClass: avgClickRate > 0.03 ? 'text-green-600' : avgClickRate > 0 ? 'text-yellow-600' : 'text-gray-400',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-gray-200 px-5 py-4"
            >
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {stat.label}
              </p>
              <p className={`mt-1.5 text-2xl font-semibold tabular-nums ${stat.colorClass}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Campaign performance trend */}
        {trendData.length > 1 && (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Campaign performance trend</h2>
              <p className="mt-0.5 text-xs text-gray-400">
                Open rate and click rate for the {trendData.length} most recent sent campaigns
              </p>
            </div>
            <CampaignTrendChart data={trendData} />
          </div>
        )}

        {/* Recent campaigns table */}
        {recentCampaigns.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Recent campaigns</h2>
              <a
                href="/dashboard/campaigns"
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                View all →
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Campaign
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Send Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Sent
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Open Rate
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Click Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {recentCampaigns.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3">
                        <a
                          href={`/dashboard/campaigns/${c.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors truncate block max-w-xs"
                        >
                          {c.name}
                        </a>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(c.sendDate)}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right text-sm text-gray-900 tabular-nums">
                        {c.totalSent > 0 ? c.totalSent.toLocaleString() : '—'}
                      </td>
                      <td className={`px-6 py-3 whitespace-nowrap text-right text-sm font-medium tabular-nums ${openRateColor(c.openRate)}`}>
                        {formatPct(c.openRate)}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right text-sm text-gray-900 tabular-nums">
                        {formatPct(c.clickRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Live sections */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Live now
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              {
                title: 'Campaigns',
                description: `${campaignCount.toLocaleString()} campaigns synced from ActiveCampaign. View open rates, click rates, and per-campaign analytics.`,
                href: '/dashboard/campaigns',
              },
              {
                title: 'Contacts',
                description: `${contactCount.toLocaleString()} contacts synced from ActiveCampaign. View engagement history and tag memberships.`,
                href: '/dashboard/contacts',
              },
            ].map((item) => (
              <a
                key={item.title}
                href={item.href}
                className="bg-white rounded-xl border border-gray-200 px-5 py-5 hover:border-indigo-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700 group-hover:text-indigo-600 transition-colors">
                    {item.title}
                  </p>
                  <svg className="h-4 w-4 text-gray-300 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                  {item.description}
                </p>
              </a>
            ))}
          </div>
        </div>

        {/* Coming soon sections */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Coming in future phases
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {COMING_SOON.map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-xl border border-gray-200 border-dashed px-5 py-5 opacity-60"
              >
                <p className="text-sm font-semibold text-gray-700">{item.title}</p>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
