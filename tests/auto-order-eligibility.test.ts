import assert from 'node:assert/strict'
import test from 'node:test'

import { isAutoOrderEligibleOn } from '@/lib/scheduling/auto-order-eligibility'

test('shared auto-order eligibility honors customer, contract, weekday, and disabled-date state', () => {
  const customer = {
    autoOrdersEnabled: true,
    orderPattern: null,
    deliveryDays: { monday: true, tuesday: false, wednesday: true },
    disabledDates: ['2026-08-25'],
    contracts: [{
      status: 'ENABLED' as const,
      periods: [{
        status: 'ENABLED' as const,
        startDate: '2026-08-24',
        endDate: '2026-08-30',
        enabledWeekdays: ['MONDAY', 'TUESDAY', 'WEDNESDAY'],
        disabledDates: ['2026-08-26'],
      }],
    }],
  }

  assert.equal(isAutoOrderEligibleOn(customer, '2026-08-24'), true)
  assert.equal(isAutoOrderEligibleOn(customer, '2026-08-25'), false)
  assert.equal(isAutoOrderEligibleOn(customer, '2026-08-26'), false)
  assert.equal(isAutoOrderEligibleOn(customer, '2026-08-27'), false)
})

test('shared auto-order eligibility preserves legacy weekday behavior without contracts', () => {
  assert.equal(isAutoOrderEligibleOn({ autoOrdersEnabled: true, deliveryDays: { monday: true } }, '2026-08-24'), true)
  assert.equal(isAutoOrderEligibleOn({ autoOrdersEnabled: true, deliveryDays: { monday: false } }, '2026-08-24'), false)
  assert.equal(isAutoOrderEligibleOn({ autoOrdersEnabled: false, deliveryDays: { monday: true } }, '2026-08-24'), false)
})
