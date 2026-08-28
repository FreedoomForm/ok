import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDeliveryStatistics, buildOrderStatistics, filterEffectiveOrderRows } from '../src/lib/admin/statistics'

test('builds the legacy statistics shape from grouped database counts', () => {
  const stats = buildOrderStatistics({
    statusCounts: [
      { value: 'DELIVERED', count: 4 },
      { value: 'PENDING', count: 2 },
    ],
    prepaidCounts: [
      { value: true, count: 3 },
      { value: false, count: 3 },
    ],
    paymentMethodCounts: [
      { value: 'CARD', count: 5 },
      { value: 'CASH', count: 1 },
    ],
    calorieCounts: [{ value: 1200, count: 4 }],
    quantityCounts: [
      { value: 1, count: 2 },
      { value: 2, count: 3 },
      { value: 4, count: 1 },
    ],
    specialPreferenceCustomers: 2,
    delivery: { dailyCustomers: 1, evenDayCustomers: 2, oddDayCustomers: 3 },
  })

  assert.deepEqual(stats, {
    successfulOrders: 4,
    failedOrders: 0,
    pendingOrders: 2,
    inDeliveryOrders: 0,
    pausedOrders: 0,
    prepaidOrders: 3,
    unpaidOrders: 3,
    cardOrders: 5,
    cashOrders: 1,
    dailyCustomers: 1,
    evenDayCustomers: 2,
    oddDayCustomers: 3,
    specialPreferenceCustomers: 2,
    orders1200: 4,
    orders1600: 0,
    orders2000: 0,
    orders2500: 0,
    orders3000: 0,
    singleItemOrders: 2,
    multiItemOrders: 4,
  })
})

test('counts delivery cadence defensively when a concurrently deleted customer is absent', () => {
  assert.deepEqual(buildDeliveryStatistics([
    { customer: { deliveryDays: JSON.stringify({ monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }) } },
    { customer: { deliveryDays: JSON.stringify({ monday: true, tuesday: true, wednesday: true }) } },
    { customer: null },
  ]), { dailyCustomers: 1, evenDayCustomers: 1, oddDayCustomers: 0 })
})

test('filters statistics order rows on disabled client days without mutating input', () => {
  const rows = [
    { id: 'enabled', customerId: 'client-1', deliveryDate: new Date('2026-08-26T12:00:00.000Z') },
    { id: 'disabled', customerId: 'client-1', deliveryDate: new Date('2026-08-27T12:00:00.000Z') },
    { id: 'other-client', customerId: 'client-2', deliveryDate: new Date('2026-08-27T12:00:00.000Z') },
  ]
  const filtered = filterEffectiveOrderRows(rows, new Map([['client-1', new Set(['2026-08-27'])]]))
  assert.deepEqual(filtered.map((row) => row.id), ['enabled', 'other-client'])
  assert.equal(rows.length, 3)
})
