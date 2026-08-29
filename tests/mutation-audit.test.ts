import assert from 'node:assert/strict'
import test from 'node:test'
import { buildMutationAuditDetails } from '../src/lib/audit/mutation-audit'

test('serializes an applied mutation with an explicit correlation key', () => {
  const details = JSON.parse(buildMutationAuditDetails({
    result: 'APPLIED',
    correlationKey: 'contract-edit-key-0001',
    extra: { entity: 'CONTRACT', mutation: 'UPDATE_CONTRACT' },
  }))
  assert.deepEqual(details, {
    result: 'APPLIED',
    correlationKey: 'contract-edit-key-0001',
    entity: 'CONTRACT',
    mutation: 'UPDATE_CONTRACT',
  })
})

test('serializes an applied mutation without a key as a null correlation field', () => {
  const details = JSON.parse(buildMutationAuditDetails({ result: 'APPLIED' }))
  assert.deepEqual(details, { result: 'APPLIED', correlationKey: null })
})

test('serializes skipped-existing and deleted results honestly', () => {
  assert.equal(JSON.parse(buildMutationAuditDetails({ result: 'SKIPPED_EXISTING' })).result, 'SKIPPED_EXISTING')
  assert.equal(JSON.parse(buildMutationAuditDetails({ result: 'DELETED' })).result, 'DELETED')
})

test('rejects correlation keys outside the 8-120 bound after trimming', () => {
  assert.throws(
    () => buildMutationAuditDetails({ result: 'APPLIED', correlationKey: '  tiny  ' }),
    (error: unknown) => error instanceof Error && error.message === 'INVALID_CORRELATION_KEY',
  )
  assert.throws(
    () => buildMutationAuditDetails({ result: 'APPLIED', correlationKey: 'k'.repeat(121) }),
    (error: unknown) => error instanceof Error && error.message === 'INVALID_CORRELATION_KEY',
  )
  const details = JSON.parse(buildMutationAuditDetails({ result: 'APPLIED', correlationKey: '  padded-key-0001  ' }))
  assert.equal(details.correlationKey, 'padded-key-0001')
})

test('rejects unknown results and non-object extras', () => {
  assert.throws(
    () => buildMutationAuditDetails({ result: 'REVERTED' as never }),
    (error: unknown) => error instanceof Error && error.message === 'INVALID_MUTATION_RESULT',
  )
  assert.throws(
    () => buildMutationAuditDetails({ result: 'APPLIED', extra: 'CONTRACT' as never }),
    (error: unknown) => error instanceof Error && error.message === 'INVALID_MUTATION_EXTRA',
  )
  assert.throws(
    () => buildMutationAuditDetails({ result: 'APPLIED', extra: { correlationKey: 'sneaky-key-001' } }),
    (error: unknown) => error instanceof Error && error.message === 'INVALID_MUTATION_EXTRA',
  )
})
