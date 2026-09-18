import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
    buildEnvReport,
    fetchStatus,
    presence,
    redactDbUrl,
    timed,
} from '@/lib/system-health'

export const dynamic = 'force-dynamic'

// §16 deployment row: production readiness audit. Fail-closed: without a
// HEALTHCHECK_KEY configured, or without the matching header, the endpoint
// behaves like a missing route.
export async function GET(request: NextRequest) {
    const expected = process.env.HEALTHCHECK_KEY
    const provided = request.headers.get('x-health-key')
    if (!expected || !provided || provided !== expected) {
        return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    }

    const envReport = buildEnvReport(process.env)

    const ping = await timed(async () => {
        const rows = await db.$queryRaw<{ one: number }[]>`SELECT 1 as one`
        return rows[0]?.one === 1
    })

    let adminCount: number | null = null
    let adminError: string | null = null
    let migrations: { name: string; finishedAt: string | null }[] | null = null
    let migrationError: string | null = null
    let databaseUrl: string | null = null

    if (ping.ok) {
        databaseUrl = redactDbUrl(process.env.DATABASE_URL ?? '')
        try {
            const rows = await db.$queryRaw<{ count: number }[]>`SELECT COUNT(*)::int as count FROM admins`
            adminCount = Number(rows[0]?.count ?? -1)
        } catch (error) {
            adminError = error instanceof Error ? error.message.slice(0, 180) : String(error)
        }
        try {
            const rows = await db.$queryRaw<{ name: string; finished: Date | null }[]>`SELECT "migration_name" as name, "finished_at" as finished FROM "_prisma_migrations" ORDER BY "finished_at" DESC NULLS LAST LIMIT 5`
            migrations = rows.map((row) => ({
                name: row.name,
                finishedAt: row.finished ? row.finished.toISOString() : null,
            }))
        } catch {
            migrationError = 'no _prisma_migrations table (schema managed via db push)'
        }
    }

    const redisUrl = process.env.UPSTASH_REDIS_REST_URL
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN
    const upstashPing =
        redisUrl && redisToken
            ? await fetchStatus(`${redisUrl.replace(/\/$/, '')}/ping`, {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${redisToken}` },
              })
            : null

    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const sbAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const sbService = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAuthHealth =
        sbUrl && sbAnon
            ? await fetchStatus(`${sbUrl.replace(/\/$/, '')}/auth/v1/health`, {
                  headers: { apikey: sbAnon },
              })
            : null
    const supabaseRest =
        sbUrl && sbService
            ? await fetchStatus(`${sbUrl.replace(/\/$/, '')}/rest/v1/`, {
                  headers: { apikey: sbService, Authorization: `Bearer ${sbService}` },
              })
            : null

    const report = {
        ok: ping.ok,
        time: new Date().toISOString(),
        requestOrigin: request.nextUrl.origin,
        env: envReport,
        secrets: {
            healthcheckKey: presence(process.env.HEALTHCHECK_KEY),
        },
        db: {
            ping,
            adminCount,
            adminError,
            migrations,
            migrationError,
            databaseUrl,
        },
        upstash: { ping: upstashPing },
        supabase: { authHealth: supabaseAuthHealth, rest: supabaseRest },
    }

    return NextResponse.json(report, {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
    })
}
