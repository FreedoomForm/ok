import assert from 'node:assert/strict'
import test from 'node:test'
import { buildOrderWhere } from '../src/lib/orders/query'

test('builds scoped order query for a middle admin and date range', () => {
  const where = buildOrderWhere({
    role: 'MIDDLE_ADMIN',
    userId: 'middle-1',
    groupAdminIds: ['middle-1', 'low-1'],
    from: '2026-08-20',
    to: '2026-08-21',
    filters: { pending: true, unpaid: true, autoOrders: true },
  })

  assert.deepEqual(where.deletedAt, null)
  assert.deepEqual(where.adminId, { in: ['middle-1', 'low-1'] })
  assert.deepEqual(where.orderStatus, { in: ['PENDING'] })
  assert.deepEqual(where.paymentStatus, { in: ['UNPAID'] })
  assert.equal(where.fromAutoOrder, true)
  assert.ok(Array.isArray(where.OR))
})

test('scopes courier orders to the courier and today', () => {
  const where = buildOrderWhere({
    role: 'COURIER',
    userId: 'courier-1',
  })

  assert.deepEqual(where.courierId, 'courier-1')
  assert.deepEqual(where.deletedAt, null)
  assert.ok(Array.isArray(where.OR))
})

test('does not add a quantity constraint when both quantity filters are selected', () => {
  const where = buildOrderWhere({
    role: 'SUPER_ADMIN',
    userId: 'super-1',
    filters: { singleItem: true, multiItem: true },
  })

  assert.equal('quantity' in where, false)
})
