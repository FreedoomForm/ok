import assert from 'node:assert/strict'
import test from 'node:test'
import { courierReassignmentSchema, getReassignmentOrderIds } from '../src/lib/admin/courier-reassignment'

test('courier reassignment accepts bounded unique order assignments', () => {
  const parsed = courierReassignmentSchema.parse({
    courierId: 'courier-old',
    assignments: [
      { orderId: 'order-1', targetCourierId: 'courier-a' },
      { orderId: 'order-2', targetCourierId: 'courier-b' },
    ],
  })

  assert.deepEqual(getReassignmentOrderIds(parsed), ['order-1', 'order-2'])
})

test('courier reassignment rejects duplicate orders, self-targets and empty assignments', () => {
  assert.equal(courierReassignmentSchema.safeParse({ courierId: 'courier-old', assignments: [] }).success, false)
  assert.equal(courierReassignmentSchema.safeParse({ courierId: 'courier-old', assignments: [{ orderId: 'order-1', targetCourierId: 'courier-old' }] }).success, false)
  assert.equal(courierReassignmentSchema.safeParse({ courierId: 'courier-old', assignments: [{ orderId: 'order-1', targetCourierId: 'courier-a' }, { orderId: 'order-1', targetCourierId: 'courier-b' }] }).success, false)
})

test('courier reassignment bounds the migration payload', () => {
  const assignments = Array.from({ length: 501 }, (_, index) => ({ orderId: `order-${index}`, targetCourierId: 'courier-a' }))
  assert.equal(courierReassignmentSchema.safeParse({ courierId: 'courier-old', assignments }).success, false)
})
