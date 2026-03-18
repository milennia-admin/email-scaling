import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import Header from '@/components/dashboard/Header'
import CampaignStatsChart from '@/components/campaigns/CampaignStatsChart'
import PerformanceComparisonChart from '@/components/campaigns/PerformanceComparisonChart'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { createClient } from '@/lib/supabase/server'
import type { DbCampaign, CampaignStatus } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatPct(rate: number | null | undefined): string {
  if (rate === null || rate === undefined || rate === 0) return '—'
  return `${(rate * 100).toFixed(1)}%`
}

function openRateColor(rate: number | null): string {
  if (!rate) return 'text-gray-900'
  if (rate > 0.25) return 'text-green-600'
  if (rate >= 0.15) return 'text-yellow-600'
  return 'text-red-600'
}

function clickRateColor(rate: number | null): string {
  if (!rate) return 'text-gray-900'
  if (rate > 0.03) return 'text-green-600'
  if (rate >= 0.01) return 'text-yellow-600'
  return 'text-red-600'
}

function StatusBadge({ status }: { status: CampaignStatus | null }) {
  if (!status) return null
  const styles: Record<CampaignStatus, string> = {
    sent: 'bg-green-50 text-green-700 ring-green-600/20',
    scheduled: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    draft: 'bg-gray-50 text-gray-600 ring-gray-500/10',
    sending: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
    paused: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  subColor,
}: {
  label: string
  value: string | number
  sub?: string
  subColor?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold text-gray-900 tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sub && (
        <p className={`mt-0.5 text-sm font-medium tabular-nums ${subColor ?? 'text-gray-400'}`}>
          {sub}
        </p>
      )}
    </div>
  )
}

// ─── Main content ─────────────────────────────────────────────────────────────

interface CampaignDetailProps {
  id: string  // AC external ID
}

async function CampaignDetail({ id }: CampaignDetailProps) {
  const supabase = createClient()

  // Fetch this campaign from Supabase by AC external ID
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('external_id', id)
    .maybeSingle()

  if (error) {
    return (
      <div className="px-6 py-6">
        <ErrorMessage title="Could not load campaign" message={error.message} />
      </div>
    )
  }

  if (!campaign) {
    notFound()
  }

  const c = campaign as DbCampaign

  // Fetch averages for all sent campaigns (for comparison chart)
  const { data: allSent } = await supabase
    .from('campaigns')
    .select('open_rate, click_rate')
    .eq('status', 'sent')
    .not('open_rate', 'is', null)
    .not('click_rate', 'is', null)

  const sentCampaigns = (allSent ?? []) as Array<{ open_rate: number; click_rate: number }>
  const avgOpenRate =
    sentCampaigns.length > 0
      ? sentCampaigns.reduce((s, x) => s + x.open_rate, 0) / sentCampaigns.length
      : 0
  const avgClickRate =
    sentCampaigns.length > 0
      ? sentCampaigns.reduce((s, x) => s + x.click_rate, 0) / sentCampaigns.length
      : 0

  const openRate = c.open_rate ?? 0
  const clickRate = c.click_rate ?? 0

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Campaign info panel */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Campaign info
        </h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium text-gray-400 uppercase tracking-wider">Subject</dt>
            <dd className="mt-1 text-sm text-gray-900">{c.subject || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400 uppercase tracking-wider">From</dt>
            <dd className="mt-1 text-sm text-gray-900">{c.from_name || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400 uppercase tracking-wider">From email</dt>
            <dd className="mt-1 text-sm text-gray-900">{c.from_email || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400 uppercase tracking-wider">Type</dt>
            <dd className="mt-1 text-sm text-gray-900 capitalize">{c.type || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400 uppercase tracking-wider">Send date</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(c.send_date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-400 uppercase tracking-wider">List</dt>
            <dd className="mt-1 text-sm text-gray-900">{c.list_name || '—'}</dd>
          </div>
        </dl>
      </div>

      {/* Stats grid — 8 cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Sent" value={c.total_sent} />
        <StatCard
          label="Unique Opens"
          value={c.unique_opens}
          sub={formatPct(openRate)}
          subColor={openRateColor(openRate)}
        />
        <StatCard
          label="Open Rate"
          value={formatPct(openRate)}
          sub={openRate > avgOpenRate ? `+${((openRate - avgOpenRate) * 100).toFixed(1)}% vs avg` : openRate > 0 ? `-${((avgOpenRate - openRate) * 100).toFixed(1)}% vs avg` : undefined}
          subColor={openRateColor(openRate)}
        />
        <StatCard label="Total Clicks" value={c.total_clicks} />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Click Rate"
          value={formatPct(clickRate)}
          sub={clickRate > avgClickRate ? `+${((clickRate - avgClickRate) * 100).toFixed(1)}% vs avg` : clickRate > 0 ? `-${((avgClickRate - clickRate) * 100).toFixed(1)}% vs avg` : undefined}
          subColor={clickRateColor(clickRate)}
        />
        <StatCard label="Bounces" value={c.bounces} />
        <StatCard label="Unsubscribes" value={c.unsubscribes} />
        <StatCard label="Forwards" value={c.forwards} />
      </div>

      {/* Performance comparison */}
      {sentCampaigns.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-gray-900">
              This campaign vs your average
            </h2>
            <p className="mt-0.5 text-xs text-gray-400">
              Compared against {sentCampaigns.length} sent campaigns
            </p>
          </div>
          <PerformanceComparisonChart
            openRate={openRate}
            clickRate={clickRate}
            avgOpenRate={avgOpenRate}
            avgClickRate={avgClickRate}
          />
        </div>
      )}

      {/* Engagement breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-5">
          Engagement breakdown
        </h2>
        <CampaignStatsChart
          uniqueOpens={c.unique_opens}
          totalClicks={c.total_clicks}
        />
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  params: { id: string }
}

async function CampaignHeader({ id }: { id: string }) {
  const supabase = createClient()
  const { data } = await supabase
    .from('campaigns')
    .select('name, status, list_name, send_date')
    .eq('external_id', id)
    .maybeSingle()

  const name = data?.name ?? 'Campaign Detail'
  const subtitle = [
    data?.list_name,
    data?.send_date
      ? new Date(data.send_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Header
      title={name}
      subtitle={subtitle || undefined}
      actions={data?.status ? <StatusBadge status={data.status as CampaignStatus} /> : undefined}
    />
  )
}

export default function CampaignDetailPage({ params }: PageProps) {
  return (
    <div>
      <div className="px-6 pt-5 pb-0">
        <Link
          href="/dashboard/campaigns"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          All campaigns
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="px-6 pb-4 border-b border-gray-200 bg-white animate-pulse">
            <div className="h-6 w-64 bg-gray-200 rounded" />
            <div className="h-4 w-40 bg-gray-100 rounded mt-2" />
          </div>
        }
      >
        <CampaignHeader id={params.id} />
      </Suspense>

      <Suspense
        fallback={
          <div className="px-6 py-6 space-y-4 animate-pulse">
            <div className="h-28 bg-gray-100 rounded-xl" />
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-xl" />
              ))}
            </div>
            <div className="h-64 bg-gray-100 rounded-xl" />
            <div className="h-56 bg-gray-100 rounded-xl" />
          </div>
        }
      >
        <CampaignDetail id={params.id} />
      </Suspense>
    </div>
  )
}
