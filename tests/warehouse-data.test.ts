import assert from 'node:assert/strict'
import test from 'node:test'

import {
  parseCookingPlanAuditResponse,
  parseWarehouseClients,
  parseWarehouseOrders,
  parseWarehouseSets,
} from '@/lib/warehouse/warehouse-data'

test('warehouse client parser preserves legacy schedule forms and safe defaults', () => {
  assert.deepEqual(parseWarehouseClients([
    { id: 'client-1', calories: 1600, assignedSetId: null, isActive: true, deliveryDays: '{"monday":false}' },
    { id: 'client-2', calories: 'bad', isActive: false, deliveryDays: { sunday: true } },
    { name: 'missing id' },
  ]), [
    { id: 'client-1', calories: 1600, assignedSetId: null, isActive: true, deliveryDays: '{"monday":false}' },
    { id: 'client-2', calories: 2000, isActive: false, deliveryDays: { sunday: true } },
  ])
})

test('warehouse order parser accepts list and wrapped response shapes', () => {
  assert.deepEqual(parseWarehouseOrders({ orders: [
    { customerId: 'client-1', quantity: 2, calories: 2500, deliveryDate: '2026-08-22T00:00:00.000Z' },
    { customerId: 'client-2', quantity: -3, calories: 'bad', deliveryDate: '2026-08-22' },
    { calories: 1200 },
  ] }), [
    { customerId: 'client-1', quantity: 2, calories: 2500, deliveryDate: '2026-08-22T00:00:00.000Z' },
    { customerId: 'client-2', quantity: 0, calories: 2000, deliveryDate: '2026-08-22' },
  ])
})

test('warehouse set and cooking audit parsers keep compatible response contracts', () => {
  assert.deepEqual(parseWarehouseSets([
    { id: 'set-1', name: 'Active', calorieGroups: { '1': [] }, isActive: true },
    { id: 'set-2', name: 'Inactive', isActive: false },
    { name: 'missing id' },
  ]), [
    { id: 'set-1', name: 'Active', calorieGroups: { '1': [] }, isActive: true },
    { id: 'set-2', name: 'Inactive', calorieGroups: undefined, isActive: false },
  ])

  assert.deepEqual(parseCookingPlanAuditResponse({ plans: [
    { date: '2026-08-22', menuNumber: 4, dishes: { '1': 5, invalid: -1 }, cookedStats: { '1': { '1200': 2 } } },
    { date: 'bad', menuNumber: '4' },
  ] }), [
    { date: '2026-08-22', menuNumber: 4, dishes: { '1': 5 }, cookedStats: { '1': { '1200': 2 } } },
  ])
})
