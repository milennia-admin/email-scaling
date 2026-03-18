'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useTransition, useRef, useEffect } from 'react'
import type { DbTag } from '@/types/database'

interface ContactFiltersProps {
  tags: Pick<DbTag, 'id' | 'name'>[]
}

const DATE_RANGES = [
  { label: 'All time', value: '' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'Last year', value: '365d' },
] as const

const SORT_OPTIONS = [
  { label: 'Newest first', value: '' },
  { label: 'Oldest first', value: 'oldest' },
  { label: 'Email A–Z', value: 'email' },
  { label: 'Most campaigns', value: 'campaigns' },
] as const

const SELECT_CLS =
  'h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

export default function ContactFilters({ tags }: ContactFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentSearch = searchParams.get('search') ?? ''
  const currentStatus = searchParams.get('status') ?? ''
  const currentTag = searchParams.get('tag') ?? ''
  const currentDateRange = searchParams.get('dateRange') ?? ''
  const currentSort = searchParams.get('sort') ?? ''

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page')
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [router, pathname, searchParams]
  )

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => updateParam('search', value), 300)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const statusOptions = [
    { value: '', label: 'All' },
    { value: 'subscribed', label: 'Subscribed' },
    { value: 'unsubscribed', label: 'Unsubscribed' },
  ]

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
          placeholder="Search name or email…"
          defaultValue={currentSearch}
          onChange={handleSearch}
          className="h-9 w-64 rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Subscription status */}
      <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => updateParam('status', opt.value)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              currentStatus === opt.value
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Tag filter */}
      {tags.length > 0 && (
        <select
          value={currentTag}
          onChange={(e) => updateParam('tag', e.target.value)}
          className={SELECT_CLS}
        >
          <option value="">All tags</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>{tag.name}</option>
          ))}
        </select>
      )}

      {/* Date added range */}
      <select
        value={currentDateRange}
        onChange={(e) => updateParam('dateRange', e.target.value)}
        className={SELECT_CLS}
      >
        {DATE_RANGES.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>

      {/* Sort */}
      <select
        value={currentSort}
        onChange={(e) => updateParam('sort', e.target.value)}
        className={SELECT_CLS}
      >
        {SORT_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      {isPending && (
        <div className="h-4 w-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      )}
    </div>
  )
}
