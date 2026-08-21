import assert from 'node:assert/strict'
import test from 'node:test'
import { buildFinanceClientWhere, parseFinanceClientAsOf } from '../src/lib/admin/finance-clients'

test('builds scoped finance client filters', () => {
  assert.deepEqual(buildFinanceClientWhere(['admin-1'], 'positive', 'ali', false), {
    deletedAt: null,
    createdBy: { in: ['admin-1'] },
    OR: [
      { name: { contains: 'ali', mode: 'insensitive' } },
      { phone: { contains: 'ali', mode: 'insensitive' } },
    ],
    balance: { gt: 0 },
  })
  assert.deepEqual(buildFinanceClientWhere(null, 'negative', '', true), {
    deletedAt: null,
  })
})

test('validates finance client asOf dates', () => {
  const parsed = parseFinanceClientAsOf('2026-08-21T12:00:00.000Z')
  assert.equal('error' in parsed, false)
  if (!('error' in parsed)) {
    assert.equal(parsed.hasAsOf, true)
    assert.equal(parsed.asOf?.toISOString(), '2026-08-21T12:00:00.000Z')
  }
  assert.deepEqual(parseFinanceClientAsOf(null), { asOf: null, hasAsOf: false })
  assert.match(parseFinanceClientAsOf('invalid').error || '', /Invalid asOf/)
})
