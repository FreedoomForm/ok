import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isCustomerScheduledOn } from '../src/lib/contracts/effective-schedule'
import { isAutoOrderEligibleOn } from '../src/lib/scheduling/auto-order-eligibility'

const enabledPeriod = {
  status: 'ENABLED' as const,
  startDate: '2026-01-05',
  endDate: '2026-01-11',
  enabledWeekdays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
  disabledDates: [],
}

test('contract-level disabled day override excludes that day from scheduling', () => {
  const scheduled = isCustomerScheduledOn(
    {
      autoOrdersEnabled: true,
      contracts: [{ status: 'ENABLED', periods: [enabledPeriod] }],
    },
    '2026-01-06',
  )
  assert.equal(scheduled, true)

  const blocked = isCustomerScheduledOn(
    {
      autoOrdersEnabled: true,
      contracts: [
        {
          status: 'ENABLED',
          disabledDates: ['2026-01-06'],
          periods: [enabledPeriod],
        },
      ],
    },
    '2026-01-06',
  )
  assert.equal(blocked, false)
})

test('contract-level disabled override blocks only the listed day', () => {
  const customer = {
    autoOrdersEnabled: true,
    contracts: [
      {
        status: 'ENABLED' as const,
        disabledDates: ['2026-01-06T00:00:00.000Z'],
        periods: [enabledPeriod],
      },
    ],
  }
  assert.equal(isCustomerScheduledOn(customer, '2026-01-06'), false)
  assert.equal(isCustomerScheduledOn(customer, '2026-01-07'), true)
})

test('contract-level override does not leak into sibling contracts', () => {
  const customer = {
    autoOrdersEnabled: true,
    contracts: [
      { status: 'ENABLED' as const, disabledDates: ['2026-01-06'], periods: [enabledPeriod] },
      { status: 'ENABLED' as const, periods: [enabledPeriod] },
    ],
  }
  assert.equal(isCustomerScheduledOn(customer, '2026-01-06'), true)
})

test('disabled contract status still wins regardless of overrides', () => {
  const blocked = isCustomerScheduledOn(
    {
      autoOrdersEnabled: true,
      contracts: [
        {
          status: 'DISABLED' as const,
          disabledDates: ['2030-01-01'],
          periods: [enabledPeriod],
        },
      ],
    },
    '2026-01-06',
  )
  assert.equal(blocked, false)
})

test('isAutoOrderEligibleOn propagates contract-level day overrides', () => {
  const base = {
    autoOrdersEnabled: true,
    deliveryDays: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true },
  }
  const withoutOverride = { ...base, contracts: [{ status: 'ENABLED' as const, periods: [enabledPeriod] }] }
  const withOverride = {
    ...base,
    contracts: [{ status: 'ENABLED' as const, disabledDates: ['2026-01-06'], periods: [enabledPeriod] }],
  }
  assert.equal(isAutoOrderEligibleOn(withoutOverride, '2026-01-06'), true)
  assert.equal(isAutoOrderEligibleOn(withOverride, '2026-01-06'), false)
})
