import assert from 'node:assert/strict'
import test from 'node:test'
import { buildResourceDateAuditDetails } from '../src/lib/resources/availability-audit'

test('serializes an applied day override with resource type, date and correlation key', () => {
  const details = JSON.parse(buildResourceDateAuditDetails({
    result: 'APPLIED',
    resourceType: 'CONTRACT',
    date: '2026-09-01',
    correlationKey: 'calendar-disable-key-0001',
  }))
  assert.deepEqual(details, {
    result: 'APPLIED',
    resourceType: 'CONTRACT',
    date: '2026-09-01',
    correlationKey: 'calendar-disable-key-0001',
  })
})

test('serializes an applied override without a key as a null correlation field', () => {
  const details = JSON.parse(buildResourceDateAuditDetails({
    result: 'APPLIED',
    resourceType: 'COURIER',
    date: '2026-09-02',
  }))
  assert.deepEqual(details, {
    result: 'APPLIED',
    resourceType: 'COURIER',
    date: '2026-09-02',
    correlationKey: null,
  })
})

test('serializes a deleted override honestly for reset days', () => {
  const details = JSON.parse(buildResourceDateAuditDetails({
    result: 'DELETED',
    resourceType: 'CLIENT',
    date: '2026-09-03',
    correlationKey: 'calendar-reset-key-0001',
  }))
  assert.equal(details.result, 'DELETED')
  assert.equal(details.correlationKey, 'calendar-reset-key-0001')
})

test('rejects correlation keys outside the 8-120 bound after trimming', () => {
  assert.throws(
    () => buildResourceDateAuditDetails({ result: 'APPLIED', resourceType: 'CONTRACT', date: '2026-09-01', correlationKey: '  brief  ' }),
    (error: unknown) => error instanceof Error && error.message === 'INVALID_CORRELATION_KEY',
  )
  assert.throws(
    () => buildResourceDateAuditDetails({ result: 'APPLIED', resourceType: 'CONTRACT', date: '2026-09-01', correlationKey: 'k'.repeat(121) }),
    (error: unknown) => error instanceof Error && error.message === 'INVALID_CORRELATION_KEY',
  )
  const details = JSON.parse(buildResourceDateAuditDetails({ result: 'APPLIED', resourceType: 'CONTRACT', date: '2026-09-01', correlationKey: '  trimmed-key-0001  ' }))
  assert.equal(details.correlationKey, 'trimmed-key-0001')
})

test('rejects unknown results and empty resource types', () => {
  assert.throws(
    () => buildResourceDateAuditDetails({ result: 'MERGED' as never, resourceType: 'CONTRACT', date: '2026-09-01' }),
    (error: unknown) => error instanceof Error && error.message === 'INVALID_RESOURCE_DATE_RESULT',
  )
  assert.throws(
    () => buildResourceDateAuditDetails({ result: 'APPLIED', resourceType: '  ', date: '2026-09-01' }),
    (error: unknown) => error instanceof Error && error.message === 'INVALID_RESOURCE_TYPE',
  )
})

test('rejects malformed override dates', () => {
  assert.throws(
    () => buildResourceDateAuditDetails({ result: 'APPLIED', resourceType: 'CONTRACT', date: '2026-9-1' }),
    (error: unknown) => error instanceof Error && error.message === 'INVALID_RESOURCE_DATE',
  )
  assert.throws(
    () => buildResourceDateAuditDetails({ result: 'DELETED', resourceType: 'CONTRACT', date: 'not-a-date' }),
    (error: unknown) => error instanceof Error && error.message === 'INVALID_RESOURCE_DATE',
  )
})
