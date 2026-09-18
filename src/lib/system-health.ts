// §16 deployment row: production readiness audit helpers.
// Pure, testable, no server-only imports — the route wires live checks,
// these helpers only describe configuration presence and probe transports.
// Contract: no secret VALUE ever leaves through a report — only presence,
// length and non-secret hostnames.

export type Presence = { set: boolean; length: number }

export type ServiceStatus = {
    ok: boolean
    code: number
    ms: number
    error?: string
    body?: string
}

export type TimedResult<T> =
    | { ok: true; ms: number; value: T }
    | { ok: false; ms: number; error: string }

export function presence(value: string | undefined | null): Presence {
    return {
        set: Boolean(value && value.trim().length > 0),
        length: value ? value.length : 0,
    }
}

export function hostOf(url: string | undefined | null): string | null {
    if (!url || !url.trim()) return null
    try {
        return new URL(url).host
    } catch {
        return 'invalid-url'
    }
}

export function parseDsn(
    dsn: string | undefined | null,
): { host: string | null; projectId: string | null } {
    if (!dsn || !dsn.trim()) return { host: null, projectId: null }
    try {
        const url = new URL(dsn)
        const projectId = url.pathname.replace(/^\//, '').split('/')[0] || null
        return { host: url.host, projectId }
    } catch {
        return { host: 'invalid-url', projectId: null }
    }
}

export async function timed<T>(fn: () => Promise<T>): Promise<TimedResult<T>> {
    const started = performance.now()
    try {
        const value = await fn()
        return { ok: true, ms: Math.round(performance.now() - started), value }
    } catch (error) {
        return {
            ok: false,
            ms: Math.round(performance.now() - started),
            error:
                error instanceof Error
                    ? error.message.slice(0, 180)
                    : String(error).slice(0, 180),
        }
    }
}

type FetchLike = typeof fetch

export async function fetchStatus(
    url: string,
    init: RequestInit,
    fetchImpl: FetchLike = fetch,
): Promise<ServiceStatus> {
    const started = performance.now()
    try {
        const res = await fetchImpl(url, {
            ...init,
            signal: AbortSignal.timeout(4000),
        })
        const ms = Math.round(performance.now() - started)
        if (res.ok) {
            return { ok: true, code: res.status, ms }
        }
        const text = await res.text().catch(() => '')
        return { ok: false, code: res.status, ms, body: text.slice(0, 180) }
    } catch (error) {
        return {
            ok: false,
            code: 0,
            ms: Math.round(performance.now() - started),
            error:
                error instanceof Error
                    ? error.message.slice(0, 180)
                    : String(error).slice(0, 180),
        }
    }
}

type EnvLike = Record<string, string | undefined>

export type EnvReport = ReturnType<typeof buildEnvReport>

export function buildEnvReport(env: EnvLike) {
    return {
        runtime: {
            node: process.version,
            env: env.NODE_ENV ?? null,
            vercel: Boolean(env.VERCEL),
        },
        auth: {
            authSecret: presence(env.AUTH_SECRET),
            nextauthSecret: presence(env.NEXTAUTH_SECRET),
            jwtSecret: presence(env.JWT_SECRET),
            authTrustHost: env.AUTH_TRUST_HOST ?? null,
            authUrlHost: hostOf(env.AUTH_URL),
            nextauthUrlHost: hostOf(env.NEXTAUTH_URL),
            googleConfigured: Boolean(
                env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
            ),
        },
        database: {
            configured: Boolean(
                env.DATABASE_URL && env.DATABASE_URL.trim().length > 0,
            ),
            target: env.DATABASE_URL ? redactDbUrl(env.DATABASE_URL) : null,
        },
        redis: {
            urlConfigured: presence(env.UPSTASH_REDIS_REST_URL).set,
            tokenConfigured: presence(env.UPSTASH_REDIS_REST_TOKEN).set,
        },
        supabase: {
            urlHost: hostOf(env.NEXT_PUBLIC_SUPABASE_URL),
            anonConfigured: presence(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).set,
            serviceConfigured: presence(env.SUPABASE_SERVICE_ROLE_KEY).set,
        },
        sentry: {
            dsn: parseDsn(env.NEXT_PUBLIC_SENTRY_DSN),
            org: env.SENTRY_ORG ?? null,
            project: env.SENTRY_PROJECT ?? null,
            authToken: presence(env.SENTRY_AUTH_TOKEN),
        },
        cron: {
            cronSecret: presence(env.CRON_SECRET),
            cronSecretToken: presence(env.CRON_SECRET_TOKEN),
        },
        sms: {
            provider: env.SMS_PROVIDER ?? null,
        },
        rootDomain: env.NEXT_PUBLIC_ROOT_DOMAIN ?? null,
    }
}

// DATABASE_URL contains credentials — reduce it to scheme + host + database
// name so the report can show WHERE the app points without leaking secrets.
export function redactDbUrl(url: string): string | null {
    try {
        const parsed = new URL(url)
        const database = parsed.pathname.replace(/^\//, '')
        return `${parsed.protocol}//${parsed.host}/${database}`
    } catch {
        return 'invalid-url'
    }
}
