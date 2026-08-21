import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_DELIVERY_DAY_SCHEDULE,
  buildAutoOrderCustomerWhere,
  isEligibleForDeliveryDay,
  parseDeliveryDaySchedule,
  autoOrderCreateSchema,
} from '@/lib/admin/auto-orders'

test('auto-order create schema accepts an optional date and rejects extra fields', () => {
  const parsed = autoOrderCreateSchema.safeParse({ targetDate: '2026-08-21' })
  assert.equal(parsed.success, true)
  if (parsed.success) assert.equal(parsed.data.targetDate?.toISOString().startsWith('2026-08-21'), true)

  assert.equal(autoOrderCreateSchema.safeParse({ targetDate: 'not-a-date' }).success, false)
  assert.equal(autoOrderCreateSchema.safeParse({ targetDate: '2026-08-21', days: 30 }).success, false)
})

test('auto-order customer scope includes only active auto-order customers and middle-admin descendants', () => {
  assert.deepEqual(buildAutoOrderCustomerWhere('SUPER_ADMIN', 'super-id', []), {
    isActive: true,
    deletedAt: null,
    autoOrdersEnabled: true,
  })

  assert.deepEqual(buildAutoOrderCustomerWhere('MIDDLE_ADMIN', 'middle-id', ['low-id']), {
    isActive: true,
    deletedAt: null,
    autoOrdersEnabled: true,
    createdBy: { in: ['middle-id', 'low-id'] },
  })
})

test('delivery-day parser defaults malformed schedules to all days', () => {
  assert.deepEqual(parseDeliveryDaySchedule(null), DEFAULT_DELIVERY_DAY_SCHEDULE)
  assert.deepEqual(parseDeliveryDaySchedule('{"monday":true,"friday":false}'), {
    monday: true,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  })
  assert.deepEqual(parseDeliveryDaySchedule('{bad-json'), DEFAULT_DELIVERY_DAY_SCHEDULE)
})

test('delivery-day eligibility maps JavaScript Sunday to the Sunday schedule key', () => {
  const sunday = new Date('2026-08-23T12:00:00.000Z')
  const schedule = { ...DEFAULT_DELIVERY_DAY_SCHEDULE, sunday: false }
  assert.equal(isEligibleForDeliveryDay(schedule, sunday), false)
  assert.equal(isEligibleForDeliveryDay(DEFAULT_DELIVERY_DAY_SCHEDULE, new Date('2026-08-24T12:00:00.000Z')), true)
})
