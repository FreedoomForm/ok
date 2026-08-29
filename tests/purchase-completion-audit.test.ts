import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPurchaseCompletionAuditDetails } from '../src/lib/admin/purchase-completion'

test('completion audit details record the command result and the correlation key', () => {
  const details = JSON.parse(buildPurchaseCompletionAuditDetails({ idempotencyKey: 'retry-key-12345' }))
  assert.equal(details.result, 'SUCCESS')
  assert.equal(details.idempotencyKey, 'retry-key-12345')
})

test('completion audit details keep a null correlation key when the caller omits it', () => {
  const details = JSON.parse(buildPurchaseCompletionAuditDetails({}))
  assert.equal(details.result, 'SUCCESS')
  assert.equal(details.idempotencyKey, null)
  const noArgs = JSON.parse(buildPurchaseCompletionAuditDetails())
  assert.equal(noArgs.idempotencyKey, null)
})

test('completion audit details reject oversized and malformed correlation keys', () => {
  assert.throws(() => buildPurchaseCompletionAuditDetails({ idempotencyKey: 'short' }))
  assert.throws(() => buildPurchaseCompletionAuditDetails({ idempotencyKey: 'k'.repeat(121) }))
  assert.throws(() => buildPurchaseCompletionAuditDetails({ idempotencyKey: '   ' }))
})
