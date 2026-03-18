import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import Header from '@/components/dashboard/Header'
import CampaignStatsChart from '@/components/campaigns/CampaignStatsChart'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { fetchCampaignById } from '@/lib/activecampaign/client'
import { normalizeACCampaign } from '@/types/activecampaign'
import type { NormalizedCampaign } from '@/types/activecampaign'

function formatDate(dateStr: string | null): string {
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

function formatRate(rate: number): string {
  if (rate === 0) return '—'
  return `${(rate * 100).toFixed(2)}%`
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-semibold text-gray-900 tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

interface CampaignDetailProps {
  id: string
}

async function CampaignDetail({ id }: CampaignDetailProps) {
  let campaign: NormalizedCampaign

  try {
    const raw = await fetchCampaignById(id)
    campaign = normalizeACCampaign(raw)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to load campaign'

    // 404 if the AC API returns a not-found error
    if (msg.includes('404')) notFound()

    return (
      <div className="px-6 py-6">
        <ErrorMessage title="Could not load campaign" message={msg} />
      </div>
    )
  }

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Campaign metadata */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</dt>
            <dd className="mt-1 text-sm text-gray-900">{campaign.subject || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">From</dt>
            <dd className="mt-1 text-sm text-gray-900">{campaign.fromName || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Send Date</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(campaign.sendDate)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">Type</dt>
            <dd className="mt-1 text-sm text-gray-900 capitalize">{campaign.type || '—'}</dd>
          </div>
        </dl>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Sent" value={campaign.totalSent} />
        <StatCard
          label="Unique Opens"
          value={campaign.uniqueOpens}
          sub={formatRate(campaign.openRate)}
        />
        <StatCard
          label="Total Clicks"
          value={campaign.totalClicks}
          sub={formatRate(campaign.clickRate)}
        />
        <StatCard label="Bounces" value={campaign.bounces} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Opens" value={campaign.totalOpens} />
        <StatCard label="Unique Clicks" value={campaign.uniqueClicks} />
        <StatCard label="Forwards" value={campaign.forwards} />
        <StatCard label="Unsubscribes" value={campaign.unsubscribes} />
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-5">
          Engagement breakdown
        </h2>
        <CampaignStatsChart
          totalSent={campaign.totalSent}
          uniqueOpens={campaign.uniqueOpens}
          totalClicks={campaign.totalClicks}
          bounces={campaign.bounces}
          unsubscribes={campaign.unsubscribes}
        />
      </div>
    </div>
  )
}

interface PageProps {
  params: { id: string }
}

export default function CampaignDetailPage({ params }: PageProps) {
  return (
    <div>
      {/* Back link + header */}
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

      <Header title="Campaign Detail" subtitle={`ID: ${params.id}`} />

      <Suspense
        fallback={
          <div className="px-6 py-6 space-y-4 animate-pulse">
            <div className="h-24 bg-gray-100 rounded-xl" />
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-xl" />
              ))}
            </div>
            <div className="h-72 bg-gray-100 rounded-xl" />
          </div>
        }
      >
        <CampaignDetail id={params.id} />
      </Suspense>
    </div>
  )
}
