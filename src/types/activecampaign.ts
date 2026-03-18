// ============================================================
// ActiveCampaign API response types
// All numeric fields come back as strings from the AC API.
// ============================================================

export type ACCampaignStatus = '0' | '1' | '3' | '4' | '5' | '6'

/**
 * Raw campaign object from GET /api/3/campaigns or /api/3/campaigns/{id}
 */
export interface ACCampaign {
  id: string
  name: string
  type: string              // 'single' | 'recurring' | 'split' | 'automation' | 'activerss' | 'text'
  status: ACCampaignStatus  // '0'=draft, '1'=scheduled, '3'=paused, '4'=sending, '5'=sent, '6'=sending
  cdate: string             // created date ISO
  mdate: string             // modified date ISO
  sdate: string | null      // send date ISO
  ldate: string | null      // last-sent date
  subject: string
  fromname: string
  fromemail: string
  send_amt: string          // total recipients
  total_amt: string         // includes resends
  opens: string
  unique_opens: string
  linkclicks: string
  uniquelinkclicks: string
  subscriberclicks: string
  forwards: string
  hardbounces: string
  softbounces: string
  unsubscribes: string
  unsubreasons: string
  updates: string
  socialshares: string
  replies: string
  uniquereplies: string
}

/**
 * Pagination meta returned by list endpoints
 */
export interface ACMeta {
  total: string
  start: number
  limit: number
}

/**
 * Response from GET /api/3/campaigns
 */
export interface ACCampaignsResponse {
  campaigns: ACCampaign[]
  meta: ACMeta
}

/**
 * Response from GET /api/3/campaigns/{id}
 */
export interface ACCampaignResponse {
  campaign: ACCampaign
}

/**
 * Raw contact object from GET /api/3/contacts
 */
export interface ACContact {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  orgname: string
  cdate: string
  udate: string
  edate: string | null  // email changed date
  deleted: string       // '0' or '1'
  anonymized: string    // '0' or '1'
  adate: string | null  // subscribed date
  gravatar: string
  fieldValues?: ACContactFieldValue[]
}

export interface ACContactFieldValue {
  contact: string
  field: string
  value: string
  cdate: string
  udate: string
  created_timestamp: string
  updated_timestamp: string
  created_by: string
  updated_by: string
  id: string
}

export interface ACContactsResponse {
  contacts: ACContact[]
  meta: ACMeta
}

// ============================================================
// Normalized types used throughout the dashboard
// ============================================================

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'paused' | 'sent'

export const AC_STATUS_MAP: Record<ACCampaignStatus, CampaignStatus> = {
  '0': 'draft',
  '1': 'scheduled',
  '3': 'paused',
  '4': 'sending',
  '5': 'sent',
  '6': 'sending',
}

/**
 * Normalized campaign used in dashboard UI (all numbers parsed)
 */
export interface NormalizedCampaign {
  id: string
  name: string
  subject: string
  fromName: string
  fromEmail: string
  status: CampaignStatus
  type: string
  sendDate: string | null
  createdDate: string
  totalSent: number
  totalOpens: number
  uniqueOpens: number
  totalClicks: number
  uniqueClicks: number
  bounces: number
  unsubscribes: number
  forwards: number
  openRate: number    // 0–1
  clickRate: number   // 0–1
  bounceRate: number  // 0–1
}

export function normalizeACCampaign(ac: ACCampaign): NormalizedCampaign {
  const totalSent = parseInt(ac.send_amt, 10) || 0
  const uniqueOpens = parseInt(ac.unique_opens, 10) || 0
  const uniqueClicks = parseInt(ac.uniquelinkclicks, 10) || 0
  const bounces =
    (parseInt(ac.hardbounces, 10) || 0) + (parseInt(ac.softbounces, 10) || 0)
  const unsubscribes = parseInt(ac.unsubscribes, 10) || 0

  return {
    id: ac.id,
    name: ac.name,
    subject: ac.subject,
    fromName: ac.fromname,
    fromEmail: ac.fromemail,
    status: AC_STATUS_MAP[ac.status] ?? 'draft',
    type: ac.type,
    sendDate: ac.sdate,
    createdDate: ac.cdate,
    totalSent,
    totalOpens: parseInt(ac.opens, 10) || 0,
    uniqueOpens,
    totalClicks: parseInt(ac.linkclicks, 10) || 0,
    uniqueClicks,
    bounces,
    unsubscribes,
    forwards: parseInt(ac.forwards, 10) || 0,
    openRate: totalSent > 0 ? uniqueOpens / totalSent : 0,
    clickRate: totalSent > 0 ? uniqueClicks / totalSent : 0,
    bounceRate: totalSent > 0 ? bounces / totalSent : 0,
  }
}
