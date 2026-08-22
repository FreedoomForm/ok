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
