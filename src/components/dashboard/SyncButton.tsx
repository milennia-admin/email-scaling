'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const AUTO_SYNC_INTERVAL = 5 * 60 * 1000 // 5 minutes

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

interface SyncButtonProps {
  lastSyncAt?: string | null
}

export default function SyncButton({ lastSyncAt }: SyncButtonProps) {
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState(lastSyncAt ?? null)
  const [error, setError] = useState<string | null>(null)
  const [, setTick] = useState(0)

  // Re-render every minute so relative time stays fresh
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const sync = useCallback(async () => {
    if (syncing) return
    setSyncing(true)
    setError(null)
    try {
      const res = await fetch('/api/sync/activecampaign', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Sync failed')
      setLastSynced(json.data?.completedAt ?? new Date().toISOString())
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }, [syncing, router])

  // Auto-sync every 5 minutes
  useEffect(() => {
    const id = setInterval(sync, AUTO_SYNC_INTERVAL)
    return () => clearInterval(id)
  }, [sync])

  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-xs text-red-600">{error}</span>}
      {lastSynced && !error && (
        <span className="text-xs text-gray-500">Synced {formatRelativeTime(lastSynced)}</span>
      )}
      <button
        onClick={sync}
        disabled={syncing}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        <svg
          className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        {syncing ? 'Syncing…' : 'Sync now'}
      </button>
    </div>
  )
}
