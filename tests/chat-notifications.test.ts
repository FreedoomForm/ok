import assert from 'node:assert/strict'
import test from 'node:test'
import { buildContractAssignmentNotification, buildCourierAssignmentNotification } from '../src/lib/chat/notifications'

test('courier assignment notification includes bounded order and date metadata', () => {
  const message = buildCourierAssignmentNotification({ courierName: 'Иван', orderNumbers: [12, 13], dateRange: '2026-09-01 — 2026-09-07' })
  assert.match(message, /Иван/)
  assert.match(message, /12, 13/)
  assert.match(message, /2026-09-01/)
})

test('contract assignment notification includes period and status metadata', () => {
  const message = buildContractAssignmentNotification({ courierName: 'Иван', contractId: 'contract-1', dateRange: '2026-09-01 — 2026-09-07', weekdays: ['MONDAY', 'WEDNESDAY'], orderNumbers: [22], status: 'ENABLED' })
  assert.match(message, /contract-1/)
  assert.match(message, /MONDAY, WEDNESDAY/)
  assert.match(message, /ENABLED/)
  assert.match(message, /22/)
})

test('courier assignment notification bounds large order lists', () => {
  const message = buildCourierAssignmentNotification({ courierName: 'Иван', orderNumbers: Array.from({ length: 501 }, (_, index) => index + 1), dateRange: '2026-09-01' })
  assert.ok(message.length <= 1200)
  assert.match(message, /и ещё 491/)
})
