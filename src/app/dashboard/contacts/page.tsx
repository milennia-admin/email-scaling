import { Suspense } from 'react'
import Header from '@/components/dashboard/Header'
import ContactTable from '@/components/contacts/ContactTable'
import ContactFilters from '@/components/contacts/ContactFilters'
import SkeletonTable from '@/components/ui/SkeletonTable'
import { createClient } from '@/lib/supabase/server'
import type { DbTag } from '@/types/database'
import type { ContactRow } from '@/components/contacts/ContactTable'

const PAGE_SIZE = 50

interface ContactsPageProps {
  searchParams: {
    search?: string
    status?: string
    tag?: string
    dateRange?: string
    sort?: string
    page?: string
  }
}

async function ContactsContent({
  search,
  status,
  tagId,
  dateRange,
  sort,
  page,
}: {
  search: string
  status: string
  tagId: string
  dateRange: string
  sort: string
  page: number
}) {
  const supabase = createClient()
  const offset = (page - 1) * PAGE_SIZE

  // If filtering by tag, first resolve the contact IDs with that tag
  let tagContactIds: string[] | null = null
  if (tagId) {
    const { data: taggedRows } = await supabase
      .from('contact_tags')
      .select('contact_id')
      .eq('tag_id', tagId)
    tagContactIds = (taggedRows ?? []).map((r: { contact_id: string }) => r.contact_id)
  }

  // Build main query — select contacts + tags + campaign engagement
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('contacts')
    .select(
      `id, email, first_name, last_name, is_subscribed, created_at,
       contact_tags(tags(id, name)),
       campaign_contacts(id, last_opened_at)`,
      { count: 'exact' }
    )

  if (search) {
    query = query.or(
      `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
    )
  }

  if (status === 'subscribed') query = query.eq('is_subscribed', true)
  else if (status === 'unsubscribed') query = query.eq('is_subscribed', false)

  if (dateRange) {
    const days = parseInt(dateRange, 10)
    if (!isNaN(days) && days > 0) {
      const from = new Date()
      from.setDate(from.getDate() - days)
      query = query.gte('created_at', from.toISOString())
    }
  }

  if (tagContactIds !== null) {
    if (tagContactIds.length === 0) {
      return <EmptyState filtered />
    }
    query = query.in('id', tagContactIds)
  }

  // Sort — 'campaigns' sorts client-side after fetch (join count not easily sortable server-side)
  if (sort === 'oldest') {
    query = query.order('created_at', { ascending: true })
  } else if (sort === 'email') {
    query = query.order('email', { ascending: true })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data, count, error } = await query
    .range(offset, offset + PAGE_SIZE - 1)

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl px-6 py-4">
        <p className="text-sm text-red-600">Error loading contacts: {error.message}</p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return <EmptyState filtered={!!(search || status || tagId)} />
  }

  // Shape data into ContactRow[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let contacts: ContactRow[] = (data as any[]).map((c) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tagNames: string[] = (c.contact_tags ?? []).map((ct: any) => ct.tags?.name).filter(Boolean)
    const campaignCount: number = (c.campaign_contacts ?? []).length
    const lastEngagedAt: string | null =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (c.campaign_contacts ?? []).map((cc: any) => cc.last_opened_at).filter(Boolean).sort().reverse()[0] ?? null

    return {
      id: c.id,
      email: c.email,
      first_name: c.first_name,
      last_name: c.last_name,
      is_subscribed: c.is_subscribed,
      created_at: c.created_at,
      tags: tagNames,
      campaignCount,
      lastEngagedAt,
    }
  })

  // 'Most campaigns' sort is applied client-side since it's derived from the join count
  if (sort === 'campaigns') {
    contacts = contacts.sort((a, b) => b.campaignCount - a.campaignCount)
  }

  const total = count ?? 0
  const startItem = offset + 1
  const endItem = Math.min(offset + contacts.length, total)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-500">
          Showing {startItem.toLocaleString()}–{endItem.toLocaleString()} of{' '}
          {total.toLocaleString()} contacts
        </p>
        {totalPages > 1 && <Pagination page={page} totalPages={totalPages} search={search} status={status} tagId={tagId} dateRange={dateRange} sort={sort} />}
      </div>
      <ContactTable contacts={contacts} />
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <Pagination page={page} totalPages={totalPages} search={search} status={status} tagId={tagId} dateRange={dateRange} sort={sort} />
        </div>
      )}
    </div>
  )
}

function EmptyState({ filtered }: { filtered?: boolean }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <svg className="h-10 w-10 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
        </svg>
        {filtered ? (
          <>
            <p className="text-sm font-medium">No contacts match your filters</p>
            <p className="text-xs mt-1">Try adjusting your search or filter options</p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium">No contacts synced yet</p>
            <p className="text-xs mt-1">
              Use the <span className="font-medium text-gray-500">Sync now</span> button on the overview to import contacts.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function buildPageUrl(page: number, search: string, status: string, tagId: string, dateRange: string, sort: string) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (status) params.set('status', status)
  if (tagId) params.set('tag', tagId)
  if (dateRange) params.set('dateRange', dateRange)
  if (sort) params.set('sort', sort)
  if (page > 1) params.set('page', String(page))
  const qs = params.toString()
  return `/dashboard/contacts${qs ? `?${qs}` : ''}`
}

function Pagination({
  page,
  totalPages,
  search,
  status,
  tagId,
  dateRange,
  sort,
}: {
  page: number
  totalPages: number
  search: string
  status: string
  tagId: string
  dateRange: string
  sort: string
}) {
  return (
    <div className="flex items-center gap-2">
      {page > 1 ? (
        <a
          href={buildPageUrl(page - 1, search, status, tagId, dateRange, sort)}
          className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Previous
        </a>
      ) : (
        <span className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-300 cursor-not-allowed">
          Previous
        </span>
      )}
      <span className="text-sm text-gray-500 tabular-nums">
        {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <a
          href={buildPageUrl(page + 1, search, status, tagId, dateRange, sort)}
          className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Next
        </a>
      ) : (
        <span className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-300 cursor-not-allowed">
          Next
        </span>
      )}
    </div>
  )
}

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const search = searchParams.search ?? ''
  const status = searchParams.status ?? ''
  const tagId = searchParams.tag ?? ''
  const dateRange = searchParams.dateRange ?? ''
  const sort = searchParams.sort ?? ''
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))

  const supabase = createClient()
  const { data: allTags } = await supabase
    .from('tags')
    .select('id, name')
    .order('name')

  return (
    <div>
      <Header title="Contacts" subtitle="Synced from ActiveCampaign" />

      <div className="px-6 py-6 space-y-4">
        <Suspense fallback={<div className="h-9 w-80 bg-gray-100 rounded-lg animate-pulse" />}>
          <ContactFilters tags={(allTags as Pick<DbTag, 'id' | 'name'>[]) ?? []} />
        </Suspense>

        <Suspense
          fallback={
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <SkeletonTable rows={12} cols={7} />
            </div>
          }
        >
          <ContactsContent search={search} status={status} tagId={tagId} dateRange={dateRange} sort={sort} page={page} />
        </Suspense>
      </div>
    </div>
  )
}
