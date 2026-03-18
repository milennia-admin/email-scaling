'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useRef, useTransition } from 'react'

interface CampaignFiltersProps {
  listNames: string[]
}

const STATUS_TABS = [
  { label: 'All', value: 'all' },
  { label: 'Sent', value: 'sent' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Draft', value: 'draft' },
] as const

const DATE_RANGES = [
  { label: 'All time', value: '' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'Last year', value: '365d' },
] as const

const CAMPAIGN_TYPES = [
  { label: 'All types', value: '' },
  { label: 'Single send', value: 'single' },
  { label: 'Automation', value: 'automation' },
  { label: 'Recurring', value: 'recurring' },
  { label: 'Split test', value: 'split' },
  { label: 'RSS', value: 'activerss' },
  { label: 'Text', value: 'text' },
] as const

const SELECT_CLS =
  'h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

export default function CampaignFilters({ listNames }: CampaignFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentStatus = searchParams.get('status') ?? 'all'
  const currentSearch = searchParams.get('search') ?? ''
  const currentDateRange = searchParams.get('dateRange') ?? ''
  const currentType = searchParams.get('type') ?? ''
  const currentList = searchParams.get('list') ?? ''

  function update(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, val] of Object.entries(updates)) {
      if (val && val !== 'all') {
        params.set(key, val)
      } else {
        params.delete(key)
      }
    }
    startTransition(() => {
      router.push(`/dashboard/campaigns?${params.toString()}`)
    })
  }

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => update({ search: value }), 300)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
          fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          type="search"
          placeholder="Search campaigns…"
          defaultValue={currentSearch}
          onChange={handleSearch}
          className="h-9 w-56 rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => update({ status: tab.value })}
            className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
              currentStatus === tab.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date range */}
      <select
        value={currentDateRange}
        onChange={(e) => update({ dateRange: e.target.value })}
        className={SELECT_CLS}
      >
        {DATE_RANGES.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>

      {/* Campaign type */}
      <select
        value={currentType}
        onChange={(e) => update({ type: e.target.value })}
        className={SELECT_CLS}
      >
        {CAMPAIGN_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {/* List name — only shown if list data is available */}
      {listNames.length > 0 && (
        <select
          value={currentList}
          onChange={(e) => update({ list: e.target.value })}
          className={SELECT_CLS}
        >
          <option value="">All lists</option>
          {listNames.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      )}

      {isPending && (
        <div className="h-4 w-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      )}
    </div>
  )
}
