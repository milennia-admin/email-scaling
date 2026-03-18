import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { fetchAllCampaigns, fetchContactsBatched } from '@/lib/activecampaign/client'
import { normalizeACCampaign } from '@/types/activecampaign'
import type { ACContact } from '@/types/activecampaign'

/**
 * POST /api/sync/activecampaign
 *
 * Fetches campaigns and contacts from ActiveCampaign and upserts them
 * into Supabase. Authentication required. Intended to be called:
 *   - Manually via curl / dashboard action
 *   - By a Vercel Cron job
 *
 * Returns a JSON summary of what was synced.
 */
export async function POST(request: Request) {
  // ── 1. Auth check ─────────────────────────────────────────────────────────
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // ── 2. Admin client (bypasses RLS for writes) ──────────────────────────────
  const admin = createAdminClient()

  // ── 3. Create sync log entry ───────────────────────────────────────────────
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
    return NextResponse.json(
      { error: 'Failed to create sync log' },
      { status: 500 }
    )
  }

  const syncLogId: string = syncLog.id
  let campaignsProcessed = 0
  let campaignsUpserted = 0
  let contactsProcessed = 0
  let contactsUpserted = 0

  try {
    // ── 4. Sync campaigns ────────────────────────────────────────────────────
    const rawCampaigns = await fetchAllCampaigns()
    campaignsProcessed = rawCampaigns.length

    if (rawCampaigns.length > 0) {
      const campaignRows = rawCampaigns.map((ac) => {
        const n = normalizeACCampaign(ac)
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

      // Upsert in batches of 50 to stay within Supabase request limits
      for (let i = 0; i < campaignRows.length; i += 50) {
        const batch = campaignRows.slice(i, i + 50)
        const { error } = await admin
          .from('campaigns')
          .upsert(batch, { onConflict: 'external_id' })

        if (error) {
          throw new Error(`Campaign upsert batch failed: ${error.message}`)
        }
        campaignsUpserted += batch.length
      }
    }

    // ── 5. Sync contacts ─────────────────────────────────────────────────────
    // Fetch up to 2000 contacts; full backfill can be triggered separately
    const rawContacts = await fetchContactsBatched(2000)
    contactsProcessed = rawContacts.length

    if (rawContacts.length > 0) {
      // Upsert contacts and their source records in batches
      for (let i = 0; i < rawContacts.length; i += 50) {
        const batch = rawContacts.slice(i, i + 50)

        // Build contact rows
        const contactRows = batch.map((ac: ACContact) => ({
          email: ac.email.toLowerCase().trim(),
          first_name: ac.firstName || null,
          last_name: ac.lastName || null,
          phone: ac.phone || null,
          organization: ac.orgname || null,
          is_subscribed: ac.deleted === '0' && ac.anonymized === '0',
        }))

        // Upsert contacts (on email conflict, update fields)
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

        // Build a map of email → contact UUID
        const emailToId: Record<string, string> = {}
        for (const c of upsertedContacts ?? []) {
          emailToId[c.email] = c.id
        }

        // Upsert contact_sources (links AC ID → internal contact UUID)
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

    // ── 6. Mark sync as completed ────────────────────────────────────────────
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

    // Mark sync as failed
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
