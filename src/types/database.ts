// ============================================================
// TypeScript types mirroring the Supabase database schema
// ============================================================

export interface DbContact {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  organization: string | null
  title: string | null
  lifetime_value: number
  lead_score: number
  is_subscribed: boolean
  unsubscribed_at: string | null
  created_at: string
  updated_at: string
}

export interface DbContactSource {
  id: string
  contact_id: string
  source_type: 'activecampaign' | 'gohighlevel' | 'hyros' | 'monday'
  external_id: string
  raw_data: Record<string, unknown> | null
  synced_at: string
}

export interface DbTag {
  id: string
  name: string
  source_type: 'activecampaign' | 'gohighlevel' | 'manual' | null
  external_id: string | null
  created_at: string
}

export interface DbList {
  id: string
  external_id: string
  source_type: string
  name: string
  subscriber_count: number
  created_at: string
  updated_at: string
}

export interface DbCampaign {
  id: string
  external_id: string
  source_type: string
  name: string
  subject: string | null
  from_name: string | null
  from_email: string | null
  status: 'draft' | 'scheduled' | 'sending' | 'paused' | 'sent' | null
  type: string | null
  send_date: string | null
  total_sent: number
  total_opens: number
  unique_opens: number
  total_clicks: number
  unique_clicks: number
  bounces: number
  unsubscribes: number
  forwards: number
  open_rate: number | null
  click_rate: number | null
  bounce_rate: number | null
  unsubscribe_rate: number | null
  raw_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface DbSyncLog {
  id: string
  source_type: string
  sync_type: string
  status: 'started' | 'completed' | 'failed'
  records_processed: number
  records_upserted: number
  error_message: string | null
  started_at: string
  completed_at: string | null
}

export interface DbOpportunity {
  id: string
  external_id: string
  contact_id: string | null
  pipeline_id: string | null
  stage_id: string | null
  name: string | null
  status: 'open' | 'won' | 'lost' | 'abandoned' | null
  monetary_value: number | null
  lead_source: string | null
  assigned_to: string | null
  closed_at: string | null
  raw_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface DbAdAttribution {
  id: string
  external_id: string | null
  contact_id: string | null
  lead_source: string | null
  ad_campaign: string | null
  ad_set: string | null
  ad_name: string | null
  click_date: string | null
  conversion_date: string | null
  revenue: number
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  raw_data: Record<string, unknown> | null
  created_at: string
}
