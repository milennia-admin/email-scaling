import { Suspense } from 'react'
import Header from '@/components/dashboard/Header'
import CampaignTable from '@/components/campaigns/CampaignTable'
import CampaignFilters from '@/components/campaigns/CampaignFilters'
import SkeletonTable from '@/components/ui/SkeletonTable'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { fetchAllCampaigns } from '@/lib/activecampaign/client'
import { normalizeACCampaign } from '@/types/activecampaign'
import type { NormalizedCampaign } from '@/types/activecampaign'

// Map UI filter value → ActiveCampaign status code
const STATUS_TO_AC: Record<string, string> = {
  sent: '5',
  scheduled: '1',
  draft: '0',
}

interface CampaignsContentProps {
  statusFilter: string | undefined
}

async function CampaignsContent({ statusFilter }: CampaignsContentProps) {
  let campaigns: NormalizedCampaign[] = []
  let errorMessage: string | null = null

  try {
    const acStatus =
      statusFilter && STATUS_TO_AC[statusFilter]
        ? STATUS_TO_AC[statusFilter]
        : undefined

    const raw = await fetchAllCampaigns(acStatus)
    campaigns = raw.map(normalizeACCampaign)

    // Client-side filter for statuses AC doesn't filter directly (paused/sending)
    if (statusFilter && !STATUS_TO_AC[statusFilter]) {
      campaigns = campaigns.filter((c) => c.status === statusFilter)
    }

    // Sort by send date descending, drafts last
    campaigns.sort((a, b) => {
      if (!a.sendDate && !b.sendDate) return 0
      if (!a.sendDate) return 1
      if (!b.sendDate) return -1
      return new Date(b.sendDate).getTime() - new Date(a.sendDate).getTime()
    })
  } catch (err) {
    errorMessage =
      err instanceof Error ? err.message : 'Failed to load campaigns'
  }

  if (errorMessage) {
    return (
      <div className="px-6 py-6">
        <ErrorMessage
          title="Could not load campaigns"
          message={errorMessage}
        />
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
        </p>
      </div>
      <CampaignTable campaigns={campaigns} />
    </div>
  )
}

interface CampaignsPageProps {
  searchParams: { status?: string }
}

export default function CampaignsPage({ searchParams }: CampaignsPageProps) {
  const statusFilter = searchParams.status

  return (
    <div>
      <Header
        title="Campaigns"
        subtitle="Live data from ActiveCampaign"
      />

      <div className="px-6 py-6 space-y-4">
        {/* Filters — wrapped in Suspense because useSearchParams requires it */}
        <div className="flex items-center justify-between">
          <Suspense fallback={<div className="h-9 w-64 bg-gray-100 rounded-lg animate-pulse" />}>
            <CampaignFilters />
          </Suspense>
        </div>

        {/* Campaign table */}
        <Suspense fallback={<div className="bg-white border border-gray-200 rounded-xl overflow-hidden"><SkeletonTable rows={8} cols={7} /></div>}>
          <CampaignsContent statusFilter={statusFilter} />
        </Suspense>
      </div>
    </div>
  )
}
