import assert from 'node:assert/strict'
import test from 'node:test'
import { filterOrdersByEffectiveContractPeriods, getEffectiveCalorieDistribution, resolveEffectiveOrdersForDate } from '@/lib/warehouse/effective-demand'

test('effective calculator demand excludes inactive clients and disabled client days', () => {
  const orders = [
    { customerId: 'active', quantity: 2, calories: 1600, deliveryDate: '2026-09-01T00:00:00.000Z' },
    { customerId: 'disabled-day', quantity: 3, calories: 2000, deliveryDate: '2026-09-01T00:00:00.000Z' },
    { customerId: 'inactive', quantity: 4, calories: 2000, deliveryDate: '2026-09-01T00:00:00.000Z' },
    { customerId: 'active', quantity: 7, calories: 2000, deliveryDate: '2026-09-02T00:00:00.000Z' },
  ]
  const clients = [
    { id: 'active', calories: 1600, isActive: true },
    { id: 'disabled-day', calories: 2000, isActive: true },
    { id: 'inactive', calories: 2000, isActive: false },
  ]
  assert.deepEqual(resolveEffectiveOrdersForDate(orders, clients, '2026-09-01', new Set(['disabled-day:2026-09-01'])), [orders[0]])
})

test('effective resolver excludes orders outside a client contract period', () => {
  const orders = [
    { id: 'inside', customerId: 'client-1', quantity: 1, calories: 1600, deliveryDate: '2026-09-03T00:00:00.000Z' },
    { id: 'outside', customerId: 'client-1', quantity: 1, calories: 1600, deliveryDate: '2026-09-08T00:00:00.000Z' },
  ]
  const effective = resolveEffectiveOrdersForDate(orders, [{
    id: 'client-1',
    isActive: true,
    contractPeriods: [{ customerId: 'client-1', startDate: '2026-09-01', endDate: '2026-09-07', isActive: true }],
  }], '2026-09-03', new Set())
  assert.deepEqual(effective.map((order) => order.id), ['inside'])
})

test('effective calculator demand scales calorie distribution by active order quantity', () => {
  const orders = [
    { customerId: 'active', quantity: 3, calories: 1600, deliveryDate: '2026-09-01T00:00:00.000Z' },
    { customerId: 'active', quantity: 2, calories: 2000, deliveryDate: '2026-09-01T00:00:00.000Z' },
  ]
  assert.deepEqual(
    getEffectiveCalorieDistribution(orders, [{ id: 'active', isActive: true }], '2026-09-01', new Set()),
    { 1200: 0, 1600: 3, 2000: 2, 2500: 0, 3000: 0 },
  )
})

test('contract-period availability honors enabled weekdays as well as dates', () => {
  const orders = [
    { id: 'monday', customerId: 'client-1', quantity: 1, calories: 1600, deliveryDate: '2026-09-07T00:00:00.000Z' },
    { id: 'tuesday', customerId: 'client-1', quantity: 1, calories: 1600, deliveryDate: '2026-09-08T00:00:00.000Z' },
  ]
  assert.deepEqual(
    filterOrdersByEffectiveContractPeriods(orders, [{
      customerId: 'client-1', startDate: '2026-09-01', endDate: '2026-09-14', isActive: true, enabledWeekdays: ['MONDAY'],
    }]),
    [orders[0]],
  )
})

test('contract-period availability excludes only out-of-period and disabled future demand', () => {
  const orders = [
    { id: 'inside', customerId: 'client-1', quantity: 1, calories: 1600, deliveryDate: '2026-09-03T00:00:00.000Z' },
    { id: 'disabled', customerId: 'client-1', quantity: 1, calories: 1600, deliveryDate: '2026-09-04T00:00:00.000Z' },
    { id: 'outside', customerId: 'client-1', quantity: 1, calories: 1600, deliveryDate: '2026-09-08T00:00:00.000Z' },
    { id: 'other-client', customerId: 'client-2', quantity: 1, calories: 1600, deliveryDate: '2026-09-03T00:00:00.000Z' },
  ]
  assert.deepEqual(
    filterOrdersByEffectiveContractPeriods(orders, [
      { customerId: 'client-1', startDate: '2026-09-01', endDate: '2026-09-07', isActive: true, disabledDates: ['2026-09-04'] },
    ]),
    [orders[0]],
  )
})

test('effective calculator demand does not mutate source rows', () => {
  const orders = [{ customerId: 'active', quantity: 1, calories: 1200, deliveryDate: '2026-09-01' }]
  const copy = structuredClone(orders)
  resolveEffectiveOrdersForDate(orders, [{ id: 'active', isActive: true }], '2026-09-01', new Set())
  assert.deepEqual(orders, copy)
})
