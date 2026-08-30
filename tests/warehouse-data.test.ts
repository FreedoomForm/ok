import assert from 'node:assert/strict'
import test from 'node:test'

import { clientOrderStatusLabel } from '@/lib/clients/order-status'
import { resolveEffectiveOrdersForDate } from '@/lib/warehouse/effective-demand'

import {
  parseCookingPlanAuditResponse,
  parseWarehouseClients,
  parseWarehouseOrders,
  parseWarehouseSets,
} from '@/lib/warehouse/warehouse-data'

test('client order statuses use only supported RU/UZ labels', () => {
  assert.deepEqual([
    clientOrderStatusLabel('PENDING', 'ru'),
    clientOrderStatusLabel('IN_DELIVERY', 'uz'),
    clientOrderStatusLabel('DELIVERED', 'ru'),
    clientOrderStatusLabel('UNKNOWN', 'uz'),
  ], ['Ожидает', 'Yetkazilmoqda', 'Доставлено', 'Nomaʼlum'])
})

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

test('warehouse client parser preserves scoped contract-period availability', () => {
  assert.deepEqual(parseWarehouseClients([{
    id: 'client-1',
    calories: 1600,
    isActive: true,
    contractPeriods: [{
      customerId: 'client-1',
      startDate: '2026-09-01T00:00:00.000Z',
      endDate: '2026-09-07T00:00:00.000Z',
      isActive: true,
      disabledDates: ['2026-09-04'],
    }],
  }]), [{
    id: 'client-1',
    calories: 1600,
    isActive: true,
    contractPeriods: [{
      customerId: 'client-1',
      startDate: '2026-09-01',
      endDate: '2026-09-07',
      isActive: true,
      disabledDates: ['2026-09-04'],
    }],
  }])
})

test('effective demand excludes disabled order dates without dropping order history', () => {
  const orders = [
    { id: 'order-disabled', customerId: 'client-1', quantity: 1, calories: 1600, deliveryDate: '2026-08-28T00:00:00.000Z' },
    { id: 'order-active', customerId: 'client-1', quantity: 1, calories: 1600, deliveryDate: '2026-08-28T00:00:00.000Z' },
  ]
  const effective = resolveEffectiveOrdersForDate(orders, [{ id: 'client-1', isActive: true }], '2026-08-28', new Set(), new Set(['order-disabled:2026-08-28']))
  assert.deepEqual(effective.map((order) => order.id), ['order-active'])
  assert.equal(orders.length, 2)
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
    { date: '2026-08-22', menuNumber: 4, color: '#c14e24', dishes: { '1': 5, invalid: -1 }, cookedStats: { '1': { '1200': 2 } } },
    { date: '2026-08-23', menuNumber: 5, color: 'not-a-color', dishes: { '2': 3 }, cookedStats: {} },
    { date: 'bad', menuNumber: '4' },
  ] }), [
    { date: '2026-08-22', menuNumber: 4, color: '#c14e24', dishes: { '1': 5 }, cookedStats: { '1': { '1200': 2 } }, consumption: [], provenanceLabels: {} },
    { date: '2026-08-23', menuNumber: 5, dishes: { '2': 3 }, cookedStats: {}, consumption: [], provenanceLabels: {} },
  ])
})
