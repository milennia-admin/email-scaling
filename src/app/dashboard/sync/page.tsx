import { createClient } from '@/lib/supabase/server'
import Header from '@/components/dashboard/Header'
import SyncButton from '@/components/dashboard/SyncButton'
import type { DbSyncLog } from '@/types/database'

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return '—'
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime()
  if (ms < 1000) return `${ms}ms`
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}m ${rem}s`
}

function StatusBadge({ status }: { status: DbSyncLog['status'] }) {
  const styles: Record<DbSyncLog['status'], string> = {
    completed: 'bg-green-50 text-green-700 ring-green-600/20',
    started: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    failed: 'bg-red-50 text-red-600 ring-red-600/20',
  }

  const labels: Record<DbSyncLog['status'], string> = {
    completed: 'Completed',
    started: 'Running',
    failed: 'Failed',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[status]}`}
    >
      {labels[status]}
    </span>
  )
}

async function getSyncLogs(supabase: ReturnType<typeof createClient>): Promise<DbSyncLog[]> {
  const { data } = await supabase
    .from('sync_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(25)

  return (data ?? []) as DbSyncLog[]
}

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

export default async function SyncHistoryPage() {
  const supabase = createClient()
  const [logs, lastSync] = await Promise.all([
    getSyncLogs(supabase),
    getLastSync(supabase),
  ])

  const completedLogs = logs.filter((l) => l.status === 'completed')
  const avgDurationMs =
    completedLogs.length > 0
      ? completedLogs.reduce((sum, l) => {
          if (!l.completed_at) return sum
          return sum + (new Date(l.completed_at).getTime() - new Date(l.started_at).getTime())
        }, 0) / completedLogs.length
      : 0

  const avgDurationStr =
    avgDurationMs > 0
      ? avgDurationMs < 60000
        ? `${Math.round(avgDurationMs / 1000)}s`
        : `${Math.floor(avgDurationMs / 60000)}m ${Math.round((avgDurationMs % 60000) / 1000)}s`
      : '—'

  return (
    <div>
      <Header
        title="Sync History"
        subtitle="ActiveCampaign data sync logs"
        actions={<SyncButton lastSyncAt={lastSync?.completed_at ?? null} />}
      />

      <div className="px-6 py-6 space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total syncs', value: logs.length.toLocaleString() },
            { label: 'Successful', value: completedLogs.length.toLocaleString() },
            {
              label: 'Failed',
              value: logs.filter((l) => l.status === 'failed').length.toLocaleString(),
            },
            { label: 'Avg duration', value: avgDurationStr },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="mt-1.5 text-2xl font-semibold text-gray-900 tabular-nums">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Logs table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Recent sync runs</h2>
          </div>

          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <svg className="h-10 w-10 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <p className="text-sm font-medium">No sync history yet</p>
              <p className="text-xs mt-1">
                Use the <span className="font-medium text-gray-500">Sync now</span> button above to run the first sync.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Started
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Processed
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Upserted
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDateTime(log.started_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={log.status} />
                        {log.error_message && (
                          <p className="mt-1 text-xs text-red-500 max-w-xs truncate" title={log.error_message}>
                            {log.error_message}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                        {log.source_type.replace('activecampaign', 'ActiveCampaign')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 tabular-nums">
                        {log.records_processed > 0 ? log.records_processed.toLocaleString() : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 tabular-nums">
                        {log.records_upserted > 0 ? log.records_upserted.toLocaleString() : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 tabular-nums">
                        {formatDuration(log.started_at, log.completed_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
