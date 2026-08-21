import assert from 'node:assert/strict'
import test from 'node:test'

import { buildBulkClientUpdates, buildBulkOrderUpdates } from '@/components/admin/dashboard/bulk-mutations'

test('bulk order builder omits empty form fields and preserves supported names', () => {
  assert.deepEqual(buildBulkOrderUpdates({
    orderStatus: 'IN_DELIVERY',
    paymentStatus: '',
    courierId: 'none',
    deliveryDate: '',
  }), { orderStatus: 'IN_DELIVERY', courierId: 'none' })
})

test('bulk client builder preserves boolean false and legacy numeric strings', () => {
  assert.deepEqual(buildBulkClientUpdates({ isActive: false, calories: '1600' }), {
    isActive: false,
    calories: '1600',
  })
  assert.deepEqual(buildBulkClientUpdates({ isActive: undefined, calories: '' }), {})
})
