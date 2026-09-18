import assert from 'node:assert/strict'
import test from 'node:test'
import {
    buildEnvReport,
    fetchStatus,
    hostOf,
    parseDsn,
    presence,
    redactDbUrl,
    timed,
} from '../src/lib/system-health'

test('presence reports set/length without exposing the value', () => {
    assert.deepEqual(presence(undefined), { set: false, length: 0 })
    assert.deepEqual(presence(''), { set: false, length: 0 })
    assert.deepEqual(presence('   '), { set: false, length: 3 })
    assert.deepEqual(presence('secret-value'), { set: true, length: 12 })
})

test('hostOf reduces URLs to hostnames and flags malformed ones', () => {
    assert.equal(hostOf('https://ok-two-eta.vercel.app/x'), 'ok-two-eta.vercel.app')
    assert.equal(hostOf('not a url'), 'invalid-url')
    assert.equal(hostOf(''), null)
    assert.equal(hostOf(undefined), null)
})

test('parseDsn extracts host and project id, never the key', () => {
    const dsn = 'https://abc123@o111.ingest.sentry.io/42'
    assert.deepEqual(parseDsn(dsn), { host: 'o111.ingest.sentry.io', projectId: '42' })
    assert.deepEqual(parseDsn('garbage'), { host: 'invalid-url', projectId: null })
    assert.deepEqual(parseDsn(undefined), { host: null, projectId: null })
})

test('redactDbUrl keeps scheme, host and database but drops credentials', () => {
    const url = 'postgresql://postgres:s3cret@db.x.supabase.co:5432/postgres'
    assert.equal(redactDbUrl(url), 'postgresql://db.x.supabase.co:5432/postgres')
    assert.equal(redactDbUrl('::not-a-url'), 'invalid-url')
    assert.equal(redactDbUrl('file:./dev.db'), 'file:///dev.db')
})

test('env report never contains raw secret values (no-leak contract)', () => {
    const env = {
        AUTH_SECRET: 'SUPERSECRETAUTHVALUE',
        NEXTAUTH_SECRET: 'SUPERSECRETNEXTAUTH',
        JWT_SECRET: 'SUPERSECRETJWT',
        CRON_SECRET: 'SUPERSECRETCRON',
        CRON_SECRET_TOKEN: 'SUPERSECRETCRONTOKEN',
        SENTRY_AUTH_TOKEN: 'SUPERSECRETSENTRY',
        UPSTASH_REDIS_REST_TOKEN: 'SUPERSECRETREDIS',
        SUPABASE_SERVICE_ROLE_KEY: 'SUPERSECRETSUPABASE',
        DATABASE_URL: 'postgresql://postgres:hunter2@db.x.supabase.co:5432/postgres',
        AUTH_TRUST_HOST: 'true',
        NEXT_PUBLIC_SUPABASE_URL: 'https://xyz.supabase.co',
        SMS_PROVIDER: 'twilio',
        NEXT_PUBLIC_ROOT_DOMAIN: 'vercel.app',
        NODE_ENV: 'production',
        VERCEL: '1',
    }
    const report = JSON.stringify(buildEnvReport(env))
    for (const secret of Object.values(env)) {
        if (typeof secret !== 'string') continue
        if (['true', 'production', '1', 'twilio', 'vercel.app'].includes(secret)) continue
        assert.ok(!report.includes(secret), `report leaked secret: ${secret}`)
    }
    const parsed = JSON.parse(report)
    assert.equal(parsed.auth.authSecret.set, true)
    assert.equal(parsed.auth.authSecret.length, 'SUPERSECRETAUTHVALUE'.length)
    assert.equal(parsed.database.target, 'postgresql://db.x.supabase.co:5432/postgres')
    assert.equal(parsed.database.configured, true)
    assert.equal(parsed.auth.authTrustHost, 'true')
    assert.equal(parsed.supabase.urlHost, 'xyz.supabase.co')
    assert.equal(parsed.sms.provider, 'twilio')
    assert.equal(parsed.runtime.vercel, true)
})

test('timed resolves with elapsed ms and safe error strings', async () => {
    const ok = await timed(async () => 'value')
    assert.equal(ok.ok, true)
    assert.ok(ok.ok && ok.value === 'value')
    assert.ok(typeof ok.ms === 'number')

    const fail = await timed(async () => {
        throw new Error('boom')
    })
    assert.equal(fail.ok, false)
    assert.ok(!fail.ok && fail.error === 'boom')
})

test('fetchStatus reports ok/error without leaking bodies on success', async () => {
    const stub = (async () =>
        new Response(JSON.stringify({ result: 'PONG' }), { status: 200 })) as unknown as typeof fetch
    const good = await fetchStatus('https://example.test/ping', { method: 'POST' }, stub)
    assert.equal(good.ok, true)
    assert.equal(good.code, 200)

    const badStub = (async () =>
        new Response('Unauthorized', { status: 401 })) as unknown as typeof fetch
    const bad = await fetchStatus('https://example.test/ping', { method: 'POST' }, badStub)
    assert.equal(bad.ok, false)
    assert.equal(bad.code, 401)
    assert.equal(bad.body, 'Unauthorized')

    const throwStub = (async () => {
        throw new Error('network down')
    }) as unknown as typeof fetch
    const thrown = await fetchStatus('https://example.test/ping', { method: 'POST' }, throwStub)
    assert.equal(thrown.ok, false)
    assert.equal(thrown.error, 'network down')
})
