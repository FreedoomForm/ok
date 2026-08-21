import assert from 'node:assert/strict'
import test from 'node:test'

import { parseCourierWithdrawalRequest } from '../src/lib/courier/withdrawal'

test('courier withdrawal parser accepts bounded numeric and legacy string amounts', () => {
  assert.deepEqual(parseCourierWithdrawalRequest({ amount: 12500 }), { amount: 12500 })
  assert.deepEqual(parseCourierWithdrawalRequest({ amount: '12500' }), { amount: 12500 })
})

test('courier withdrawal parser rejects unsafe amounts', () => {
  for (const value of [null, {}, { amount: '' }, { amount: 0 }, { amount: -1 }, { amount: 'not-a-number' }, { amount: 1_000_000_000_001 }]) {
    assert.equal(parseCourierWithdrawalRequest(value), null)
  }
})
