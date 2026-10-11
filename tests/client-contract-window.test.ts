import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildClientContractWeekdays } from '../src/lib/admin/clients'
import { buildCourierDayListNotification, courierDayListSystemCode } from '../src/lib/chat/notifications'

test('C6: contract window weekdays mirror the picked delivery days', () => {
  assert.deepEqual(buildClientContractWeekdays({ monday: true, tuesday: true }), ['MONDAY', 'TUESDAY'])
  assert.deepEqual(buildClientContractWeekdays({ sunday: true }), ['SUNDAY'])
  assert.deepEqual(buildClientContractWeekdays({}), [])
  assert.deepEqual(
    buildClientContractWeekdays({ monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true }),
    ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
  )
  // Unknown keys are ignored, explicit false does not enable a day.
  assert.deepEqual(buildClientContractWeekdays({ friday: false, unknown: true } as Record<string, boolean>), [])
})

test('C6: day-list notification renders the courier list and caps at ten rows', () => {
  const content = buildCourierDayListNotification({
    courierName: 'Алишер',
    date: '2026-10-11',
    rows: [
      { orderNumber: 1001, customerName: 'Client A', address: 'Street 1', deliveryTime: '12:00' },
      { orderNumber: 1002, customerName: 'Client B', address: 'Street 2', deliveryTime: '11:30' },
    ],
  })
  assert.match(content, /Заказы на 2026-10-11 для курьера Алишер/)
  assert.match(content, /#1001 — Client A, Street 1, 12:00/)
  assert.match(content, /#1002 — Client B, Street 2, 11:30/)

  const many = buildCourierDayListNotification({
    courierName: 'К',
    date: '2026-10-11',
    rows: Array.from({ length: 14 }, (_, index) => ({ orderNumber: 2000 + index, customerName: `C${index}`, address: 'A', deliveryTime: '12:00' })),
  })
  assert.match(many, /… и ещё 4/)

  assert.equal(
    buildCourierDayListNotification({ courierName: 'К', date: '2026-10-11', rows: [] }),
    'Заказы на 2026-10-11 для курьера К: пока нет заказов.',
  )
  assert.equal(courierDayListSystemCode('2026-10-11T09:00:00.000Z'), 'COURIER_DAY_LIST:2026-10-11')
})
