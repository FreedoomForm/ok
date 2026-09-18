import assert from 'node:assert/strict'
import test from 'node:test'

import { deriveCurrentResourcePage } from '../src/components/admin/dashboard/shared/resource-adapters'

test('couriers page wins over the shared admins legacy tab', () => {
  assert.equal(deriveCurrentResourcePage('couriers', 'admins'), 'couriers')
  assert.equal(deriveCurrentResourcePage('couriers', 'orders'), 'couriers')
})

test('groups renders through the warehouse workspace regardless of sub tab', () => {
  assert.equal(deriveCurrentResourcePage('groups', 'warehouse', 'cooking'), 'groups')
  assert.equal(deriveCurrentResourcePage('groups', 'warehouse', 'dishes'), 'groups')
})

test('first-class content branches key on the workspace page itself', () => {
  assert.equal(deriveCurrentResourcePage('chat', 'orders'), 'chat')
  assert.equal(deriveCurrentResourcePage('settings', 'orders'), 'settings')
  assert.equal(deriveCurrentResourcePage('routes', 'orders'), 'routes')
  assert.equal(deriveCurrentResourcePage('finance', 'finance'), 'finance')
  assert.equal(deriveCurrentResourcePage('contracts', 'orders'), 'contracts')
  assert.equal(deriveCurrentResourcePage('transactions', 'orders'), 'transactions')
  assert.equal(deriveCurrentResourcePage('calculator', 'warehouse', 'calculator'), 'calculator')
})

test('warehouse sub tabs resolve ingredients/cooking/dishes/sets/calculator', () => {
  assert.equal(deriveCurrentResourcePage('ingredients', 'warehouse', 'inventory'), 'ingredients')
  assert.equal(deriveCurrentResourcePage('cooking', 'warehouse', 'cooking'), 'cooking')
  assert.equal(deriveCurrentResourcePage('dishes', 'warehouse', 'dishes'), 'dishes')
  assert.equal(deriveCurrentResourcePage('sets', 'warehouse', 'sets'), 'sets')
  assert.equal(deriveCurrentResourcePage('calculator', 'warehouse', 'calculator'), 'calculator')
})

test('legacy tabs resolve orders/clients/admins content roots', () => {
  assert.equal(deriveCurrentResourcePage('orders', 'orders'), 'orders')
  assert.equal(deriveCurrentResourcePage('clients', 'clients'), 'clients')
  assert.equal(deriveCurrentResourcePage('admins', 'admins'), 'admins')
})

test('a stale workspace page on the warehouse tab follows the visible sub tab content', () => {
  // When the workspace page lags behind a warehouse sub-tab switch the visible
  // content root is the sub tab surface, not the stale page label.
  assert.equal(deriveCurrentResourcePage('ingredients', 'warehouse', 'dishes'), 'dishes')
})
