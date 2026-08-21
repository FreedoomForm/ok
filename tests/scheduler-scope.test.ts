import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSchedulerCustomerWhere, buildSchedulerOrderWhere } from '../src/lib/admin/scheduler'

test('keeps scheduler customer scope global for super admins', () => {
  assert.deepEqual(buildSchedulerCustomerWhere(null), { deletedAt: null })
})

test('scopes scheduler customers and future orders to group admins', () => {
  assert.deepEqual(buildSchedulerCustomerWhere(['admin-1', 'admin-2']), {
    deletedAt: null,
    createdBy: { in: ['admin-1', 'admin-2'] },
  })

  const now = new Date('2026-08-21T00:00:00.000Z')
  assert.deepEqual(buildSchedulerOrderWhere(['admin-1'], now), {
    deletedAt: null,
    deliveryDate: { gte: now },
    adminId: { in: ['admin-1'] },
  })
})
