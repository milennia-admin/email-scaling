import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
  fetchAllCampaigns,
  fetchCampaignStatistics,
  fetchAllLists,
  fetchAllTags,
  fetchContactsBatched,
} from '@/lib/activecampaign/client'
import { normalizeACCampaign } from '@/types/activecampaign'
import type { ACContact } from '@/types/activecampaign'

/** 100ms pause between per-campaign stat calls to respect AC rate limits */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * POST /api/sync/activecampaign
 *
 * Fetches campaigns (with per-campaign statistics), contacts, and tags from
 * ActiveCampaign, then upserts everything into Supabase.
 */
export async function POST(request: Request) {
  // ── 1. Auth check ─────────────────────────────────────────────────────────
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // ── 2. Create sync log entry ───────────────────────────────────────────────
  const { data: syncLog, error: logError } = await admin
    .from('sync_logs')
    .insert({
      source_type: 'activecampaign',
      sync_type: 'campaigns_and_contacts',
      status: 'started',
    })
    .select('id')
    .single()

  if (logError || !syncLog) {
    return NextResponse.json({ error: 'Failed to create sync log' }, { status: 500 })
  }

  const syncLogId: string = syncLog.id
  let campaignsProcessed = 0
  let campaignsUpserted = 0
  let contactsProcessed = 0
  let contactsUpserted = 0

  try {
    // ── 3. Fetch all AC lists for list-name lookup ─────────────────────────
    const allLists = await fetchAllLists()
    const listNameMap: Record<string, string> = {}
    for (const list of allLists) {
      listNameMap[list.id] = list.name
    }

    // ── 4. Fetch all AC tags for tag-name lookup ───────────────────────────
    const allTags = await fetchAllTags()
    const tagNameMap: Record<string, string> = {}
    for (const tag of allTags) {
      tagNameMap[tag.id] = tag.tag
    }

    // ── 5. Sync campaigns (initial pass with list data) ────────────────────
    const rawCampaigns = await fetchAllCampaigns()
    campaignsProcessed = rawCampaigns.length

    if (rawCampaigns.length > 0) {
      const campaignRows = rawCampaigns.map((ac) => {
        const n = normalizeACCampaign(ac)
        // Resolve list names from the campaign's lists array
        const listIds: string[] = Array.isArray(ac.lists) ? ac.lists : []
        const listName = listIds
          .map((id) => listNameMap[id])
          .filter(Boolean)
          .join(', ') || null

        return {
          external_id: n.id,
          source_type: 'activecampaign',
          name: n.name,
          subject: n.subject,
          from_name: n.fromName,
          from_email: n.fromEmail,
          status: n.status,
          type: n.type,
          send_date: n.sendDate,
          list_name: listName,
          total_sent: n.totalSent,
          total_opens: n.totalOpens,
          unique_opens: n.uniqueOpens,
          total_clicks: n.totalClicks,
          unique_clicks: n.uniqueClicks,
          bounces: n.bounces,
          unsubscribes: n.unsubscribes,
          forwards: n.forwards,
          open_rate: n.openRate,
          click_rate: n.clickRate,
          bounce_rate: n.bounceRate,
          unsubscribe_rate: n.totalSent > 0 ? n.unsubscribes / n.totalSent : 0,
          raw_data: ac as unknown as Record<string, unknown>,
        }
      })

      for (let i = 0; i < campaignRows.length; i += 50) {
        const batch = campaignRows.slice(i, i + 50)
        const { error } = await admin
          .from('campaigns')
          .upsert(batch, { onConflict: 'external_id' })

        if (error) throw new Error(`Campaign upsert batch failed: ${error.message}`)
        campaignsUpserted += batch.length
      }
    }

    // ── 6. Per-campaign statistics pass (with 100ms rate-limit delay) ──────
    // Fetches fresh stats per campaign from the /statistics endpoint and updates the DB.
    for (const ac of rawCampaigns) {
      await sleep(100)

      const stats = await fetchCampaignStatistics(ac.id)
      if (!stats) continue

      // Build updated stat fields from the statistics response
      const totalSent =
        parseInt((stats.send_amt ?? ac.send_amt) as string, 10) || 0
      const uniqueOpens =
        parseInt((stats.unique_opens ?? ac.unique_opens) as string, 10) || 0
      const totalOpens =
        parseInt((stats.opens ?? ac.opens) as string, 10) || 0
      const totalClicks =
        parseInt((stats.linkclicks ?? ac.linkclicks) as string, 10) || 0
      const uniqueClicks =
        parseInt((stats.uniquelinkclicks ?? ac.uniquelinkclicks) as string, 10) || 0
      const hardbounces =
        parseInt((stats.hardbounces ?? ac.hardbounces) as string, 10) || 0
      const softbounces =
        parseInt((stats.softbounces ?? ac.softbounces) as string, 10) || 0
      const bounces = hardbounces + softbounces
      const unsubscribes =
        parseInt((stats.unsubscribes ?? ac.unsubscribes) as string, 10) || 0
      const forwards =
        parseInt((stats.forwards ?? ac.forwards) as string, 10) || 0

      const openRate = totalSent > 0 ? uniqueOpens / totalSent : 0
      const clickRate = totalSent > 0 ? uniqueClicks / totalSent : 0
      const bounceRate = totalSent > 0 ? bounces / totalSent : 0
      const unsubscribeRate = totalSent > 0 ? unsubscribes / totalSent : 0

      await admin
        .from('campaigns')
        .update({
          total_sent: totalSent,
          total_opens: totalOpens,
          unique_opens: uniqueOpens,
          total_clicks: totalClicks,
          unique_clicks: uniqueClicks,
          bounces,
          unsubscribes,
          forwards,
          open_rate: openRate,
          click_rate: clickRate,
          bounce_rate: bounceRate,
          unsubscribe_rate: unsubscribeRate,
        })
        .eq('external_id', ac.id)
    }

    // ── 7. Sync contacts (with inline contactTags) ─────────────────────────
    const { contacts: rawContacts, contactTags: inlineContactTags = [] } =
      await fetchContactsBatched(2000)
    contactsProcessed = rawContacts.length

    if (rawContacts.length > 0) {
      for (let i = 0; i < rawContacts.length; i += 50) {
        const batch = rawContacts.slice(i, i + 50)

        const contactRows = batch.map((ac: ACContact) => ({
          email: ac.email.toLowerCase().trim(),
          first_name: ac.firstName || null,
          last_name: ac.lastName || null,
          phone: ac.phone || null,
          organization: ac.orgname || null,
          is_subscribed: ac.deleted === '0' && ac.anonymized === '0',
        }))

        const { data: upsertedContacts, error: contactError } = await admin
          .from('contacts')
          .upsert(contactRows, {
            onConflict: 'email',
            ignoreDuplicates: false,
          })
          .select('id, email')

        if (contactError) {
          throw new Error(`Contact upsert batch failed: ${contactError.message}`)
        }

        const emailToId: Record<string, string> = {}
        for (const c of upsertedContacts ?? []) {
          emailToId[c.email] = c.id
        }

        // Build AC contact ID → internal UUID map for tag syncing
        const acIdToEmail: Record<string, string> = {}
        for (const ac of batch) {
          acIdToEmail[ac.id] = ac.email.toLowerCase().trim()
        }

        // Upsert contact_sources
        const sourceRows = batch
          .filter((ac: ACContact) => emailToId[ac.email.toLowerCase().trim()])
          .map((ac: ACContact) => ({
            contact_id: emailToId[ac.email.toLowerCase().trim()],
            source_type: 'activecampaign' as const,
            external_id: ac.id,
            raw_data: ac as unknown as Record<string, unknown>,
            synced_at: new Date().toISOString(),
          }))

        if (sourceRows.length > 0) {
          const { error: sourceError } = await admin
            .from('contact_sources')
            .upsert(sourceRows, { onConflict: 'source_type,external_id' })

          if (sourceError) {
            throw new Error(`Contact source upsert failed: ${sourceError.message}`)
          }
        }

        contactsUpserted += batch.length
      }
    }

    // ── 8. Sync tags and contact_tags from inline contactTags ──────────────
    // Only sync tags that have names in our tag map
    if (inlineContactTags.length > 0 && Object.keys(tagNameMap).length > 0) {
      // Upsert unique tag definitions
      const uniqueTagIds = Array.from(new Set(inlineContactTags.map((ct) => ct.tag)))
      const tagRows = uniqueTagIds
        .filter((id) => tagNameMap[id])
        .map((id) => ({
          name: tagNameMap[id],
          source_type: 'activecampaign' as const,
          external_id: id,
        }))

      if (tagRows.length > 0) {
        await admin
          .from('tags')
          .upsert(tagRows, { onConflict: 'name', ignoreDuplicates: false })
      }

      // Fetch all tags to build external_id → internal UUID map
      const { data: tagRecords } = await admin
        .from('tags')
        .select('id, external_id')
        .eq('source_type', 'activecampaign')
        .not('external_id', 'is', null)

      const acTagIdToDbId: Record<string, string> = {}
      for (const t of tagRecords ?? []) {
        if (t.external_id) acTagIdToDbId[t.external_id] = t.id
      }

      // Fetch contact_sources to build AC contact ID → internal contact UUID map
      const { data: sourceRecords } = await admin
        .from('contact_sources')
        .select('contact_id, external_id')
        .eq('source_type', 'activecampaign')

      const acContactIdToDbId: Record<string, string> = {}
      for (const s of sourceRecords ?? []) {
        acContactIdToDbId[s.external_id] = s.contact_id
      }

      // Upsert contact_tags in batches
      const contactTagRows = inlineContactTags
        .filter(
          (ct) => acContactIdToDbId[ct.contact] && acTagIdToDbId[ct.tag]
        )
        .map((ct) => ({
          contact_id: acContactIdToDbId[ct.contact],
          tag_id: acTagIdToDbId[ct.tag],
        }))

      for (let i = 0; i < contactTagRows.length; i += 100) {
        const batch = contactTagRows.slice(i, i + 100)
        await admin
          .from('contact_tags')
          .upsert(batch, { onConflict: 'contact_id,tag_id', ignoreDuplicates: true })
      }
    }

    // ── 9. Mark sync as completed ──────────────────────────────────────────
    await admin
      .from('sync_logs')
      .update({
        status: 'completed',
        records_processed: campaignsProcessed + contactsProcessed,
        records_upserted: campaignsUpserted + contactsUpserted,
        completed_at: new Date().toISOString(),
      })
      .eq('id', syncLogId)

    return NextResponse.json({
      data: {
        source: 'activecampaign',
        campaigns: { processed: campaignsProcessed, upserted: campaignsUpserted },
        contacts: { processed: contactsProcessed, upserted: contactsUpserted },
        syncLogId,
        completedAt: new Date().toISOString(),
      },
      error: null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'

    await admin
      .from('sync_logs')
      .update({
        status: 'failed',
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', syncLogId)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * GET /api/sync/activecampaign
 * Returns the last 10 sync logs for status monitoring.
 */
export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('sync_logs')
    .select('*')
    .eq('source_type', 'activecampaign')
    .order('started_at', { ascending: false })
    .limit(10)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, error: null })
}
