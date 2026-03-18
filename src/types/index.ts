// Re-export all types from a single entry point
export * from './activecampaign'
export * from './database'

// Generic API response wrapper
export interface ApiSuccess<T> {
  data: T
  error: null
}

export interface ApiError {
  data: null
  error: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// Sync job result
export interface SyncResult {
  source: string
  campaigns: { processed: number; upserted: number }
  contacts: { processed: number; upserted: number }
  syncLogId: string
  completedAt: string
}
