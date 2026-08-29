import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveEffectiveCourierId, type ContractPeriodAssignment } from '@/lib/couriers/effective-assignment'

const withCustomer = (customerId: string, assignment: ContractPeriodAssignment) => ({ ...assignment, contractCustomerId: customerId })

const utcDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

const period = (overrides: Partial<ContractPeriodAssignment> = {}): ContractPeriodAssignment => ({
  courierId: 'courier-b',
  startDate: utcDate('2026-08-24'),
  endDate: utcDate('2026-08-30'),
  enabledWeekdays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
  status: 'ENABLED',
  ...overrides,
})

const order = (overrides: Partial<{ courierId: string | null; customerId: string; deliveryDate: Date | null }> = {}) => ({
  courierId: 'courier-a',
  customerId: 'customer-1',
  deliveryDate: utcDate('2026-08-29'),
  ...overrides,
})

test('a covering enabled period replaces the legacy default courier', () => {
  assert.equal(resolveEffectiveCourierId(order(), [withCustomer('customer-1', period())]), 'courier-b')
})

test('without a covering period the order keeps its stored courier', () => {
  assert.equal(resolveEffectiveCourierId(order(), []), 'courier-a')
  assert.equal(resolveEffectiveCourierId(order({ deliveryDate: utcDate('2026-09-20') }), [withCustomer('customer-1', period())]), 'courier-a')
})

test('the period weekday list gates the assignment per day', () => {
  const weekdays = resolveEffectiveCourierId(order(), [withCustomer('customer-1', period({ enabledWeekdays: ['MONDAY'] }))])
  // 2026-08-29 is a Saturday.
  assert.equal(weekdays, 'courier-a')
  assert.equal(resolveEffectiveCourierId(order({ deliveryDate: utcDate('2026-08-24') }), [withCustomer('customer-1', period({ enabledWeekdays: ['MONDAY'] }))]), 'courier-b')
})

test('disabled and deleted periods never resolve', () => {
  assert.equal(resolveEffectiveCourierId(order(), [withCustomer('customer-1', period({ status: 'DISABLED' }))]), 'courier-a')
  assert.equal(resolveEffectiveCourierId(order(), [withCustomer('customer-1', period({ status: 'DELETED' }))]), 'courier-a')
})

test('the latest starting covering period wins', () => {
  const earlier = period({ courierId: 'courier-c', startDate: utcDate('2026-08-24'), endDate: utcDate('2026-08-30') })
  const later = period({ courierId: 'courier-b', startDate: utcDate('2026-08-27'), endDate: utcDate('2026-09-02') })
  assert.equal(resolveEffectiveCourierId(order(), [withCustomer('customer-1', earlier), withCustomer('customer-1', later)]), 'courier-b')
  assert.equal(resolveEffectiveCourierId(order({ deliveryDate: utcDate('2026-08-26') }), [withCustomer('customer-1', earlier), withCustomer('customer-1', later)]), 'courier-c')
})

test('a period with no courier hides the order from every courier', () => {
  assert.equal(resolveEffectiveCourierId(order(), [withCustomer('customer-1', period({ courierId: null }))]), null)
})

test('undated legacy orders keep their stored courier', () => {
  assert.equal(resolveEffectiveCourierId(order({ deliveryDate: null }), [withCustomer('customer-1', period())]), 'courier-a')
})

test('periods of other customers never apply', () => {
  assert.equal(resolveEffectiveCourierId(order(), [withCustomer('customer-2', period())]), 'courier-a')
})
