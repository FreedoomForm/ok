import assert from 'node:assert/strict'
import test from 'node:test'

import {
  isContractEnabledOn,
  nextRenewalPeriod,
  type ContractPeriodDraft,
} from '@/lib/contracts/periods'

const period: ContractPeriodDraft = {
  id: 'period-1',
  startDate: '2026-08-25',
  endDate: '2026-08-31',
  autoRenew: true,
  enabledWeekdays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
  disabledDates: ['2026-08-27'],
}

test('auto-renew creates exactly the next seven-day period', () => {
  assert.deepEqual(nextRenewalPeriod(period), {
    startDate: '2026-09-01',
    endDate: '2026-09-07',
    autoRenew: true,
    enabledWeekdays: period.enabledWeekdays,
    disabledDates: [],
  })
})

test('period without auto-renew does not create a renewal segment', () => {
  assert.equal(nextRenewalPeriod({ ...period, autoRenew: false }), null)
})

test('disabled dates and unselected weekdays never produce effective contract days', () => {
  assert.equal(isContractEnabledOn(period, '2026-08-25'), true)
  assert.equal(isContractEnabledOn(period, '2026-08-27'), false)
  assert.equal(isContractEnabledOn(period, '2026-08-30'), false)
  assert.equal(isContractEnabledOn(period, '2026-09-01'), false)
})
