import type {
  ACCampaign,
  ACCampaignsResponse,
  ACCampaignResponse,
  ACCampaignStatistics,
  ACCampaignStatisticsResponse,
  ACContactsResponse,
  ACContact,
  ACList,
  ACListsResponse,
  ACTagDefinition,
  ACTagsResponse,
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

interface AcFetchOptions extends RequestInit {
  next?: { revalidate?: number }
}

async function acFetch<T>(
  path: string,
  searchParams?: Record<string, string>,
  options?: AcFetchOptions
): Promise<T> {
  const { url, key } = getCredentials()
  const endpoint = new URL(`${url}/api/3${path}`)

  if (searchParams) {
    Object.entries(searchParams).forEach(([k, v]) =>
      endpoint.searchParams.set(k, v)
    )
  }

  const res = await fetch(endpoint.toString(), {
    // Default 5-minute cache; callers can override with { next: { revalidate: 0 } }
    next: { revalidate: 300 },
    ...options,
    headers: {
      'Api-Token': key,
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string> ?? {}),
    },
  })

  if (!res.ok) {
    throw new Error(
      `ActiveCampaign API error: ${res.status} ${res.statusText} — ${path}`
    )
  }

  return res.json() as Promise<T>
}

/** Fetch options that bypass the Next.js cache (for use in sync routes) */
const NO_CACHE: AcFetchOptions = { next: { revalidate: 0 }, cache: 'no-store' }

// ============================================================
// Campaigns
// ============================================================

/**
 * Fetch a single page of campaigns.
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

  return acFetch<ACCampaignsResponse>('/campaigns', sp, NO_CACHE)
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

/**
 * Fetch per-campaign statistics from GET /api/3/campaigns/{id}/statistics.
 * Falls back gracefully — returns null if the endpoint errors.
 */
export async function fetchCampaignStatistics(
  id: string
): Promise<ACCampaignStatistics | null> {
  try {
    const data = await acFetch<ACCampaignStatisticsResponse>(
      `/campaigns/${id}/statistics`,
      undefined,
      NO_CACHE
    )
    return data.campaign ?? null
  } catch {
    return null
  }
}

// ============================================================
// Lists
// ============================================================

/**
 * Fetch all ActiveCampaign lists (for building list-name lookup maps).
 */
export async function fetchAllLists(): Promise<ACList[]> {
  const limit = 100
  let offset = 0
  const all: ACList[] = []

  while (true) {
    const data = await acFetch<ACListsResponse>(
      '/lists',
      { limit: String(limit), offset: String(offset) },
      NO_CACHE
    )
    all.push(...data.lists)

    const total = parseInt(data.meta.total, 10) || 0
    offset += limit
    if (offset >= total) break
  }

  return all
}

// ============================================================
// Tags
// ============================================================

/**
 * Fetch all tags from ActiveCampaign (tag definitions with names).
 */
export async function fetchAllTags(): Promise<ACTagDefinition[]> {
  const limit = 100
  let offset = 0
  const all: ACTagDefinition[] = []

  while (true) {
    const data = await acFetch<ACTagsResponse>(
      '/tags',
      { limit: String(limit), offset: String(offset) },
      NO_CACHE
    )
    all.push(...data.tags)

    const total = parseInt(data.meta.total, 10) || 0
    offset += limit
    if (offset >= total) break
  }

  return all
}

// ============================================================
// Contacts
// ============================================================

/**
 * Fetch a single page of contacts.
 * Pass include='contactTags' to receive inline tag associations.
 */
export async function fetchContacts(params?: {
  limit?: number
  offset?: number
  include?: string
}): Promise<ACContactsResponse> {
  const sp: Record<string, string> = {
    limit: String(params?.limit ?? 100),
    offset: String(params?.offset ?? 0),
  }
  if (params?.include) sp['include'] = params.include

  return acFetch<ACContactsResponse>('/contacts', sp, NO_CACHE)
}

/**
 * Fetch contacts up to a configurable cap (default 2000).
 * Includes contactTags inline so tags can be synced in the same pass.
 */
export async function fetchContactsBatched(
  maxContacts = 2000
): Promise<ACContactsResponse> {
  const limit = 100
  let offset = 0
  const allContacts: ACContact[] = []
  // Accumulate all contactTags inline associations
  const allContactTagAssociations: ACContactsResponse['contactTags'] = []

  while (allContacts.length < maxContacts) {
    const data = await fetchContacts({ limit, offset, include: 'contactTags' })
    allContacts.push(...data.contacts)
    if (data.contactTags) {
      allContactTagAssociations.push(...data.contactTags)
    }

    const total = Math.min(parseInt(data.meta.total, 10) || 0, maxContacts)
    offset += limit
    if (offset >= total) break
  }

  return {
    contacts: allContacts,
    meta: { total: String(allContacts.length), start: 0, limit: maxContacts },
    contactTags: allContactTagAssociations,
  }
}
