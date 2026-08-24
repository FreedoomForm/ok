import assert from 'node:assert/strict'
import test from 'node:test'

import {
  availabilityForDate,
  buildAvailabilityCalendar,
  normalizeIsoDate,
  type ResourceAvailabilityOverride,
} from '@/lib/resources/availability'

test('every resource is enabled by default when no day override exists', () => {
  assert.equal(availabilityForDate([], '2026-08-25'), 'ENABLED')
})

test('disabled and enabled day overrides are resolved by date without mutating other days', () => {
  const overrides: ResourceAvailabilityOverride[] = [
    { date: '2026-08-25', state: 'DISABLED' },
    { date: '2026-08-27', state: 'ENABLED' },
  ]
  assert.equal(availabilityForDate(overrides, '2026-08-25'), 'DISABLED')
  assert.equal(availabilityForDate(overrides, '2026-08-26'), 'ENABLED')
  assert.equal(availabilityForDate(overrides, '2026-08-27'), 'ENABLED')
})

test('calendar returns every day in the requested period and keeps explicit state lines', () => {
  const calendar = buildAvailabilityCalendar(
    [{ date: '2026-08-26', state: 'DISABLED' }],
    '2026-08-25',
    '2026-08-27',
  )
  assert.deepEqual(calendar, [
    { date: '2026-08-25', state: 'ENABLED' },
    { date: '2026-08-26', state: 'DISABLED' },
    { date: '2026-08-27', state: 'ENABLED' },
  ])
})

test('date normalization is stable for local calendar input', () => {
  assert.equal(normalizeIsoDate('2026-08-25T23:59:59.000Z'), '2026-08-25')
  assert.equal(normalizeIsoDate('2026-08-25'), '2026-08-25')
})
