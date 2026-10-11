import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  computeRenewalExtensionDay,
  decideContractDay,
  effectiveContractDay,
  isOrderSuppressedByContractCascade,
  type ContractDayOverride,
  type EffectiveContractInput,
  type EffectiveContractPeriodInput,
} from '../src/lib/contracts/effective-period'

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
    courierId: 'courier-1',
    ...overrides,
  }
}

function contract(overrides: Partial<EffectiveContractInput> = {}): EffectiveContractInput {
  return {
    status: 'ENABLED',
    autoRenew: true,
    periods: [period()],
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

test('base period: every assigned weekday is enabled without overrides', () => {
  const base = contract()
  for (let offset = 0; offset < 7; offset += 1) {
    assert.equal(effectiveContractDay(base, [], day(offset)), true, day(offset))
  }
})

test('contract or period disabled, and weekday not assigned, disable the day', () => {
  assert.equal(effectiveContractDay(contract({ status: 'DISABLED' }), [], day(0)), false)
  const disabledPeriod = contract({ periods: [period({ status: 'DISABLED' })] })
  assert.equal(effectiveContractDay(disabledPeriod, [], day(0)), false)

  const monTueOnly = contract({ periods: [period({ enabledWeekdays: ['MONDAY', 'TUESDAY'] })] })
  assert.equal(effectiveContractDay(monTueOnly, [], day(0)), true) // Monday
  assert.equal(effectiveContractDay(monTueOnly, [], day(2)), false) // Wednesday
  const decision = decideContractDay(monTueOnly, monTueOnly.periods[0], [], day(2))
  assert.equal(decision.source, 'WEEKDAY_NOT_ASSIGNED')
})

test('stored period disabledDates keep suppressing their exact day', () => {
  const withDisabledDate = contract({ periods: [period({ disabledDates: [day(2)] })] })
  assert.equal(effectiveContractDay(withDisabledDate, [], day(2)), false)
  assert.equal(effectiveContractDay(withDisabledDate, [], day(1)), true)
  assert.equal(effectiveContractDay(withDisabledDate, [], day(3)), true)
})

test('cascade forward: disabling one day disables every later day of the period', () => {
  const base = contract()
  const overrides: ContractDayOverride[] = [{ date: day(2), state: 'DISABLED' }] // Wednesday
  assert.equal(effectiveContractDay(base, overrides, day(1)), true) // Tuesday stays enabled
  assert.equal(effectiveContractDay(base, overrides, day(2)), false)
  assert.equal(effectiveContractDay(base, overrides, day(3)), false) // cascade
  assert.equal(effectiveContractDay(base, overrides, day(6)), false) // cascade reaches Sunday
  const wednesdayDecision = decideContractDay(base, base.periods[0], overrides, day(3))
  assert.equal(wednesdayDecision.source, 'CASCADE_DISABLED')
})

test('matrix вкл→выкл→вкл: explicit re-enable restarts the enabled stretch', () => {
  const base = contract()
  const overrides: ContractDayOverride[] = [
    { date: day(2), state: 'DISABLED' }, // Wednesday disabled
    { date: day(4), state: 'ENABLED' }, // Friday re-enabled
  ]
  assert.equal(effectiveContractDay(base, overrides, day(1)), true)
  assert.equal(effectiveContractDay(base, overrides, day(3)), false) // Thursday: latest decision is the disable
  assert.equal(effectiveContractDay(base, overrides, day(4)), true) // Friday: explicit enable
  assert.equal(effectiveContractDay(base, overrides, day(5)), true) // Saturday: enabled stretch restarted
  assert.equal(effectiveContractDay(base, overrides, day(6)), true)
  const thursday = decideContractDay(base, base.periods[0], overrides, day(3))
  assert.equal(thursday.source, 'CASCADE_DISABLED')
  const friday = decideContractDay(base, base.periods[0], overrides, day(4))
  assert.equal(friday.source, 'OVERRIDE_ENABLED')
})

test('matrix выкл→вкл: disabled start, explicit enable opens the enabled stretch', () => {
  const base = contract()
  const overrides: ContractDayOverride[] = [
    { date: day(0), state: 'DISABLED' }, // Monday disabled
    { date: day(1), state: 'ENABLED' }, // Tuesday re-enabled
  ]
  assert.equal(effectiveContractDay(base, overrides, day(0)), false)
  assert.equal(effectiveContractDay(base, overrides, day(1)), true)
  assert.equal(effectiveContractDay(base, overrides, day(2)), true)
})

test('overrides outside the period do not cascade inside it', () => {
  const base = contract()
  const overrides: ContractDayOverride[] = [{ date: '2026-10-04', state: 'DISABLED' }] // Sunday before the period
  assert.equal(effectiveContractDay(base, overrides, day(0)), true)
})

test('cascade honours the period start, not the contract start', () => {
  const twoPeriods = contract({
    periods: [
      period({ id: 'p1', startDate: '2026-09-28', endDate: '2026-10-04' }),
      period({ id: 'p2', startDate: '2026-10-05', endDate: '2026-10-11' }),
    ],
  })
  const overrides: ContractDayOverride[] = [{ date: '2026-10-01', state: 'DISABLED' }] // inside p1 only
  assert.equal(effectiveContractDay(twoPeriods, overrides, day(0)), true) // p2 Monday unaffected
  const lateDisable = contract({ periods: [period({ startDate: '2026-10-06', endDate: '2026-10-11' })] })
  const lateOverrides: ContractDayOverride[] = [{ date: day(0), state: 'DISABLED' }] // before the period
  assert.equal(effectiveContractDay(lateDisable, lateOverrides, day(1)), true)
})

test('R18: order in an effectively disabled contract day is suppressed, ORDER enable re-includes', () => {
  const base = contract()
  const disabled: ContractDayOverride[] = [{ date: day(2), state: 'DISABLED' }]
  assert.equal(isOrderSuppressedByContractCascade([{ contract: base, overrides: disabled }], day(3)), true)
  assert.equal(isOrderSuppressedByContractCascade([{ contract: base, overrides: disabled }], day(1)), false)
  // Explicit ORDER-level enable wins over the contract cascade.
  assert.equal(
    isOrderSuppressedByContractCascade([{ contract: base, overrides: disabled }], day(3), new Set([day(3)])),
    false,
  )
  // A weekday that the period never serves is not a contract day at all.
  const monTue = contract({ periods: [period({ enabledWeekdays: ['MONDAY', 'TUESDAY'] })] })
  assert.equal(isOrderSuppressedByContractCascade([{ contract: monTue, overrides: [] }], day(2)), false)
  // An effectively enabled contract day is not suppressed.
  assert.equal(isOrderSuppressedByContractCascade([{ contract: base, overrides: [] }], day(1)), false)
})

test('R11: renewal +7 shows the virtual enabled day after the last period until covered', () => {
  const renewal = computeRenewalExtensionDay(contract(), [period()])
  assert.ok(renewal)
  assert.equal(renewal.date, '2026-10-12') // Monday after the period
  assert.equal(renewal.until, '2026-10-18')

  // No auto-renew — no virtual day.
  assert.equal(computeRenewalExtensionDay(contract({ autoRenew: false }), [period({ autoRenew: false })]), null)
  // The virtual day follows the latest ending enabled period: with a real
  // successor present it points at the successor's own unwritten renewal.
  const successor = period({ id: 'p2', startDate: '2026-10-12', endDate: '2026-10-18' })
  assert.equal(computeRenewalExtensionDay(contract(), [period(), successor])?.date, '2026-10-19')
  // The latest enabled period decides, even when an older one matches first.
  const older = period({ id: 'p0', startDate: '2026-09-28', endDate: '2026-10-04', autoRenew: false })
  assert.equal(computeRenewalExtensionDay(contract(), [older, period()])?.date, '2026-10-12')
})
