import Link from 'next/link'
import type { CampaignStatus } from '@/types/activecampaign'
import type { CampaignRow } from '@/app/dashboard/campaigns/page'

const TYPE_LABELS: Record<string, string> = {
  single: 'Single',
  automation: 'Auto',
  recurring: 'Recurring',
  split: 'Split',
  activerss: 'RSS',
  text: 'Text',
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  const styles: Record<CampaignStatus, string> = {
    sent: 'bg-green-50 text-green-700 ring-green-600/20',
    scheduled: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    draft: 'bg-gray-50 text-gray-600 ring-gray-500/10',
    sending: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
    paused: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[status]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Show a rate as percentage.
 * - If totalSent === 0 (not sent yet): show '—'
 * - If totalSent > 0: always show a number, even 0.0%
 */
function formatRate(rate: number | null | undefined, totalSent: number): string {
  if (!totalSent) return '—'
  return `${((rate ?? 0) * 100).toFixed(1)}%`
}

/**
 * Show a count.
 * - If totalSent === 0: show '—'
 * - If totalSent > 0: show the number (including 0)
 */
function formatCount(count: number, totalSent: number): string {
  if (!totalSent) return '—'
  return count.toLocaleString()
}

interface CampaignTableProps {
  campaigns: CampaignRow[]
}

export default function CampaignTable({ campaigns }: CampaignTableProps) {
  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <svg className="h-10 w-10 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
        </svg>
        <p className="text-sm font-medium">No campaigns found</p>
        <p className="text-xs mt-1">Try changing the filter above</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-2/5">
              Campaign
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Send Date
            </th>
            <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Sent
            </th>
            <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Open Rate
            </th>
            <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Click Rate
            </th>
            <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Bounce Rate
            </th>
            <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Unsub Rate
            </th>
            <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Unsubs
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {campaigns.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
              <td className="px-6 py-4">
                <Link href={`/dashboard/campaigns/${c.id}`} className="block">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-xs hover:text-indigo-600 transition-colors">
                    {c.name}
                  </p>
                  {c.subject && (
                    <p className="text-xs text-gray-400 truncate max-w-xs mt-0.5">{c.subject}</p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    {c.listName && (
                      <p className="text-xs text-gray-400 truncate max-w-xs">→ {c.listName}</p>
                    )}
                    {c.type && TYPE_LABELS[c.type] && (
                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">
                        {TYPE_LABELS[c.type]}
                      </span>
                    )}
                  </div>
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Link href={`/dashboard/campaigns/${c.id}`}>
                  <StatusBadge status={c.status} />
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Link href={`/dashboard/campaigns/${c.id}`} className="text-sm text-gray-600">
                  {formatDate(c.sendDate)}
                </Link>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right">
                <Link href={`/dashboard/campaigns/${c.id}`} className="text-sm text-gray-900 font-medium tabular-nums">
                  {c.totalSent > 0 ? c.totalSent.toLocaleString() : '—'}
                </Link>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right">
                <Link href={`/dashboard/campaigns/${c.id}`} className="text-sm tabular-nums text-gray-900">
                  {formatRate(c.openRate, c.totalSent)}
                </Link>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right">
                <Link href={`/dashboard/campaigns/${c.id}`} className="text-sm tabular-nums text-gray-900">
                  {formatRate(c.clickRate, c.totalSent)}
                </Link>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right">
                <Link href={`/dashboard/campaigns/${c.id}`} className="text-sm tabular-nums text-gray-900">
                  {formatRate(c.bounceRate, c.totalSent)}
                </Link>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right">
                <Link href={`/dashboard/campaigns/${c.id}`} className="text-sm tabular-nums text-gray-900">
                  {formatRate(c.unsubscribeRate, c.totalSent)}
                </Link>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right">
                <Link href={`/dashboard/campaigns/${c.id}`} className="text-sm tabular-nums text-gray-900">
                  {formatCount(c.unsubscribes, c.totalSent)}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
