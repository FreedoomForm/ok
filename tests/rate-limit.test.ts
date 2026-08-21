import assert from 'node:assert/strict'
import test from 'node:test'
import { checkRateLimit, getClientIp } from '../src/lib/rate-limit'

test('blocks requests after the configured limit and reports retry time', () => {
  const key = `rate-limit-test:${Date.now()}:${Math.random()}`

  assert.deepEqual(checkRateLimit(key, 2, 60_000), {
    allowed: true,
    retryAfterSec: 0,
  })
  assert.deepEqual(checkRateLimit(key, 2, 60_000), {
    allowed: true,
    retryAfterSec: 0,
  })

  const blocked = checkRateLimit(key, 2, 60_000)
  assert.equal(blocked.allowed, false)
  assert.ok(blocked.retryAfterSec >= 1)
})

test('uses the first forwarded IP address', () => {
  const headers = new Headers({
    'x-forwarded-for': '198.51.100.7, 203.0.113.10',
    'x-real-ip': '192.0.2.1',
  })

  assert.equal(getClientIp(headers), '198.51.100.7')
})
