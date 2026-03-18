import Header from '@/components/dashboard/Header'

export default function AnalyticsPage() {
  return (
    <div>
      <Header
        title="Analytics"
        subtitle="Cross-channel reporting and performance insights"
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
              d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
            />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-gray-900">
          Analytics — Phase 4
        </h2>
        <p className="mt-2 text-sm text-gray-500 max-w-sm">
          Unified cross-channel analytics combining email performance, pipeline
          conversion rates, ad spend ROI, and Monday.com project completion
          metrics.
        </p>
        <div className="mt-4 flex flex-col gap-1.5 text-xs text-gray-400">
          <p>Planned views: Cohort analysis, funnel conversion, revenue trends</p>
          <p>Data sources: All 4 integrations required</p>
        </div>
      </div>
    </div>
  )
}
