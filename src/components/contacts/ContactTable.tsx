import Link from 'next/link'

export interface ContactRow {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  is_subscribed: boolean
  created_at: string
  tags: string[]
  campaignCount: number
  lastEngagedAt: string | null
}

function SubscriptionBadge({ subscribed }: { subscribed: boolean }) {
  return subscribed ? (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset bg-green-50 text-green-700 ring-green-600/20">
      Subscribed
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset bg-red-50 text-red-600 ring-red-600/20">
      Unsubscribed
    </span>
  )
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const TAG_COLORS = [
  'bg-purple-50 text-purple-700 ring-purple-600/20',
  'bg-blue-50 text-blue-700 ring-blue-600/20',
  'bg-teal-50 text-teal-700 ring-teal-600/20',
]

function TagPill({ name, index }: { name: string; index: number }) {
  const color = TAG_COLORS[index % TAG_COLORS.length]
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${color}`}>
      {name}
    </span>
  )
}

interface ContactTableProps {
  contacts: ContactRow[]
}

export default function ContactTable({ contacts }: ContactTableProps) {
  if (contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <svg className="h-10 w-10 mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
        </svg>
        <p className="text-sm font-medium">No contacts found</p>
        <p className="text-xs mt-1">Try adjusting your filters</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Email
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Tags
            </th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Campaigns
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Last Engaged
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Added
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {contacts.map((contact) => {
            const name =
              [contact.first_name, contact.last_name].filter(Boolean).join(' ') || '—'
            const visibleTags = contact.tags.slice(0, 3)
            const extraTags = contact.tags.length - 3

            return (
              <tr
                key={contact.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href={`/dashboard/contacts/${contact.id}`} className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors">
                    {name}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href={`/dashboard/contacts/${contact.id}`} className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
                    {contact.email}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href={`/dashboard/contacts/${contact.id}`}>
                    <SubscriptionBadge subscribed={contact.is_subscribed} />
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <Link href={`/dashboard/contacts/${contact.id}`} className="flex flex-wrap gap-1">
                    {visibleTags.length > 0 ? (
                      <>
                        {visibleTags.map((tag, i) => (
                          <TagPill key={tag} name={tag} index={i} />
                        ))}
                        {extraTags > 0 && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-gray-500 ring-1 ring-inset ring-gray-300">
                            +{extraTags} more
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <Link href={`/dashboard/contacts/${contact.id}`} className="text-sm text-gray-900 tabular-nums">
                    {contact.campaignCount > 0 ? contact.campaignCount : '—'}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href={`/dashboard/contacts/${contact.id}`} className="text-sm text-gray-600">
                    {formatDate(contact.lastEngagedAt)}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href={`/dashboard/contacts/${contact.id}`} className="text-sm text-gray-500">
                    {formatDate(contact.created_at)}
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
