import assert from 'node:assert/strict'
import test from 'node:test'
import { dispatchOptimizationRequestSchema } from '../src/lib/admin/dispatch'

test('accepts bounded dispatch routes', () => {
  const result = dispatchOptimizationRequestSchema.safeParse({
    routes: [{
      containerId: 'courier-1',
      startPoint: { lat: 41.3, lng: 69.2 },
      stops: [{ orderId: 'order-1', lat: 41.31, lng: 69.21 }],
    }],
  })
  assert.equal(result.success, true)
})

test('rejects unsafe or oversized dispatch requests', () => {
  assert.equal(dispatchOptimizationRequestSchema.safeParse({ routes: [] }).success, false)
  assert.equal(dispatchOptimizationRequestSchema.safeParse({ routes: [{ containerId: '', stops: [] }] }).success, false)
  assert.equal(dispatchOptimizationRequestSchema.safeParse({ routes: [{ containerId: 'route-1', stops: [{ orderId: 'order-1', lat: 91, lng: 69 }] }] }).success, false)
  assert.equal(dispatchOptimizationRequestSchema.safeParse({ routes: [{ containerId: 'route-1', stops: Array.from({ length: 101 }, (_, index) => ({ orderId: `order-${index}`, lat: 41, lng: 69 })) }] }).success, false)
  assert.equal(dispatchOptimizationRequestSchema.safeParse({ routes: Array.from({ length: 21 }, (_, index) => ({ containerId: `route-${index}`, stops: [] })) }).success, false)
})
