import Link from 'next/link'
import type { CampaignStatus } from '@/types/activecampaign'
import type { CampaignRow } from '@/app/dashboard/campaigns/page'

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

function formatRate(rate: number | null | undefined): string {
  if (rate === null || rate === undefined || rate === 0) return '—'
  return `${(rate * 100).toFixed(1)}%`
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
            <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Sent
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Open Rate
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Click Rate
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Unsubs
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {campaigns.map((campaign) => (
            <tr
              key={campaign.id}
              className="hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <td className="px-6 py-4">
                <Link href={`/dashboard/campaigns/${campaign.id}`} className="block">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-xs hover:text-indigo-600 transition-colors">
                    {campaign.name}
                  </p>
                  {campaign.subject && (
                    <p className="text-xs text-gray-400 truncate max-w-xs mt-0.5">
                      {campaign.subject}
                    </p>
                  )}
                  {campaign.listName && (
                    <p className="text-xs text-gray-400 truncate max-w-xs mt-0.5">
                      → {campaign.listName}
                    </p>
                  )}
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Link href={`/dashboard/campaigns/${campaign.id}`}>
                  <StatusBadge status={campaign.status} />
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Link href={`/dashboard/campaigns/${campaign.id}`} className="text-sm text-gray-600">
                  {formatDate(campaign.sendDate)}
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <Link href={`/dashboard/campaigns/${campaign.id}`} className="text-sm text-gray-900 font-medium tabular-nums">
                  {campaign.totalSent > 0 ? campaign.totalSent.toLocaleString() : '—'}
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <Link href={`/dashboard/campaigns/${campaign.id}`} className="text-sm text-gray-900 tabular-nums">
                  {formatRate(campaign.openRate)}
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <Link href={`/dashboard/campaigns/${campaign.id}`} className="text-sm text-gray-900 tabular-nums">
                  {formatRate(campaign.clickRate)}
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <Link href={`/dashboard/campaigns/${campaign.id}`} className="text-sm text-gray-900 tabular-nums">
                  {campaign.unsubscribes > 0 ? campaign.unsubscribes.toLocaleString() : '—'}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
