import assert from 'node:assert/strict'
import test from 'node:test'
import { routeOptimizationRequestSchema } from '../src/lib/admin/route-optimize'

test('accepts compatible route optimization requests', () => {
  const result = routeOptimizationRequestSchema.safeParse({
    orders: [{ id: 'order-1', address: 'Tashkent', latitude: 41.3, longitude: 69.2 }],
    startPoint: { lat: 41.29, lng: 69.24 },
  })

  assert.equal(result.success, true)
})

test('rejects unbounded route optimization requests', () => {
  assert.equal(routeOptimizationRequestSchema.safeParse({ orders: [] }).success, false)
  assert.equal(routeOptimizationRequestSchema.safeParse({ orders: [{ id: 'order-1', address: '' }] }).success, false)
  assert.equal(routeOptimizationRequestSchema.safeParse({ orders: [{ id: 'order-1', address: 'Tashkent', latitude: 91 }] }).success, false)
  assert.equal(routeOptimizationRequestSchema.safeParse({ orders: [{ id: 'order-1', address: 'Tashkent' }], startPoint: { lat: 41, lng: 181 } }).success, false)
  assert.equal(routeOptimizationRequestSchema.safeParse({ orders: Array.from({ length: 501 }, (_, index) => ({ id: `order-${index}`, address: 'Tashkent' })) }).success, false)
})
