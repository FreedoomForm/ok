import assert from 'node:assert/strict'
import test from 'node:test'
import { customerAccessSelect, customerLoginSelect } from '../src/lib/customer-access'

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

test('customer login projection keeps only credential verification and response fields', () => {
  assert.deepEqual(customerLoginSelect, {
    id: true,
    name: true,
    phone: true,
    address: true,
    password: true,
    isActive: true,
  })
  assert.equal('balance' in customerLoginSelect, false)
  assert.equal('createdBy' in customerLoginSelect, false)
})
