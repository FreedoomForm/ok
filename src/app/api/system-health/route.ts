import { NextRequest, NextResponse } from 'next/server'
import { AuthError } from 'next-auth'
import { signIn } from '@/auth'
import { db } from '@/lib/db'
import {
    buildEnvReport,
    fetchStatus,
    presence,
    redactDbUrl,
    timed,
} from '@/lib/system-health'

export const dynamic = 'force-dynamic'

function notFound() {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
}

// §16 deployment row: production readiness audit. Fail-closed: without a
// HEALTHCHECK_KEY configured, or without the matching header, the endpoint
// behaves like a missing route.
export async function GET(request: NextRequest) {
    const expected = process.env.HEALTHCHECK_KEY
    const provided = request.headers.get('x-health-key')
    if (!expected || !provided || provided !== expected) {
        return notFound()
    }

    const probe = request.nextUrl.searchParams.get('probe')

    // authorize-probe: replay the exact credentials sign-in path the login
    // POST uses, but with redirect:false so the real underlying error is
    // captured instead of being flattened into "?error=Configuration".
    if (probe === 'authorize') {
        try {
            const result = await signIn('credentials', {
                email: 'system-health-probe@nonexistent.test',
                password: 'not-a-real-password',
                redirect: false,
            })
            return NextResponse.json(
                { probe: 'authorize', outcome: 'unexpected-success', result: String(result).slice(0, 120) },
                { headers: { 'Cache-Control': 'no-store' } },
            )
        } catch (error) {
            const authError = error instanceof AuthError
            const causeChain: { name: string; message: string }[] = []
            let cause: unknown = error instanceof Error ? error.cause : null
            for (let depth = 0; depth < 4 && cause; depth += 1) {
                causeChain.push({
                    name: cause instanceof Error ? cause.name : typeof cause,
                    message:
                        cause instanceof Error
                            ? cause.message.slice(0, 300)
                            : String(cause).slice(0, 300),
                })
                cause = cause instanceof Error ? cause.cause : null
            }
            return NextResponse.json(
                {
                    probe: 'authorize',
                    name: error instanceof Error ? error.name : typeof error,
                    message: error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300),
                    isAuthError: authError,
                    causeChain,
                },
                { headers: { 'Cache-Control': 'no-store' } },
            )
        }
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
