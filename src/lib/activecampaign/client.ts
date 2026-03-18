import type {
  ACCampaign,
  ACCampaignsResponse,
  ACCampaignResponse,
  ACContactsResponse,
  ACContact,
} from '@/types/activecampaign'

function getCredentials() {
  const url = process.env.ACTIVECAMPAIGN_API_URL
  const key = process.env.ACTIVECAMPAIGN_API_KEY

  if (!url || !key) {
    throw new Error(
      'ActiveCampaign credentials are not configured. ' +
        'Set ACTIVECAMPAIGN_API_URL and ACTIVECAMPAIGN_API_KEY in your environment.'
    )
  }

  return { url: url.replace(/\/$/, ''), key }
}

async function acFetch<T>(
  path: string,
  searchParams?: Record<string, string>,
  options?: RequestInit
): Promise<T> {
  const { url, key } = getCredentials()
  const endpoint = new URL(`${url}/api/3${path}`)

  if (searchParams) {
    Object.entries(searchParams).forEach(([k, v]) =>
      endpoint.searchParams.set(k, v)
    )
  }

  const res = await fetch(endpoint.toString(), {
    ...options,
    headers: {
      'Api-Token': key,
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    // 5-minute cache for read operations on the dashboard
    next: { revalidate: 300 },
  })

  if (!res.ok) {
    throw new Error(
      `ActiveCampaign API error: ${res.status} ${res.statusText} — ${path}`
    )
  }

  return res.json() as Promise<T>
}

// ============================================================
// Campaigns
// ============================================================

/**
 * Fetch a single page of campaigns.
 * AC status filter values: 0=draft, 1=scheduled, 5=sent
 */
export async function fetchCampaigns(params?: {
  limit?: number
  offset?: number
  status?: string
}): Promise<ACCampaignsResponse> {
  const sp: Record<string, string> = {
    limit: String(params?.limit ?? 100),
    offset: String(params?.offset ?? 0),
    orders: 'sdate',
  }
  if (params?.status) sp['filters[status]'] = params.status

  return acFetch<ACCampaignsResponse>('/campaigns', sp)
}

/**
 * Fetch all campaigns across all pages (handles pagination automatically).
 */
export async function fetchAllCampaigns(statusFilter?: string): Promise<ACCampaign[]> {
  const limit = 100
  let offset = 0
  const all: ACCampaign[] = []

  while (true) {
    const data = await fetchCampaigns({
      limit,
      offset,
      status: statusFilter,
    })
    all.push(...data.campaigns)

    const total = parseInt(data.meta.total, 10) || 0
    offset += limit
    if (offset >= total) break
  }

  return all
}

/**
 * Fetch a single campaign by its AC ID.
 */
export async function fetchCampaignById(id: string): Promise<ACCampaign> {
  const data = await acFetch<ACCampaignResponse>(`/campaigns/${id}`)
  return data.campaign
}

// ============================================================
// Contacts
// ============================================================

/**
 * Fetch a single page of contacts.
 */
export async function fetchContacts(params?: {
  limit?: number
  offset?: number
}): Promise<ACContactsResponse> {
  return acFetch<ACContactsResponse>('/contacts', {
    limit: String(params?.limit ?? 100),
    offset: String(params?.offset ?? 0),
  })
}

/**
 * Fetch contacts up to a configurable cap (default 2000).
 * Full backfill can be triggered separately.
 */
export async function fetchContactsBatched(
  maxContacts = 2000
): Promise<ACContact[]> {
  const limit = 100
  let offset = 0
  const all: ACContact[] = []

  while (all.length < maxContacts) {
    const data = await fetchContacts({ limit, offset })
    all.push(...data.contacts)

    const total = Math.min(parseInt(data.meta.total, 10) || 0, maxContacts)
    offset += limit
    if (offset >= total) break
  }

  return all
}
