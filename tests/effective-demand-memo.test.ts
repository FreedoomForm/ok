import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createEffectiveOrderResolver,
  getEffectiveCalorieDistribution,
  resolveEffectiveOrdersForDate,
  type EffectiveContractPeriod,
} from '../src/lib/warehouse/effective-demand'
import type { WarehouseClient, WarehouseOrder } from '../src/lib/warehouse/warehouse-data'

function order(id: string, customerId: string, date: string, calories?: number, quantity?: number): WarehouseOrder {
  return { id, customerId, deliveryDate: `${date}T12:00:00.000Z`, calories, quantity } as unknown as WarehouseOrder
}

function client(id: string, isActive: boolean, periods?: EffectiveContractPeriod[]): WarehouseClient {
  return { id, isActive, ...(periods ? { contractPeriods: periods } : {}) } as unknown as WarehouseClient
}

const period: EffectiveContractPeriod = {
  customerId: 'client-1',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  isActive: true,
  enabledWeekdays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
}

const orders = [
  order('o1', 'client-1', '2026-03-02', 1500, 2),
  order('o2', 'client-2', '2026-03-02', 2600, 1),
  order('o3', 'client-1', '2026-03-03', 1900),
  order('o4', 'client-3', '2026-03-02', 2200, 3),
]
const clients = [
  client('client-1', true, [period]),
  client('client-2', true),
  client('client-3', false),
]

test('repeated resolutions with stable inputs return the same cached reference', () => {
  const resolver = createEffectiveOrderResolver(orders, clients, new Set(), new Set())
  const first = resolver.ordersForDate('2026-03-02')
  const second = resolver.ordersForDate('2026-03-02')
  assert.equal(first, second, 'same date + stable inputs must hit the cache identity')
  assert.equal(first.length, 2)

  const distributionA = resolver.calorieDistribution('2026-03-02')
  const distributionB = resolver.calorieDistribution('2026-03-02')
  assert.equal(distributionA, distributionB, 'distribution must be cached per input identity too')
})

test('memoized resolver matches the pure resolver for every date', () => {
  const resolver = createEffectiveOrderResolver(orders, clients, new Set(['client-2:2026-03-02']), new Set(['o4:2026-03-02']))
  for (const date of ['2026-03-02', '2026-03-03', '2026-03-04']) {
    const expected = resolveEffectiveOrdersForDate(orders, clients, date, new Set(['client-2:2026-03-02']), new Set(['o4:2026-03-02']))
    assert.deepEqual(resolver.ordersForDate(date), expected)
    const distribution = resolver.calorieDistribution(date)
    const expectedDistribution = getEffectiveCalorieDistribution(orders, clients, date, new Set(['client-2:2026-03-02']), new Set(['o4:2026-03-02']))
    assert.deepEqual(distribution, expectedDistribution)
  }
})

test('any input identity change rebuilds the cache', () => {
  const disabledClientDates = new Set<string>()
  const resolver = createEffectiveOrderResolver(orders, clients, disabledClientDates, new Set())
  const before = resolver.ordersForDate('2026-03-02')
  assert.equal(before.length, 2)

  disabledClientDates.add('client-1:2026-03-02')
  const stale = resolver.ordersForDate('2026-03-02')
  assert.equal(stale, before, 'mutating the same Set must not invalidate (identity unchanged — caller swaps references)')

  const swapped = new Set(['client-1:2026-03-02'])
  const resolver2 = createEffectiveOrderResolver(orders, clients, swapped, new Set())
  const first = resolver2.ordersForDate('2026-03-02')
  assert.equal(first.length, 1)
  const next = createEffectiveOrderResolver(orders, clients, new Set(), new Set())
  assert.notEqual(next.ordersForDate('2026-03-02'), first, 'a new input identity recomputes')
})

test('new orders identity invalidates previously cached dates', () => {
  const resolver = createEffectiveOrderResolver(orders, clients, new Set(), new Set())
  const cached = resolver.ordersForDate('2026-03-02')
  const extended = [...orders, order('o5', 'client-2', '2026-03-02', 1300, 1)]
  const next = createEffectiveOrderResolver(extended, clients, new Set(), new Set())
  const refreshed = next.ordersForDate('2026-03-02')
  assert.notEqual(refreshed, cached)
  assert.equal(refreshed.length, 3)
})
