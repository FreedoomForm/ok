import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getCalendarKindForResource,
  getLegacyTabForResource,
  getResourceAdapter,
  getResourcePageForLegacyTab,
  getWarehouseSubTabForResource,
  buildResourceMutationRequest,
  RESOURCE_ADAPTERS,
} from '@/components/admin/dashboard/shared/resource-adapters'
import { UNIVERSAL_COMMANDS, WORKSPACE_RESOURCE_PAGES } from '@/components/admin/dashboard/shared/workspace-state'

test('every workspace page has one canonical adapter and all universal commands', () => {
  assert.deepEqual(Object.keys(RESOURCE_ADAPTERS).sort(), [...WORKSPACE_RESOURCE_PAGES].sort())
  for (const page of WORKSPACE_RESOURCE_PAGES) {
    const adapter = getResourceAdapter(page)
    assert.equal(adapter.page, page)
    assert.deepEqual(adapter.commands, UNIVERSAL_COMMANDS)
    assert.ok(adapter.scopes.includes('admin'))
  }
})

test('legacy compatibility resolves to the same canonical workspace pages', () => {
  assert.equal(getResourcePageForLegacyTab('orders'), 'orders')
  assert.equal(getResourcePageForLegacyTab('clients'), 'clients')
  assert.equal(getResourcePageForLegacyTab('admins'), 'admins')
  assert.equal(getResourcePageForLegacyTab('finance'), 'finance')
  assert.equal(getResourcePageForLegacyTab('warehouse', 'inventory'), 'ingredients')
  assert.equal(getResourcePageForLegacyTab('warehouse', 'cooking'), 'cooking')
  assert.equal(getResourcePageForLegacyTab('warehouse', 'sets'), 'sets')
  assert.equal(getResourcePageForLegacyTab('warehouse', 'calculator'), 'calculator')
})

test('calendar metadata is explicit for managed resources and absent only for settings', () => {
  assert.equal(getCalendarKindForResource('routes'), 'ROUTE')
  assert.equal(getCalendarKindForResource('ingredients'), 'INGREDIENT')
  assert.equal(getCalendarKindForResource('sets'), 'SET')
  assert.equal(getCalendarKindForResource('groups'), 'GROUP')
  assert.equal(getCalendarKindForResource('calculator'), 'PURCHASE')
  assert.equal(getCalendarKindForResource('settings'), null)
})

test('resource bridges expose stable legacy and warehouse metadata', () => {
  assert.equal(getLegacyTabForResource('routes'), 'orders')
  assert.equal(getLegacyTabForResource('contracts'), 'finance')
  assert.equal(getWarehouseSubTabForResource('dishes'), 'cooking')
  assert.equal(getWarehouseSubTabForResource('calculator'), 'calculator')
  assert.equal(getWarehouseSubTabForResource('finance'), null)
})

test('adapters expose real query descriptors and compatible selected-resource mutations', () => {
  assert.equal(getResourceAdapter('chat').listPath, '/api/chat/contacts')
  assert.equal(getResourceAdapter('calculator').listPath, '/api/admin/finance/purchases')
  assert.equal(getResourceAdapter('settings').listPath, null)
  assert.deepEqual(buildResourceMutationRequest('orders', 'trash', ['order-1', 'order-2']), {
    path: '/api/admin/orders/delete', method: 'DELETE', body: { orderIds: ['order-1', 'order-2'] },
  })
  assert.deepEqual(buildResourceMutationRequest('clients', 'restore', ['client-1']), {
    path: '/api/admin/clients/restore', method: 'POST', body: { clientIds: ['client-1'] },
  })
  assert.deepEqual(buildResourceMutationRequest('finance', 'trash', ['card/1']), {
    path: '/api/admin/finance/cards?id=card%2F1', method: 'DELETE',
  })
  assert.deepEqual(buildResourceMutationRequest('routes', 'trash', ['route/1']), {
    path: '/api/admin/routes/route%2F1', method: 'DELETE',
  })
  assert.equal(buildResourceMutationRequest('ingredients', 'trash', ['ingredient-1']), null)
})
