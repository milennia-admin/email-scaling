import Header from '@/components/dashboard/Header'

export default function AttributionPage() {
  return (
    <div>
      <Header
        title="Attribution"
        subtitle="Lead source and revenue attribution via Hyros"
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
              d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v2.25A2.25 2.25 0 0 0 6 10.5Zm0 9.75h2.25A2.25 2.25 0 0 0 10.5 18v-2.25a2.25 2.25 0 0 0-2.25-2.25H6a2.25 2.25 0 0 0-2.25 2.25V18A2.25 2.25 0 0 0 6 20.25Zm9.75-9.75H18a2.25 2.25 0 0 0 2.25-2.25V6A2.25 2.25 0 0 0 18 3.75h-2.25A2.25 2.25 0 0 0 13.5 6v2.25a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-gray-900">
          Attribution — Phase 3
        </h2>
        <p className="mt-2 text-sm text-gray-500 max-w-sm">
          Ad attribution data from Hyros, including lead source, ad campaign
          performance, and revenue attribution per contact will be integrated
          here.
        </p>
        <div className="mt-4 flex flex-col gap-1.5 text-xs text-gray-400">
          <p>Planned integrations: Hyros, GoHighLevel</p>
          <p>Metrics: Cost per lead, ROAS, lifetime value by source</p>
        </div>
      </div>
    </div>
  )
}
