import Header from '@/components/dashboard/Header'

export default function ContactsPage() {
  return (
    <div>
      <Header
        title="Contacts"
        subtitle="Unified contact profiles across all data sources"
      />
      <div className="px-6 py-12 flex flex-col items-center justify-center text-center">
        <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <svg
            className="h-7 w-7 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
            />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-gray-900">
          Contacts — Phase 2
        </h2>
        <p className="mt-2 text-sm text-gray-500 max-w-sm">
          Unified contact profiles with email engagement history, tags, and
          pipeline status will be available after the sync integration is
          complete.
        </p>
        <p className="mt-4 text-xs text-gray-400">
          Run{' '}
          <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">
            POST /api/sync/activecampaign
          </code>{' '}
          to start importing contacts.
        </p>
      </div>
    </div>
  )
}
