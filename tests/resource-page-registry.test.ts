import assert from 'node:assert/strict'
import test from 'node:test'

import {
  RESOURCE_PAGE_REGISTRY,
  deriveVisibleResourcePages,
} from '@/components/admin/dashboard/tabs'

test('resource registry exposes the sixteen unified pages in the prescribed order', () => {
  assert.equal(RESOURCE_PAGE_REGISTRY.length, 16)
  assert.deepEqual(RESOURCE_PAGE_REGISTRY.map((page) => page.id), [
    'chat', 'settings', 'ingredients', 'cooking', 'dishes', 'groups', 'sets',
    'finance', 'contracts', 'transactions', 'orders', 'routes', 'admins', 'couriers', 'clients', 'calculator',
  ])
})

test('null permissions expose all resources and legacy warehouse/finance permissions map to child pages', () => {
  assert.equal(deriveVisibleResourcePages(null).length, 16)
  assert.deepEqual(deriveVisibleResourcePages(['warehouse', 'finance', 'orders']), [
    'ingredients', 'cooking', 'dishes', 'groups', 'sets', 'finance', 'contracts', 'transactions', 'orders', 'routes', 'calculator',
  ])
})

test('empty permission whitelist exposes no resource pages', () => {
  assert.deepEqual(deriveVisibleResourcePages([]), [])
})
