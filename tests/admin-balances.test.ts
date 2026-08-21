import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSalaryAdminWhere, parseBalanceDates } from '../src/lib/admin/balances'

test('builds global and grouped salary admin scopes', () => {
  assert.deepEqual(buildSalaryAdminWhere(null), {
    role: { in: ['LOW_ADMIN', 'COURIER', 'WORKER'] },
  })
  assert.deepEqual(buildSalaryAdminWhere(['admin-1', 'admin-2']), {
    role: { in: ['LOW_ADMIN', 'COURIER', 'WORKER'] },
    createdBy: { in: ['admin-1', 'admin-2'] },
  })
})

test('validates balance dates and bounds report ranges', () => {
  const parsed = parseBalanceDates(
    '2026-08-21T12:00:00.000Z',
    '2026-08-01',
    '2026-08-21',
  )
  assert.equal('error' in parsed, false)
  if (!('error' in parsed)) {
    assert.equal(parsed.asOf.toISOString(), '2026-08-21T12:00:00.000Z')
    assert.equal(parsed.from?.toISOString(), '2026-08-01T00:00:00.000Z')
    assert.equal(parsed.to?.toISOString(), '2026-08-22T00:00:00.000Z')
  }

  assert.match(parseBalanceDates('invalid', null, null).error || '', /Invalid date/)
  assert.match(parseBalanceDates(null, '2025-01-01', '2026-08-21').error || '', /between 1 and 366 days/)
})
