import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import Header from '@/components/dashboard/Header'
import { createClient } from '@/lib/supabase/server'
import type { DbContact, DbCampaignContactWithCampaign, DbContactTagWithTag, DbContactListWithList } from '@/types/database'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatPct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`
}

const TAG_COLORS = [
  'bg-purple-50 text-purple-700 ring-purple-600/20',
  'bg-blue-50 text-blue-700 ring-blue-600/20',
  'bg-teal-50 text-teal-700 ring-teal-600/20',
  'bg-orange-50 text-orange-700 ring-orange-600/20',
  'bg-pink-50 text-pink-700 ring-pink-600/20',
]

// ─── Content ──────────────────────────────────────────────────────────────────

interface ContactProfileProps {
  id: string
}

async function ContactProfile({ id }: ContactProfileProps) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('contacts')
    .select(`
      *,
      contact_tags(tag_id, tags(id, name)),
      contact_lists(list_id, status, subscribed_at, lists(id, name)),
      campaign_contacts(
        id, opened, clicked, bounced, unsubscribed,
        open_count, click_count, first_opened_at, last_opened_at,
        campaigns(id, external_id, name, subject, send_date)
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return (
      <div className="px-6 py-6">
        <p className="text-sm text-red-600">Error loading contact: {error.message}</p>
      </div>
    )
  }

  if (!data) notFound()

  const contact = data as DbContact & {
    contact_tags: DbContactTagWithTag[]
    contact_lists: DbContactListWithList[]
    campaign_contacts: DbCampaignContactWithCampaign[]
  }

  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.email
  const tags = (contact.contact_tags ?? []).map((ct) => ct.tags).filter(Boolean) as Array<{ id: string; name: string }>
  const lists = (contact.contact_lists ?? []).map((cl) => ({ ...cl, list: cl.lists })).filter((cl) => cl.list)
  const campaignHistory = (contact.campaign_contacts ?? [])
    .filter((cc) => cc.campaigns)
    .sort((a, b) => {
      const aDate = a.campaigns?.send_date ?? ''
      const bDate = b.campaigns?.send_date ?? ''
      return bDate.localeCompare(aDate)
    })

  // Compute engagement summary from campaign_contacts
  const totalCampaigns = campaignHistory.length
  const totalOpens = campaignHistory.reduce((s, cc) => s + cc.open_count, 0)
  const totalClicks = campaignHistory.reduce((s, cc) => s + cc.click_count, 0)
  const openedCount = campaignHistory.filter((cc) => cc.opened).length
  const contactOpenRate = totalCampaigns > 0 ? openedCount / totalCampaigns : 0

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Identity card */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-semibold text-gray-900">{fullName}</h2>
              {contact.is_subscribed ? (
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset bg-green-50 text-green-700 ring-green-600/20">
                  Subscribed
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset bg-red-50 text-red-600 ring-red-600/20">
                  Unsubscribed
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">{contact.email}</p>
            {contact.phone && <p className="mt-0.5 text-sm text-gray-500">{contact.phone}</p>}
            {contact.organization && <p className="mt-0.5 text-sm text-gray-500">{contact.organization}</p>}
          </div>

          <div className="flex gap-6 flex-wrap">
            <div className="text-right">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Lead Score</p>
              <p className="mt-0.5 text-2xl font-semibold text-gray-900 tabular-nums">
                {contact.lead_score}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Lifetime Value</p>
              <p className="mt-0.5 text-2xl font-semibold text-gray-900 tabular-nums">
                {formatCurrency(contact.lifetime_value)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Added</p>
              <p className="mt-0.5 text-sm font-medium text-gray-700">
                {formatDate(contact.created_at)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Tags</h3>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, i) => (
              <span
                key={tag.id}
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset ${TAG_COLORS[i % TAG_COLORS.length]}`}
              >
                {tag.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No tags assigned</p>
        )}
      </div>

      {/* List memberships */}
      {lists.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">List memberships</h3>
          <div className="space-y-2">
            {lists.map((cl) => (
              <div key={cl.list_id} className="flex items-center justify-between">
                <span className="text-sm text-gray-900">{cl.list?.name}</span>
                <div className="flex items-center gap-3">
                  {cl.subscribed_at && (
                    <span className="text-xs text-gray-400">
                      Since {formatDate(cl.subscribed_at)}
                    </span>
                  )}
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                    cl.status === 'active'
                      ? 'bg-green-50 text-green-700 ring-green-600/20'
                      : cl.status === 'unsubscribed'
                      ? 'bg-red-50 text-red-600 ring-red-600/20'
                      : 'bg-gray-50 text-gray-600 ring-gray-500/10'
                  }`}>
                    {cl.status ?? 'unknown'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Engagement summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Campaigns received', value: totalCampaigns > 0 ? totalCampaigns.toLocaleString() : '—' },
          { label: 'Total opens', value: totalOpens > 0 ? totalOpens.toLocaleString() : '—' },
          { label: 'Total clicks', value: totalClicks > 0 ? totalClicks.toLocaleString() : '—' },
          { label: 'Personal open rate', value: totalCampaigns > 0 ? formatPct(contactOpenRate) : '—' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
            <p className="mt-1.5 text-2xl font-semibold text-gray-900 tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Campaign history */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Campaign history</h3>
        </div>
        {campaignHistory.length > 0 ? (
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
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Opened
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Clicked
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Unsubscribed
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {campaignHistory.map((cc) => (
                  <tr key={cc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      {cc.campaigns?.external_id ? (
                        <Link
                          href={`/dashboard/campaigns/${cc.campaigns.external_id}`}
                          className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors truncate block max-w-xs"
                        >
                          {cc.campaigns.name}
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-900">{cc.campaigns?.name ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDateTime(cc.campaigns?.send_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <EngagementIcon value={cc.opened} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <EngagementIcon value={cc.clicked} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <EngagementIcon value={cc.unsubscribed} negative />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <svg className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
            <p className="text-sm font-medium">No campaign history yet</p>
            <p className="text-xs mt-1">Campaign engagement data will appear here after per-contact sync is set up.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function EngagementIcon({ value, negative }: { value: boolean; negative?: boolean }) {
  if (value) {
    return (
      <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full ${negative ? 'bg-red-100' : 'bg-green-100'} mx-auto`}>
        <svg className={`h-3.5 w-3.5 ${negative ? 'text-red-600' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 mx-auto">
      <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>
    </span>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  params: { id: string }
}

async function ContactPageHeader({ id }: { id: string }) {
  const supabase = createClient()
  const { data } = await supabase
    .from('contacts')
    .select('email, first_name, last_name')
    .eq('id', id)
    .maybeSingle()

  const name = data
    ? [data.first_name, data.last_name].filter(Boolean).join(' ') || data.email
    : 'Contact'

  return <Header title={name} subtitle="Contact profile" />
}

export default function ContactDetailPage({ params }: PageProps) {
  return (
    <div>
      <div className="px-6 pt-5 pb-0">
        <Link
          href="/dashboard/contacts"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          All contacts
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="px-6 pb-4 border-b border-gray-200 bg-white animate-pulse">
            <div className="h-6 w-48 bg-gray-200 rounded" />
            <div className="h-4 w-32 bg-gray-100 rounded mt-2" />
          </div>
        }
      >
        <ContactPageHeader id={params.id} />
      </Suspense>

      <Suspense
        fallback={
          <div className="px-6 py-6 space-y-4 animate-pulse">
            <div className="h-28 bg-gray-100 rounded-xl" />
            <div className="h-16 bg-gray-100 rounded-xl" />
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-xl" />
              ))}
            </div>
            <div className="h-48 bg-gray-100 rounded-xl" />
          </div>
        }
      >
        <ContactProfile id={params.id} />
      </Suspense>
    </div>
  )
}
