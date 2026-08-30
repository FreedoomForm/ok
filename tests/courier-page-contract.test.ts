import assert from 'node:assert/strict'
import test from 'node:test'

import { parseCourierContracts, parseCourierOrders, parseCourierProfile } from '../src/lib/courier/page-contract'

test('courier profile parser normalizes balance and rejects malformed identity', () => {
  assert.deepEqual(parseCourierProfile({ id: 'c1', name: 'Courier', email: 'c@example.com', balance: '12000' }), {
    id: 'c1',
    name: 'Courier',
    email: 'c@example.com',
    role: 'COURIER',
    balance: 12000,
  })
  assert.equal(parseCourierProfile({ name: 'Missing ID' }), null)
})

test('courier order parser derives coordinates from customer and address fallbacks', () => {
  const orders = parseCourierOrders([
    {
      id: 'o1',
      orderNumber: 1,
      customer: { name: 'Client', phone: '123', latitude: 41.3, longitude: 69.2 },
      deliveryAddress: 'No coordinates needed',
      orderStatus: 'PENDING',
      deliveryTime: '12:00',
      createdAt: '2026-08-21T00:00:00.000Z',
    },
    {
      id: 'o2',
      deliveryAddress: '41.31, 69.21',
      orderStatus: 'NEW',
    },
    { id: 'invalid', deliveryAddress: 'unknown' },
  ])

  assert.deepEqual(orders.map((order) => [order.id, order.latitude, order.longitude]), [
    ['o1', 41.3, 69.2],
    ['o2', 41.31, 69.21],
    ['invalid', null, null],
  ])
  assert.equal(orders[1]?.customer.name, '')
})

test('courier contract parser normalizes assigned periods with client and weekday data', () => {
  const contracts = parseCourierContracts([
    {
      id: 'p1',
      startDate: '2026-08-30T00:00:00.000Z',
      endDate: '2026-09-05T00:00:00.000Z',
      color: '#2563eb',
      status: 'ENABLED',
      paid: true,
      enabledWeekdays: ['MON', 'WED', 'FRI'],
      contractStatus: 'ENABLED',
      clientName: 'Алишер',
      clientAddress: 'Ташкент, ул. Амира Темура 1',
    },
    {
      id: 'p2',
      startDate: '2026-08-23T00:00:00.000Z',
      endDate: '2026-08-29T00:00:00.000Z',
      status: 'DISABLED',
      paid: false,
      enabledWeekdays: ['TUE'],
      contractStatus: 'ENABLED',
      clientName: 'Дилноза',
    },
  ])

  assert.equal(contracts.length, 2)
  assert.deepEqual(contracts[0], {
    id: 'p1',
    startDate: '2026-08-30T00:00:00.000Z',
    endDate: '2026-09-05T00:00:00.000Z',
    color: '#2563eb',
    status: 'ENABLED',
    paid: true,
    weekdays: ['MON', 'WED', 'FRI'],
    contractStatus: 'ENABLED',
    clientName: 'Алишер',
    clientAddress: 'Ташкент, ул. Амира Темура 1',
  })
  assert.equal(contracts[1]?.color, null)
  assert.equal(contracts[1]?.status, 'DISABLED')
  assert.equal(contracts[1]?.clientAddress, '')
})

test('courier contract parser drops malformed rows and tolerates non-string weekdays', () => {
  const contracts = parseCourierContracts([
    { id: 'p3', startDate: '2026-08-30T00:00:00.000Z', endDate: '2026-09-05T00:00:00.000Z', status: 'ENABLED', enabledWeekdays: 'MON,WED', clientName: 42, contractStatus: 'DISABLED' },
    { id: 'missing-dates', clientName: 'No dates' },
    'not-a-record',
    null,
  ])

  assert.equal(contracts.length, 1)
  const row = contracts[0]
  assert.equal(row?.id, 'p3')
  assert.deepEqual(row?.weekdays, ['MON', 'WED'])
  assert.equal(row?.clientName, '')
  assert.equal(row?.contractStatus, 'DISABLED')
  assert.equal(parseCourierContracts(undefined).length, 0)
  assert.equal(parseCourierContracts('nope').length, 0)
})
