import assert from 'node:assert/strict'
import test from 'node:test'

import { parseCourierOrders, parseCourierProfile } from '../src/lib/courier/page-contract'

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
