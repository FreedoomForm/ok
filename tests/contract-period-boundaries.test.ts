import assert from 'node:assert/strict'
import { test } from 'node:test'

import { computePeriodBoundaryMarkers } from '../src/lib/contracts/period-boundaries'
import type { ContractDayOverride, EffectiveContractPeriodInput } from '../src/lib/contracts/effective-period'

const ALL_WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']

function period(overrides: Partial<EffectiveContractPeriodInput> = {}): EffectiveContractPeriodInput {
  return {
    id: 'period-1',
    startDate: '2026-10-05', // Monday
    endDate: '2026-10-11', // Sunday
    status: 'ENABLED',
    autoRenew: true,
    enabledWeekdays: ALL_WEEKDAYS,
    disabledDates: [],
    ...overrides,
  }
}

function day(offset: number): string {
  const date = new Date('2026-10-05T00:00:00')
  date.setDate(date.getDate() + offset)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const dayOfMonth = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${dayOfMonth}`
}

function window(from: number, to: number): string[] {
  const dates: string[] = []
  for (let offset = from; offset <= to; offset += 1) dates.push(day(offset))
  return dates
}

test('adjacent transition: the real enabled tile already marks the edge, no virtual marker', () => {
  // Mon..Sun all enabled; Wednesday disabled explicitly — Tuesday (enabled)
  // sits right before the first disabled day, the boundary is visible.
  const periodRow = period()
  const overrides: ContractDayOverride[] = [{ date: day(2), state: 'DISABLED' }]
  const markers = computePeriodBoundaryMarkers(periodRow, overrides, window(0, 6))
  assert.deepEqual(markers, [])
})

test('neutral slot before a disabled stretch renders the ENABLED boundary marker', () => {
  // Assigned Monday + Thursday only. Thursday disabled explicitly — the
  // neutral Wednesday right before it becomes the virtual ENABLED marker
  // ("конец включённого периода"); the cascade into the next Monday is the
  // same disabled stretch, so no second marker fires there.
  const periodRow = period({ enabledWeekdays: ['MONDAY', 'THURSDAY'] })
  const overrides: ContractDayOverride[] = [{ date: day(3), state: 'DISABLED' }] // Thursday
  const markers = computePeriodBoundaryMarkers(periodRow, overrides, window(0, 10))
  assert.deepEqual(
    markers.map((marker) => ({ date: marker.date, state: marker.state })),
    [{ date: day(2), state: 'ENABLED' }], // Wednesday before the disabled Thursday
  )
})

test('matrix вкл→выкл→вкл: both boundaries render on neutral slots with the ending stretch state', () => {
  // Assigned Monday + Thursday. First Thursday disabled, second Thursday
  // re-enabled. Both transitions have a neutral slot right before the new
  // stretch: the disable marks ENABLED on the Wednesday before it; the
  // re-enable marks DISABLED on the Wednesday before the second Thursday.
  const periodRow = period({ enabledWeekdays: ['MONDAY', 'THURSDAY'], endDate: '2026-10-18' })
  const overrides: ContractDayOverride[] = [
    { date: day(3), state: 'DISABLED' }, // first Thursday
    { date: day(10), state: 'ENABLED' }, // second Thursday re-enabled
  ]
  const markers = computePeriodBoundaryMarkers(periodRow, overrides, window(0, 13))
  assert.deepEqual(
    markers.map((marker) => ({ date: marker.date, state: marker.state })),
    [
      { date: day(2), state: 'ENABLED' }, // Wednesday before the disabled Thursday
      { date: day(9), state: 'DISABLED' }, // Wednesday before the re-enabled Thursday
    ],
  )
})

test('marker is not rendered outside the visible window', () => {
  const periodRow = period({ enabledWeekdays: ['MONDAY', 'THURSDAY'] })
  const overrides: ContractDayOverride[] = [{ date: day(3), state: 'DISABLED' }]
  // Window starts on the cascaded Monday — the Wednesday slot before the
  // disabled Thursday is not visible, and the cascaded Monday is the first
  // relevant day (no visible stretch change inside the window).
  const markers = computePeriodBoundaryMarkers(periodRow, overrides, window(7, 7))
  assert.deepEqual(markers, [])
})

test('no marker inside a single disabled stretch with a neutral gap', () => {
  // Monday disabled → Thursday also disabled by cascade; the neutral gap
  // between them belongs to the same disabled stretch, no boundary markers.
  const periodRow = period({ enabledWeekdays: ['MONDAY', 'THURSDAY'] })
  const overrides: ContractDayOverride[] = [{ date: day(0), state: 'DISABLED' }]
  const markers = computePeriodBoundaryMarkers(periodRow, overrides, window(0, 3))
  assert.deepEqual(markers, [])
})

test('markers are deduplicated when two transitions compete for one slot', () => {
  // Wednesday disabled, Thursday re-enabled — the neutral slot between them is
  // claimed by the first transition only (second has a relevant neighbour).
  const periodRow = period({ enabledWeekdays: ALL_WEEKDAYS })
  const overrides: ContractDayOverride[] = [
    { date: day(2), state: 'DISABLED' },
    { date: day(3), state: 'ENABLED' },
  ]
  const markers = computePeriodBoundaryMarkers(periodRow, overrides, window(0, 6))
  // Both transitions are adjacent-relevant, so no virtual slots at all.
  assert.deepEqual(markers, [])
})

test('stored period disabledDates suppress their exact day without cascade', () => {
  // Legacy semantics: period.disabledDates mute their own date only — the
  // cascade belongs to the override layer. The next assigned Monday inside
  // the period is effectively enabled again, so the neutral Sunday before it
  // renders the DISABLED marker of the ended disabled stretch.
  const periodRow = period({ enabledWeekdays: ['MONDAY', 'THURSDAY'], endDate: '2026-10-18', disabledDates: [day(3)] })
  const markers = computePeriodBoundaryMarkers(periodRow, [], window(0, 10))
  assert.deepEqual(
    markers.map((marker) => ({ date: marker.date, state: marker.state })),
    [
      { date: day(2), state: 'ENABLED' }, // Wednesday before the stored-disabled Thursday
      { date: day(6), state: 'DISABLED' }, // Sunday before the next enabled Monday
    ],
  )
})

test('a disabled contract renders no markers at all', () => {
  const periodRow = period({ enabledWeekdays: ['MONDAY', 'THURSDAY'] })
  const overrides: ContractDayOverride[] = [{ date: day(3), state: 'DISABLED' }]
  const markers = computePeriodBoundaryMarkers(periodRow, overrides, window(0, 10), false)
  assert.deepEqual(markers, [])
})
