import assert from 'node:assert/strict'
import test from 'node:test'
import { collectEnabledPeriodFirstDays, type ContractPeriodMarker } from '../src/lib/contracts/period-markers'

const markers: ContractPeriodMarker[] = [
  { id: 'period-a', startDate: '2026-09-01', endDate: '2026-09-07', color: '#2563eb', courierName: 'Anna', status: 'ENABLED' },
  { id: 'period-b', startDate: '2026-09-08', endDate: '2026-09-14', color: null, courierName: null, status: 'ENABLED' },
  { id: 'period-disabled', startDate: '2026-09-15', endDate: '2026-09-21', color: '#dc2626', courierName: 'Ivan', status: 'DISABLED' },
]

test('marks the enabled first day of each visible period with its courier color', () => {
  const result = collectEnabledPeriodFirstDays(
    markers,
    ['2026-08-31', '2026-09-01', '2026-09-02', '2026-09-08'],
    () => true,
  )
  assert.deepEqual(result, [
    { markerId: 'period-a', date: '2026-09-01', color: '#2563eb', courierName: 'Anna' },
    { markerId: 'period-b', date: '2026-09-08', color: null, courierName: null },
  ])
})

test('skips the first day when the effective state disables it on that date', () => {
  const result = collectEnabledPeriodFirstDays(
    markers,
    ['2026-09-01', '2026-09-08'],
    (marker, date) => !(marker.id === 'period-a' && date === '2026-09-01'),
  )
  assert.deepEqual(result.map((row) => row.markerId), ['period-b'])
})

test('never marks disabled periods even when the calendar day is enabled', () => {
  const result = collectEnabledPeriodFirstDays(
    markers,
    ['2026-09-15', '2026-09-16'],
    () => true,
  )
  assert.deepEqual(result, [])
})

test('ignores start dates outside the visible calendar window', () => {
  const result = collectEnabledPeriodFirstDays(
    markers,
    ['2026-09-02', '2026-09-03'],
    () => true,
  )
  assert.deepEqual(result, [])
})

test('returns no markers for empty inputs without mutating arguments', () => {
  assert.deepEqual(collectEnabledPeriodFirstDays([], ['2026-09-01'], () => true), [])
  assert.deepEqual(collectEnabledPeriodFirstDays(markers, [], () => true), [])
  assert.equal(markers.length, 3)
})
