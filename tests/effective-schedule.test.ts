import assert from 'node:assert/strict'
import test from 'node:test'

import { isCustomerScheduledOn } from '@/lib/contracts/effective-schedule'

test('enabled contract period schedules a customer on selected weekday', () => {
  assert.equal(isCustomerScheduledOn({
    autoOrdersEnabled: true,
    orderPattern: 'daily',
    contracts: [{
      status: 'ENABLED',
      autoRenew: false,
      periods: [{
        status: 'ENABLED',
        startDate: '2026-08-25',
        endDate: '2026-08-31',
        enabledWeekdays: ['TUESDAY'],
        disabledDates: [],
      }],
    }],
  }, '2026-08-25'), true)
})

test('disabled contract day and disabled order mode produce no automatic order', () => {
  const input = {
    autoOrdersEnabled: true,
    orderPattern: 'daily',
    contracts: [{
      status: 'ENABLED' as const,
      autoRenew: false,
      periods: [{
        status: 'ENABLED' as const,
        startDate: '2026-08-25',
        endDate: '2026-08-31',
        enabledWeekdays: ['TUESDAY'],
        disabledDates: ['2026-08-25'],
      }],
    }],
  }
  assert.equal(isCustomerScheduledOn(input, '2026-08-25'), false)
  assert.equal(isCustomerScheduledOn({ ...input, autoOrdersEnabled: false }, '2026-08-25'), false)
})
