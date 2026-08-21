import assert from 'node:assert/strict'
import test from 'node:test'
import { orderLifecycleRequestSchema } from '../src/lib/orders/lifecycle'

test('accepts courier lifecycle actions and bounded payment input', () => {
  const parsed = orderLifecycleRequestSchema.parse({
    action: 'complete_delivery',
    amountReceived: '85000',
  })

  assert.deepEqual(parsed, {
    action: 'complete_delivery',
    amountReceived: 85000,
  })
})

test('accepts admin update payload with legacy UI display fields', () => {
  const parsed = orderLifecycleRequestSchema.parse({
    action: 'update_details',
    customerName: 'Customer',
    customerPhone: '+998901112233',
    deliveryAddress: 'Tashkent',
    deliveryTime: '12:00',
    quantity: '2',
    calories: '2200',
    paymentStatus: 'PARTIAL',
    paymentMethod: 'CASH',
    isPrepaid: false,
    amountReceived: null,
    courierId: '',
    assignedSetId: 'null',
    latitude: 41.311,
    longitude: 69.241,
    date: '2026-08-21',
  })

  assert.equal(parsed.quantity, 2)
  assert.equal(parsed.calories, 2200)
  assert.equal(parsed.amountReceived, null)
  assert.equal(parsed.assignedSetId, 'null')
})

test('rejects unknown actions, mass assignment, and unsafe numeric values', () => {
  assert.equal(orderLifecycleRequestSchema.safeParse({ action: 'delete_order' }).success, false)
  assert.equal(orderLifecycleRequestSchema.safeParse({ action: 'update_details', balance: 100 }).success, false)
  assert.equal(orderLifecycleRequestSchema.safeParse({ action: 'update_details', quantity: 0 }).success, false)
  assert.equal(orderLifecycleRequestSchema.safeParse({ action: 'complete_delivery', amountReceived: -1 }).success, false)
  assert.equal(orderLifecycleRequestSchema.safeParse({ action: 'update_details', latitude: 91 }).success, false)
  assert.equal(orderLifecycleRequestSchema.safeParse({ action: 'update_details', date: 'not-a-date' }).success, false)
})
