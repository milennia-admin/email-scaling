'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Sent', value: 'sent' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Draft', value: 'draft' },
] as const

export default function CampaignFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = searchParams.get('status') ?? 'all'

  function setFilter(value: string) {
    const params = new URLSearchParams()
    if (value !== 'all') params.set('status', value)
    const qs = params.toString()
    router.push(`/dashboard/campaigns${qs ? `?${qs}` : ''}`)
  }

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
      {FILTERS.map((filter) => (
        <button
          key={filter.value}
          onClick={() => setFilter(filter.value)}
          className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
            current === filter.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}
