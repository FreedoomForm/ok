import assert from 'node:assert/strict'
import test from 'node:test'

import {
  filterDeletedClients,
  filterDeletedOrders,
  hasActiveDispatchedOrder,
  parseClientFinanceProjections,
} from '@/components/admin/dashboard/projections'
import type { Client, Order } from '@/components/admin/dashboard/types'

const order = (overrides: Partial<Order> = {}): Order => ({
  id: 'order-1',
  orderNumber: 1,
  customer: { name: 'Alice', phone: '+998901112233' },
  deliveryAddress: 'Tashkent',
  deliveryTime: '12:00',
  quantity: 1,
  calories: 1600,
  specialFeatures: '',
  paymentStatus: 'UNPAID',
  paymentMethod: 'CASH',
  orderStatus: 'NEW',
  isPrepaid: false,
  createdAt: '2026-08-21T00:00:00.000Z',
  ...overrides,
})

const client = (overrides: Partial<Client> = {}): Client => ({
  id: 'client-1',
  name: 'Alice',
  phone: '+998901112233',
  address: 'Tashkent',
  calories: 1600,
  planType: 'CLASSIC',
  dailyPrice: 100,
  balance: 0,
  specialFeatures: '',
  deliveryDays: {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: true,
    sunday: true,
  },
  autoOrdersEnabled: true,
  isActive: true,
  createdAt: '2026-08-21T00:00:00.000Z',
  ...overrides,
})

test('dashboard projections filter bin entities across user-visible fields', () => {
  assert.deepEqual(filterDeletedOrders([order(), order({ id: 'order-2', orderStatus: 'DELIVERED', customer: { name: 'Bob', phone: '+99890' } })], 'delivered'), [order({ id: 'order-2', orderStatus: 'DELIVERED', customer: { name: 'Bob', phone: '+99890' } })])
  assert.deepEqual(filterDeletedClients([client(), client({ id: 'client-2', name: 'Bob', address: 'Samarkand' })], 'samarkand'), [client({ id: 'client-2', name: 'Bob', address: 'Samarkand' })])
})

test('finance projection parser ignores unsafe rows and defaults missing daily price', () => {
  assert.deepEqual(parseClientFinanceProjections([
    { id: 'client-1', balance: 120, dailyPrice: 15 },
    { id: 'client-2', balance: 50 },
    { id: 'client-3', balance: Number.NaN },
    { balance: 10 },
  ]), {
    'client-1': { balance: 120, dailyPrice: 15 },
    'client-2': { balance: 50, dailyPrice: 0 },
  })
})

test('active dispatched detection is restricted to today and non-new statuses', () => {
  assert.equal(hasActiveDispatchedOrder([order({ courierId: 'courier-1', orderStatus: 'IN_DELIVERY' })], true), true)
  assert.equal(hasActiveDispatchedOrder([order({ courierId: 'courier-1', orderStatus: 'NEW' })], true), false)
  assert.equal(hasActiveDispatchedOrder([order({ courierId: 'courier-1', orderStatus: 'IN_DELIVERY' })], false), false)
})
