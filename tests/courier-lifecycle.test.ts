import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCourierLifecycleData, courierLifecycleSchema, getAffectedFutureCourierOrders } from '../src/lib/admin/courier-lifecycle'

const today = new Date('2026-08-25T15:00:00.000Z')

test('courier disable identifies future non-terminal orders for reassignment', () => {
  const affected = getAffectedFutureCourierOrders([
    { id: 'future', orderNumber: 1, deliveryDate: new Date('2026-08-26T00:00:00.000Z'), orderStatus: 'NEW' },
    { id: 'today', orderNumber: 2, deliveryDate: new Date('2026-08-25T03:00:00.000Z'), orderStatus: 'IN_DELIVERY' },
    { id: 'past', orderNumber: 3, deliveryDate: new Date('2026-08-24T00:00:00.000Z'), orderStatus: 'NEW' },
    { id: 'done', orderNumber: 4, deliveryDate: new Date('2026-08-26T00:00:00.000Z'), orderStatus: 'DELIVERED' },
    { id: 'missing-date', orderNumber: 5, deliveryDate: null, orderStatus: 'NEW' },
  ], today)
  assert.deepEqual(affected.map((row) => row.id), ['future', 'today'])
})

test('courier reassignment policy does not mutate its input rows', () => {
  const rows = [{ id: 'future', orderNumber: 1, deliveryDate: new Date('2026-08-26T00:00:00.000Z'), orderStatus: 'NEW' }]
  const result = getAffectedFutureCourierOrders(rows, today)
  assert.notEqual(result, rows)
  assert.equal(rows[0].id, 'future')
})

test('courier lifecycle accepts explicit active state and rejects unknown fields', () => {
  assert.equal(courierLifecycleSchema.safeParse({ courierId: 'courier-1', isActive: true }).success, true)
  assert.equal(courierLifecycleSchema.safeParse({ courierId: 'courier-1', isActive: false }).success, true)
  assert.equal(courierLifecycleSchema.safeParse({ courierId: 'courier-1', isActive: 'false' }).success, false)
  assert.equal(courierLifecycleSchema.safeParse({ courierId: 'courier-1', isActive: false, role: 'COURIER' }).success, false)
  assert.deepEqual(buildCourierLifecycleData({ isActive: false }), { isActive: false })
})
