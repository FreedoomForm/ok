import test from 'node:test'
import assert from 'node:assert/strict'
import { toSnapshotRows } from '@/lib/admin/database-snapshot'

test('snapshot rows preserve scalar coercion and redact credential-like fields', () => {
  const rows = toSnapshotRows([
    {
      id: 'admin-1',
      createdAt: new Date('2026-08-22T00:00:00.000Z'),
      active: true,
      balance: 12.5,
      metadata: { region: 'owner' },
      password: 'hash',
      access_token: 'secret',
      nullable: null,
    },
  ])

  assert.deepEqual(rows, [
    {
      id: 'admin-1',
      createdAt: '2026-08-22T00:00:00.000Z',
      active: 'true',
      balance: '12.5',
      metadata: '{"region":"owner"}',
      password: '[REDACTED]',
      access_token: '[REDACTED]',
      nullable: '',
    },
  ])
})

test('snapshot serialization keeps row keys when values are undefined', () => {
  assert.deepEqual(toSnapshotRows([{ id: 'row-1', missing: undefined }]), [{ id: 'row-1', missing: '' }])
})

import { InvalidSnapshotDateRangeError, parseSnapshotDateRange } from '@/lib/admin/database-snapshot-query'

test('snapshot date parser preserves All time when both parameters are absent', () => {
  assert.equal(parseSnapshotDateRange(null, null), null)
})

test('snapshot date parser returns an exclusive valid range', () => {
  assert.deepEqual(parseSnapshotDateRange('2026-08-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'), {
    start: new Date('2026-08-01T00:00:00.000Z'),
    end: new Date('2026-09-01T00:00:00.000Z'),
  })
})

test('snapshot date parser rejects partial, invalid and reversed ranges', () => {
  assert.throws(() => parseSnapshotDateRange('2026-08-01', null), InvalidSnapshotDateRangeError)
  assert.throws(() => parseSnapshotDateRange('not-a-date', '2026-09-01'), InvalidSnapshotDateRangeError)
  assert.throws(() => parseSnapshotDateRange('2026-09-01', '2026-08-01'), InvalidSnapshotDateRangeError)
})
