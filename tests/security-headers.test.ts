import assert from 'node:assert/strict'
import test from 'node:test'
import { applySecurityHeaders } from '../src/lib/security-headers'

test('applies baseline security headers outside production without enforcing CSP', () => {
  const headers = new Headers()

  applySecurityHeaders(headers, false)

  assert.equal(headers.get('X-Content-Type-Options'), 'nosniff')
  assert.equal(headers.get('X-Frame-Options'), 'DENY')
  assert.equal(headers.get('Strict-Transport-Security'), null)
  assert.equal(headers.get('Content-Security-Policy-Report-Only'), null)
})

test('adds production CSP Report-Only and transport policy', () => {
  const headers = new Headers()

  applySecurityHeaders(headers, true, 'https://security.example.test/csp-report')

  const policy = headers.get('Content-Security-Policy-Report-Only')
  assert.ok(policy?.includes("default-src 'self'"))
  assert.ok(policy?.includes("frame-ancestors 'none'"))
  assert.ok(policy?.includes('report-uri https://security.example.test/csp-report'))
  assert.equal(headers.get('Strict-Transport-Security'), 'max-age=31536000; includeSubDomains; preload')
})
