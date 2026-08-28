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
  assert.equal(getResourcePageForLegacyTab('warehouse', 'dishes'), 'dishes')
  assert.equal(getResourcePageForLegacyTab('warehouse', 'calculator'), 'calculator')
})

test('calendar metadata is explicit for managed resources and absent only for settings', () => {
  assert.equal(getCalendarKindForResource('routes'), 'ROUTE')
  assert.equal(getCalendarKindForResource('ingredients'), 'INGREDIENT')
  assert.equal(getCalendarKindForResource('cooking'), 'COOKING_RECORD')
  assert.equal(getCalendarKindForResource('sets'), 'SET')
  assert.equal(getCalendarKindForResource('groups'), 'GROUP')
  assert.equal(getCalendarKindForResource('calculator'), 'PURCHASE')
  assert.equal(getCalendarKindForResource('settings'), null)
})

test('resource bridges expose stable legacy and warehouse metadata', () => {
  assert.equal(getLegacyTabForResource('routes'), 'orders')
  assert.equal(getLegacyTabForResource('contracts'), 'finance')
  assert.equal(getWarehouseSubTabForResource('dishes'), 'dishes')
  assert.equal(getWarehouseSubTabForResource('calculator'), 'calculator')
  assert.equal(getWarehouseSubTabForResource('finance'), null)
})

