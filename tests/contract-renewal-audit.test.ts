import assert from 'node:assert/strict'
import test from 'node:test'
import { buildContractRenewalAuditDetails } from '../src/lib/contracts/renewal-audit'

test('serializes a created scheduler renewal with deterministic correlation key and date range', () => {
  const details = JSON.parse(buildContractRenewalAuditDetails({
    result: 'CREATED',
    source: 'SCHEDULER',
    startDate: '2026-09-01',
    endDate: '2026-09-07',
    correlationKey: 'renewal:contract-1:2026-09-01:2026-09-07',
  }))
  assert.deepEqual(details, {
    result: 'CREATED',
    source: 'SCHEDULER',
    dateRange: { start: '2026-09-01', end: '2026-09-07' },
    correlationKey: 'renewal:contract-1:2026-09-01:2026-09-07',
  })
})

test('serializes a manual renewal without a key as a null correlation field', () => {
  const details = JSON.parse(buildContractRenewalAuditDetails({
    result: 'CREATED',
    source: 'MANUAL',
    startDate: '2026-10-05',
    endDate: '2026-10-11',
  }))
  assert.deepEqual(details, {
    result: 'CREATED',
    source: 'MANUAL',
    dateRange: { start: '2026-10-05', end: '2026-10-11' },
    correlationKey: null,
  })
})

test('skipped-existing result is serialized honestly for idempotent replays', () => {
  const details = JSON.parse(buildContractRenewalAuditDetails({
    result: 'SKIPPED_EXISTING',
    source: 'SCHEDULER',
    startDate: '2026-09-08',
    endDate: '2026-09-14',
    correlationKey: 'renewal:contract-2:2026-09-08:2026-09-14',
  }))
  assert.equal(details.result, 'SKIPPED_EXISTING')
  assert.equal(details.source, 'SCHEDULER')
  assert.equal(details.correlationKey, 'renewal:contract-2:2026-09-08:2026-09-14')
})

test('rejects correlation keys outside the 8-120 bound after trimming', () => {
  assert.throws(
    () => buildContractRenewalAuditDetails({ result: 'CREATED', source: 'MANUAL', startDate: '2026-09-01', endDate: '2026-09-07', correlationKey: '  short  ' }),
    (error: unknown) => error instanceof Error && error.message === 'INVALID_CORRELATION_KEY',
  )
  assert.throws(
    () => buildContractRenewalAuditDetails({ result: 'CREATED', source: 'MANUAL', startDate: '2026-09-01', endDate: '2026-09-07', correlationKey: 'k'.repeat(121) }),
    (error: unknown) => error instanceof Error && error.message === 'INVALID_CORRELATION_KEY',
  )
  const details = JSON.parse(buildContractRenewalAuditDetails({ result: 'CREATED', source: 'MANUAL', startDate: '2026-09-01', endDate: '2026-09-07', correlationKey: '  valid-key-1234  ' }))
  assert.equal(details.correlationKey, 'valid-key-1234')
})

test('rejects unknown result and source discriminants', () => {
  assert.throws(
    () => buildContractRenewalAuditDetails({ result: 'DELETED' as never, source: 'MANUAL', startDate: '2026-09-01', endDate: '2026-09-07' }),
    (error: unknown) => error instanceof Error && error.message === 'INVALID_RENEWAL_RESULT',
  )
  assert.throws(
    () => buildContractRenewalAuditDetails({ result: 'CREATED', source: 'TELECOM' as never, startDate: '2026-09-01', endDate: '2026-09-07' }),
    (error: unknown) => error instanceof Error && error.message === 'INVALID_RENEWAL_SOURCE',
  )
})

test('rejects malformed renewal date ranges', () => {
  assert.throws(
    () => buildContractRenewalAuditDetails({ result: 'CREATED', source: 'MANUAL', startDate: '2026-9-1', endDate: '2026-09-07' }),
    (error: unknown) => error instanceof Error && error.message === 'INVALID_RENEWAL_DATE_RANGE',
  )
  assert.throws(
    () => buildContractRenewalAuditDetails({ result: 'CREATED', source: 'SCHEDULER', startDate: '2026-09-01', endDate: 'not-a-date' }),
    (error: unknown) => error instanceof Error && error.message === 'INVALID_RENEWAL_DATE_RANGE',
  )
  assert.throws(
    () => buildContractRenewalAuditDetails({ result: 'CREATED', source: 'SCHEDULER', startDate: '2026-09-07', endDate: '2026-09-01' }),
    (error: unknown) => error instanceof Error && error.message === 'INVALID_RENEWAL_DATE_RANGE',
  )
})
