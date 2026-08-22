import assert from 'node:assert/strict'
import test from 'node:test'
import { customerAccessSelect, customerLoginSelect, customerProfileSelect, customerSiteAuthSelect } from '../src/lib/customer-access'

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

test('customer site auth projection keeps only token and public summary fields', () => {
  assert.deepEqual(customerSiteAuthSelect, {
    id: true,
    name: true,
    phone: true,
    address: true,
    balance: true,
    isActive: true,
  })
  assert.equal('password' in customerSiteAuthSelect, false)
  assert.equal('createdBy' in customerSiteAuthSelect, false)
})

test('customer profile projection keeps the safe response contract', () => {
  assert.deepEqual(customerProfileSelect, {
    id: true,
    name: true,
    nickName: true,
    phone: true,
    address: true,
    preferences: true,
    orderPattern: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    latitude: true,
    longitude: true,
    defaultCourierId: true,
    calories: true,
    planType: true,
    dailyPrice: true,
    notes: true,
    deliveryDays: true,
    autoOrdersEnabled: true,
    balance: true,
    assignedSetId: true,
  })
  assert.equal('password' in customerProfileSelect, false)
  assert.equal('deletedAt' in customerProfileSelect, false)
  assert.equal('deletedBy' in customerProfileSelect, false)
  assert.equal('createdBy' in customerProfileSelect, false)
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
