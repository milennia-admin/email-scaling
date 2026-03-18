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
    id: c.external_id,
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
    totalOpens: c.total_opens,
    uniqueOpens: c.unique_opens,
    totalClicks: c.total_clicks,
    uniqueClicks: c.unique_clicks,
    bounces: c.bounces,
    unsubscribes: c.unsubscribes,
    forwards: c.forwards,
    openRate: c.open_rate,
    clickRate: c.click_rate,
    bounceRate: c.bounce_rate,
    unsubscribeRate: c.unsubscribe_rate,
  }
}

export type CampaignRow = ReturnType<typeof dbCampaignToRow>

interface FilterParams {
  status?: string
  search?: string
  dateRange?: string
  type?: string
  list?: string
}

async function CampaignsContent({ filters }: { filters: FilterParams }) {
  const supabase = createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('campaigns')
    .select('*')
    .order('send_date', { ascending: false, nullsFirst: false })

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,subject.ilike.%${filters.search}%`
    )
  }

  if (filters.dateRange) {
    // parseInt stops at non-numeric chars so '30d' → 30
    const days = parseInt(filters.dateRange, 10)
    if (!isNaN(days) && days > 0) {
      const from = new Date()
      from.setDate(from.getDate() - days)
      query = query.gte('send_date', from.toISOString())
    }
  }

  if (filters.type) {
    query = query.eq('type', filters.type)
  }

  if (filters.list) {
    query = query.ilike('list_name', `%${filters.list}%`)
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
            {Object.values(filters).some(Boolean) ? 'Try a different filter, or use' : 'Use'} the{' '}
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
  searchParams: {
    status?: string
    search?: string
    dateRange?: string
    type?: string
    list?: string
  }
}

export default async function CampaignsPage({ searchParams }: CampaignsPageProps) {
  const filters: FilterParams = {
    status: searchParams.status,
    search: searchParams.search,
    dateRange: searchParams.dateRange,
    type: searchParams.type,
    list: searchParams.list,
  }

  // Fetch distinct list names for the list-filter dropdown.
  // Gracefully handles missing list_name column (migration not yet applied).
  const supabase = createClient()
  const { data: listData } = await supabase
    .from('campaigns')
    .select('list_name')
    .not('list_name', 'is', null)

  const rawListNames = (listData ?? []).flatMap((r: { list_name: string | null }) =>
    (r.list_name ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  )
  const listNames = Array.from(new Set(rawListNames)).sort()

  return (
    <div>
      <Header title="Campaigns" subtitle="Synced from ActiveCampaign" />

      <div className="px-6 py-6 space-y-4">
        <Suspense fallback={<div className="h-9 w-64 bg-gray-100 rounded-lg animate-pulse" />}>
          <CampaignFilters listNames={listNames} />
        </Suspense>

        <Suspense fallback={
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <SkeletonTable rows={8} cols={9} />
          </div>
        }>
          <CampaignsContent filters={filters} />
        </Suspense>
      </div>
    </div>
  )
}
