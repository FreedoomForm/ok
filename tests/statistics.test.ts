import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDeliveryStatistics, buildOrderStatistics, filterEffectiveOrderRows, resolveStatisticsRange, STATISTICS_MAX_RANGE_DAYS } from '../src/lib/admin/statistics'

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

test('legacy statistics requests without date params keep the all-time shape', () => {
  assert.deepEqual(resolveStatisticsRange({}), { kind: 'all' })
  assert.deepEqual(resolveStatisticsRange({ date: null, from: null, to: null }), { kind: 'all' })
})

test('single statistics date resolves to a bounded utc day window', () => {
  const resolved = resolveStatisticsRange({ date: '2026-08-26' })
  if (resolved === 'invalid' || resolved.kind !== 'range') return assert.fail('expected a resolved range')
  assert.equal(resolved.start.toISOString(), '2026-08-26T00:00:00.000Z')
  assert.equal(resolved.end.toISOString(), '2026-08-26T23:59:59.999Z')
})

test('statistics range accepts from=to as the same single-day window', () => {
  const resolved = resolveStatisticsRange({ from: '2026-08-26', to: '2026-08-26' })
  if (resolved === 'invalid' || resolved.kind !== 'range') return assert.fail('expected a resolved range')
  assert.equal(resolved.start.toISOString(), '2026-08-26T00:00:00.000Z')
  assert.equal(resolved.end.toISOString(), '2026-08-26T23:59:59.999Z')
})

test('statistics range accepts a bounded multi-day window ending inclusive', () => {
  const resolved = resolveStatisticsRange({ from: '2026-08-24', to: '2026-08-26' })
  if (resolved === 'invalid' || resolved.kind !== 'range') return assert.fail('expected a resolved range')
  assert.equal(resolved.start.toISOString(), '2026-08-24T00:00:00.000Z')
  assert.equal(resolved.end.toISOString(), '2026-08-26T23:59:59.999Z')
})

test('statistics range without to falls back to the single from day', () => {
  const resolved = resolveStatisticsRange({ from: '2026-08-26', to: null })
  if (resolved === 'invalid' || resolved.kind !== 'range') return assert.fail('expected a resolved range')
  assert.equal(resolved.start.toISOString(), '2026-08-26T00:00:00.000Z')
  assert.equal(resolved.end.toISOString(), '2026-08-26T23:59:59.999Z')
})

test('statistics range rejects inverted, unbounded and malformed windows', () => {
  assert.equal(resolveStatisticsRange({ from: '2026-08-26', to: '2026-08-25' }), 'invalid')
  assert.equal(resolveStatisticsRange({ from: null, to: '2026-08-25' }), 'invalid')
  assert.equal(resolveStatisticsRange({ date: 'not-a-date' }), 'invalid')
  assert.equal(resolveStatisticsRange({ from: 'not-a-date', to: '2026-08-25' }), 'invalid')
  const rejected = resolveStatisticsRange({
    from: '2026-01-01',
    to: new Date(Date.UTC(2026, 0, 1) + STATISTICS_MAX_RANGE_DAYS * 86_400_000 + 86_400_000).toISOString().slice(0, 10),
  })
  assert.equal(rejected, 'invalid')
})

test('statistics range keeps the maximum allowed window verifiable', () => {
  const resolved = resolveStatisticsRange({
    from: '2026-01-01',
    to: new Date(Date.UTC(2026, 0, 1) + (STATISTICS_MAX_RANGE_DAYS - 1) * 86_400_000).toISOString().slice(0, 10),
  })
  if (resolved === 'invalid' || resolved.kind !== 'range') return assert.fail('expected a resolved range')
  const daySpan = Math.floor((resolved.end.getTime() - resolved.start.getTime()) / 86_400_000)
  assert.equal(daySpan, STATISTICS_MAX_RANGE_DAYS - 1)
})
