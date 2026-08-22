import assert from 'node:assert/strict'
import test from 'node:test'
import { customerAccessSelect } from '../src/lib/customer-access'

test('customer access projection keeps only auth and menu-planning fields', () => {
  assert.deepEqual(customerAccessSelect, {
    id: true,
    isActive: true,
    calories: true,
    createdBy: true,
  })
  assert.equal('password' in customerAccessSelect, false)
  assert.equal('address' in customerAccessSelect, false)
  assert.equal('balance' in customerAccessSelect, false)
})