test('adapters expose real query descriptors and compatible selected-resource mutations', () => {
  assert.equal(getResourceAdapter('chat').listPath, '/api/chat/contacts')
  assert.equal(getResourceAdapter('calculator').listPath, '/api/admin/finance/purchases')
  assert.equal(getResourceAdapter('settings').listPath, '/api/admin/settings')
  assert.equal(getResourceAdapter('cooking').selectionField, 'id')
  assert.deepEqual(buildResourceMutationRequest('settings', 'edit', ['settings']), { path: '/api/admin/settings', method: 'PUT' })
  assert.deepEqual(buildResourceMutationRequest('orders', 'trash', ['order-1', 'order-2']), {
    path: '/api/admin/orders/delete', method: 'DELETE', body: { orderIds: ['order-1', 'order-2'] },
  })
  assert.deepEqual(buildResourceMutationRequest('clients', 'restore', ['client-1']), {
    path: '/api/admin/clients/restore', method: 'POST', body: { clientIds: ['client-1'] },
  })
  assert.deepEqual(buildResourceMutationRequest('clients', 'disable', ['client-1', 'client-2']), {
    path: '/api/admin/clients/toggle-status', method: 'PATCH', body: { clientIds: ['client-1', 'client-2'], isActive: false },
  })
  assert.deepEqual(buildResourceMutationRequest('clients', 'enable', ['client-1', 'client-2']), {
    path: '/api/admin/clients/toggle-status', method: 'PATCH', body: { clientIds: ['client-1', 'client-2'], isActive: true },
  })
  assert.deepEqual(buildResourceMutationRequest('finance', 'trash', ['card/1']), {
    path: '/api/admin/finance/cards', method: 'PATCH', body: { id: 'card/1', deletedAt: true },
  })
  assert.deepEqual(buildResourceMutationRequest('routes', 'trash', ['route/1']), {
    path: '/api/admin/routes/route%2F1', method: 'DELETE',
  })
  assert.deepEqual(buildResourceMutationRequest('routes', 'disable', ['route/1']), {
    path: '/api/admin/routes/route%2F1', method: 'PATCH', body: { isActive: false },
  })
  assert.deepEqual(buildResourceMutationRequest('routes', 'enable', ['route/1']), {
    path: '/api/admin/routes/route%2F1', method: 'PATCH', body: { isActive: true },
  })
  assert.deepEqual(buildResourceMutationRequest('routes', 'restore', ['route/1']), {
    path: '/api/admin/routes/route%2F1', method: 'PATCH', body: { deletedAt: null, isActive: true },
  })
  assert.deepEqual(buildResourceMutationRequest('dishes', 'edit', ['dish-1']), {
    path: '/api/admin/warehouse/dishes', method: 'PUT', body: { id: 'dish-1' },
  })
  assert.deepEqual(buildResourceMutationRequest('dishes', 'trash', ['dish-1']), {
    path: '/api/admin/warehouse/dishes?id=dish-1', method: 'DELETE',
  })
  assert.deepEqual(buildResourceMutationRequest('dishes', 'restore', ['dish-1']), {
    path: '/api/admin/warehouse/dishes', method: 'PATCH', body: { id: 'dish-1', deletedAt: false },
  })
  assert.deepEqual(buildResourceMutationRequest('dishes', 'disable', ['dish-1']), {
    path: '/api/admin/warehouse/dishes', method: 'PATCH', body: { id: 'dish-1', isActive: false },
  })
  assert.deepEqual(buildResourceMutationRequest('dishes', 'enable', ['dish-1']), {
    path: '/api/admin/warehouse/dishes', method: 'PATCH', body: { id: 'dish-1', isActive: true },
  })
  assert.deepEqual(buildResourceMutationRequest('groups', 'trash', ['set-1:group-1']), {
    path: '/api/admin/sets/set-1/groups/group-1', method: 'PATCH', body: { deletedAt: true },
  })
  assert.deepEqual(buildResourceMutationRequest('groups', 'disable', ['set-1:group-1']), {
    path: '/api/admin/sets/set-1/groups/group-1', method: 'PATCH', body: { isActive: false },
  })
  assert.deepEqual(buildResourceMutationRequest('groups', 'enable', ['set-1:group-1']), {
    path: '/api/admin/sets/set-1/groups/group-1', method: 'PATCH', body: { isActive: true },
  })
  assert.deepEqual(buildResourceMutationRequest('couriers', 'trash', ['courier-1']), {
    path: '/api/admin/couriers', method: 'PATCH', body: { courierId: 'courier-1', deletedAt: true },
  })
  assert.deepEqual(buildResourceMutationRequest('couriers', 'restore', ['courier-1']), {
    path: '/api/admin/couriers', method: 'PATCH', body: { courierId: 'courier-1', deletedAt: false },
  })
  assert.deepEqual(buildResourceMutationRequest('couriers', 'disable', ['courier-1']), {
    path: '/api/admin/couriers', method: 'PATCH', body: { courierId: 'courier-1', isActive: false },
  })
  assert.deepEqual(buildResourceMutationRequest('couriers', 'enable', ['courier-1']), {
    path: '/api/admin/couriers', method: 'PATCH', body: { courierId: 'courier-1', isActive: true },
  })
  assert.deepEqual(buildResourceMutationRequest('admins', 'disable', ['admin-1']), {
    path: '/api/admin/users-list', method: 'PATCH', body: { id: 'admin-1', isActive: false },
  })
  assert.deepEqual(buildResourceMutationRequest('admins', 'enable', ['admin-1']), {
    path: '/api/admin/users-list', method: 'PATCH', body: { id: 'admin-1', isActive: true },
  })
  assert.deepEqual(buildResourceMutationRequest('transactions', 'trash', ['tx-1']), {
    path: '/api/admin/finance/company', method: 'PATCH', body: { id: 'tx-1', deletedAt: true },
  })
  assert.deepEqual(buildResourceMutationRequest('transactions', 'restore', ['tx-1']), {
    path: '/api/admin/finance/company', method: 'PATCH', body: { id: 'tx-1', deletedAt: false },
  })
  assert.deepEqual(buildResourceMutationRequest('cooking', 'trash', ['plan-1']), {
    path: '/api/admin/warehouse/cooking-plan?id=plan-1', method: 'DELETE',
  })
  assert.deepEqual(buildResourceMutationRequest('cooking', 'restore', ['plan-1']), {
    path: '/api/admin/warehouse/cooking-plan', method: 'PATCH', body: { id: 'plan-1', deletedAt: false, isActive: true },
  })
  assert.deepEqual(buildResourceMutationRequest('cooking', 'disable', ['plan-1']), {
    path: '/api/admin/warehouse/cooking-plan', method: 'PATCH', body: { id: 'plan-1', isActive: false },
  })
  assert.deepEqual(buildResourceMutationRequest('contracts', 'trash', ['contract-1']), {
    path: '/api/admin/contracts/contract-1', method: 'PATCH', body: { status: 'DELETED' },
  })
  assert.deepEqual(buildResourceMutationRequest('contracts', 'restore', ['contract-1']), {
    path: '/api/admin/contracts/contract-1', method: 'PATCH', body: { status: 'ENABLED' },
  })
  assert.deepEqual(buildResourceMutationRequest('contracts', 'disable', ['contract-1']), {
    path: '/api/admin/contracts/contract-1', method: 'PATCH', body: { status: 'DISABLED' },
  })
  assert.deepEqual(buildResourceMutationRequest('contracts', 'enable', ['contract-1']), {
    path: '/api/admin/contracts/contract-1', method: 'PATCH', body: { status: 'ENABLED' },
  })
  assert.deepEqual(buildResourceMutationRequest('finance', 'disable', ['card-1']), {
    path: '/api/admin/finance/cards', method: 'PATCH', body: { id: 'card-1', isActive: false },
  })
  assert.deepEqual(buildResourceMutationRequest('finance', 'enable', ['card-1']), {
    path: '/api/admin/finance/cards', method: 'PATCH', body: { id: 'card-1', isActive: true },
  })
  assert.deepEqual(buildResourceMutationRequest('sets', 'trash', ['set-1']), {
    path: '/api/admin/sets/set-1', method: 'DELETE',
  })
  assert.deepEqual(buildResourceMutationRequest('sets', 'restore', ['set-1']), {
    path: '/api/admin/sets/set-1', method: 'PATCH', body: { deletedAt: false },
  })
  assert.deepEqual(buildResourceMutationRequest('sets', 'disable', ['set-1']), {
    path: '/api/admin/sets/set-1', method: 'PATCH', body: { isActive: false },
  })
  assert.deepEqual(buildResourceMutationRequest('sets', 'enable', ['set-1']), {
    path: '/api/admin/sets/set-1', method: 'PATCH', body: { isActive: true },
  })
  assert.deepEqual(buildResourceMutationRequest('ingredients', 'edit', ['ingredient-1']), {
    path: '/api/admin/warehouse/ingredients', method: 'PUT', body: { id: 'ingredient-1' },
  })
  assert.deepEqual(buildResourceMutationRequest('ingredients', 'trash', ['ingredient-1']), {
    path: '/api/admin/warehouse/ingredients?id=ingredient-1', method: 'DELETE',
  })
  assert.deepEqual(buildResourceMutationRequest('ingredients', 'restore', ['ingredient-1']), {
    path: '/api/admin/warehouse/ingredients', method: 'PATCH', body: { id: 'ingredient-1', deletedAt: false },
  })
  assert.deepEqual(buildResourceMutationRequest('ingredients', 'disable', ['ingredient-1']), {
    path: '/api/admin/warehouse/ingredients', method: 'PATCH', body: { id: 'ingredient-1', isActive: false },
  })
  assert.deepEqual(buildResourceMutationRequest('ingredients', 'enable', ['ingredient-1']), {
    path: '/api/admin/warehouse/ingredients', method: 'PATCH', body: { id: 'ingredient-1', isActive: true },
  })
})
