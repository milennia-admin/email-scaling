import { Suspense } from 'react'
import Header from '@/components/dashboard/Header'
import CampaignTable from '@/components/campaigns/CampaignTable'
import CampaignFilters from '@/components/campaigns/CampaignFilters'
import SkeletonTable from '@/components/ui/SkeletonTable'
import ErrorMessage from '@/components/ui/ErrorMessage'
import { createClient } from '@/lib/supabase/server'
import type { DbCampaign, CampaignStatus } from '@/types'

function dbCampaignToRow(c: DbCampaign) {
  return {
    id: c.external_id,         // AC external ID — used in route /campaigns/{id}
    dbId: c.id,
    name: c.name,
    subject: c.subject,
    fromName: c.from_name,
    fromEmail: c.from_email,
    status: (c.status ?? 'draft') as CampaignStatus,
    type: c.type,
    sendDate: c.send_date,
    listName: c.list_name,
    totalSent: c.total_sent,
    uniqueOpens: c.unique_opens,
    totalClicks: c.total_clicks,
    unsubscribes: c.unsubscribes,
    openRate: c.open_rate,
    clickRate: c.click_rate,
  }
}

export type CampaignRow = ReturnType<typeof dbCampaignToRow>

interface CampaignsContentProps {
  statusFilter: string | undefined
}

async function CampaignsContent({ statusFilter }: CampaignsContentProps) {
  const supabase = createClient()

  let query = supabase
    .from('campaigns')
    .select('*')
    .order('send_date', { ascending: false, nullsFirst: false })

  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  const { data, error } = await query

  if (error) {
    return (
      <div className="px-6 py-6">
        <ErrorMessage title="Could not load campaigns" message={error.message} />
      </div>
    )
  }

  const campaigns = (data as DbCampaign[]).map(dbCampaignToRow)

  if (campaigns.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <svg className="h-10 w-10 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
          <p className="text-sm font-medium">No campaigns found</p>
          <p className="text-xs mt-1 text-gray-400">
            {statusFilter ? 'Try a different filter, or' : 'Use'} the{' '}
            <span className="font-medium text-gray-500">Sync now</span> button on the overview to import campaigns.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-6 py-3 border-b border-gray-100">
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
        subtitle="Synced from ActiveCampaign"
      />

      <div className="px-6 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <Suspense fallback={<div className="h-9 w-64 bg-gray-100 rounded-lg animate-pulse" />}>
            <CampaignFilters />
          </Suspense>
        </div>

        <Suspense fallback={
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <SkeletonTable rows={8} cols={7} />
          </div>
        }>
          <CampaignsContent statusFilter={statusFilter} />
        </Suspense>
      </div>
    </div>
  )
}
