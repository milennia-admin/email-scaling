import { NextResponse } from 'next/server'

const MIGRATIONS: { id: string; sql: string }[] = [
  {
    id: '002_add_list_name',
    sql: 'ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS list_name TEXT',
  },
]

/**
 * POST /api/admin/migrate
 *
 * Applies pending SQL migrations against the live Supabase database using the
 * Supabase Management API.
 *
 * Requires SUPABASE_MANAGEMENT_TOKEN in the environment (a personal access token
 * generated at https://supabase.com/dashboard/account/tokens).
 *
 * curl -X POST http://localhost:3000/api/admin/migrate
 */
export async function POST() {
  const managementToken = process.env.SUPABASE_MANAGEMENT_TOKEN
  if (!managementToken) {
    return NextResponse.json(
      {
        error:
          'SUPABASE_MANAGEMENT_TOKEN is not set. Generate one at https://supabase.com/dashboard/account/tokens and add it to .env.local',
      },
      { status: 500 }
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_SUPABASE_URL is not set' }, { status: 500 })
  }

  // Extract project ref from URL: https://<ref>.supabase.co
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  const queryUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`

  const results: { id: string; status: 'ok' | 'error'; message?: string }[] = []

  for (const migration of MIGRATIONS) {
    try {
      const res = await fetch(queryUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${managementToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: migration.sql }),
      })

      if (!res.ok) {
        const text = await res.text()
        results.push({ id: migration.id, status: 'error', message: `HTTP ${res.status}: ${text}` })
      } else {
        results.push({ id: migration.id, status: 'ok' })
      }
    } catch (err) {
      results.push({
        id: migration.id,
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const allOk = results.every((r) => r.status === 'ok')
  return NextResponse.json({ results }, { status: allOk ? 200 : 207 })
}
