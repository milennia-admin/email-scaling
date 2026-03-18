import { createClient } from '@/lib/supabase/server'
import Header from '@/components/dashboard/Header'
import type { DbSyncLog } from '@/types/database'

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

const COMING_SOON = [
  {
    title: 'Contacts',
    description: 'Unified contact profiles with engagement history from ActiveCampaign and GoHighLevel.',
    href: '/dashboard/contacts',
  },
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
  const [lastSync, campaignCount, contactCount] = await Promise.all([
    getLastSync(supabase),
    getCampaignCount(supabase),
    getContactCount(supabase),
  ])

  return (
    <div>
      <Header
        title="Overview"
        subtitle="Milennia email marketing dashboard"
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
              No sync has run yet. Call{' '}
              <code className="font-mono bg-yellow-100 px-1 rounded">
                POST /api/sync/activecampaign
              </code>{' '}
              to import data from ActiveCampaign.
            </p>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Campaigns synced', value: campaignCount.toLocaleString() },
            { label: 'Contacts synced', value: contactCount.toLocaleString() },
            { label: 'Data sources', value: '1 of 4' },
            { label: 'Active integrations', value: 'ActiveCampaign' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-gray-200 px-5 py-4"
            >
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="mt-1.5 text-2xl font-semibold text-gray-900 tabular-nums">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Coming soon sections */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Coming in future phases
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

        {/* Quick links */}
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick actions</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>
              →{' '}
              <a href="/dashboard/campaigns" className="text-indigo-600 hover:underline">
                View live campaigns
              </a>{' '}
              — pulls directly from ActiveCampaign in real time
            </li>
            <li>
              →{' '}
              <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                POST /api/sync/activecampaign
              </span>{' '}
              — sync campaigns and contacts into Supabase
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
