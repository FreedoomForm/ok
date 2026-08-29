import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveSiteCustomerLogin, type SiteLoginCustomerRecord } from '@/lib/customer-login'

const customerWithHash: SiteLoginCustomerRecord = {
  id: 'customer-1',
  isActive: true,
  password: '$2a$10$CwTycUXWue0Thq9StjUM0uJ8DsAMd4xM8pTn5tS6kZQ1eHbOhkZ5W',
}

const customerWithoutHash: SiteLoginCustomerRecord = {
  id: 'customer-2',
  isActive: true,
  password: null,
}

test('site login rejects a missing password before touching customer data', async () => {
  const outcome = await resolveSiteCustomerLogin({ password: '', customer: customerWithHash })
  assert.equal(outcome.status, 'MISSING_CREDENTIALS')
  assert.equal(outcome.httpStatus, 400)
  assert.equal(outcome.customer, null)
})

test('site login reports an unset password honestly instead of silently admitting', async () => {
  const outcome = await resolveSiteCustomerLogin({ password: '+998901112233', customer: customerWithoutHash })
  assert.equal(outcome.status, 'NO_PASSWORD_SET')
  assert.equal(outcome.httpStatus, 400)
  assert.equal(outcome.customer, null)
})

test('site login rejects an inactive account before password verification', async () => {
  const outcome = await resolveSiteCustomerLogin({ password: '+998901112233', customer: { ...customerWithHash, isActive: false } })
  assert.equal(outcome.status, 'ACCOUNT_INACTIVE')
  assert.equal(outcome.httpStatus, 403)
  assert.equal(outcome.customer, null)
})

test('site login failure returns the same generic error for a wrong password', async () => {
  const outcome = await resolveSiteCustomerLogin({ password: 'definitely-wrong', customer: customerWithHash })
  assert.equal(outcome.status, 'INVALID_CREDENTIALS')
  assert.equal(outcome.httpStatus, 401)
  assert.equal(outcome.customer, null)
  assert.equal(outcome.error, 'Invalid credentials')
})

test('site login accepts the correct password and returns the customer record without its hash', async () => {
  const { hash } = await import('bcryptjs')
  const passwordHash = await hash('+998901112233', 4)
  const outcome = await resolveSiteCustomerLogin({ password: '+998901112233', customer: { ...customerWithHash, password: passwordHash } })
  assert.equal(outcome.status, 'OK')
  assert.equal(outcome.httpStatus, 200)
  assert.ok(outcome.customer)
  assert.equal(outcome.customer?.id, 'customer-1')
  assert.equal((outcome.customer as unknown as Record<string, unknown>).password, undefined)
  assert.equal(outcome.error, null)
})

test('password change rejects an incorrect current password', async () => {
  const { verifyCustomerPasswordChange } = await import('@/lib/customer-login')
  const { hash } = await import('bcryptjs')
  const storedHash = await hash('old-secret-1', 4)
  const outcome = await verifyCustomerPasswordChange({ currentPassword: 'wrong-guess', effectiveCurrentHash: storedHash })
  assert.equal(outcome.status, 'INVALID_CREDENTIALS')
  assert.equal(outcome.httpStatus, 401)
})

test('password change accepts the correct current password', async () => {
  const { verifyCustomerPasswordChange } = await import('@/lib/customer-login')
  const { hash } = await import('bcryptjs')
  const storedHash = await hash('old-secret-1', 4)
  const outcome = await verifyCustomerPasswordChange({ currentPassword: 'old-secret-1', effectiveCurrentHash: storedHash })
  assert.equal(outcome.status, 'OK')
  assert.equal(outcome.httpStatus, 200)
})
