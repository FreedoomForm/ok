import assert from 'node:assert/strict'
import test from 'node:test'

import { isPointInsideBoundary, orderIdsInsideBoundary } from '../src/lib/routes/boundary'

test('boundary inclusion joins tiles whose centers sit inside or on the inclusive edges', () => {
  const boundary = { x: 0.1, y: 0.2, width: 0.5, height: 0.4 }
  assert.equal(isPointInsideBoundary({ centerX: 0.35, centerY: 0.4 }, boundary), true)
  assert.equal(isPointInsideBoundary({ centerX: 0.1, centerY: 0.2 }, boundary), true)
  assert.equal(isPointInsideBoundary({ centerX: 0.6, centerY: 0.6 }, boundary), true)
  assert.equal(isPointInsideBoundary({ centerX: 0.099, centerY: 0.4 }, boundary), false)
  assert.equal(isPointInsideBoundary({ centerX: 0.35, centerY: 0.601 }, boundary), false)
  assert.equal(isPointInsideBoundary({ centerX: 0.61, centerY: 0.4 }, boundary), false)
})

test('order inclusion keeps the caller entry order so the draft selection stays stable', () => {
  const entries = [
    { id: 'order-outside', centerX: 0.9, centerY: 0.9 },
    { id: 'order-inside-second', centerX: 0.3, centerY: 0.3 },
    { id: 'order-inside-first', centerX: 0.2, centerY: 0.5 },
  ]
  assert.deepEqual(orderIdsInsideBoundary(entries, { x: 0.1, y: 0.1, width: 0.5, height: 0.6 }), ['order-inside-second', 'order-inside-first'])
  assert.deepEqual(orderIdsInsideBoundary(entries, { x: 0, y: 0, width: 1, height: 1 }), ['order-outside', 'order-inside-second', 'order-inside-first'])
  assert.deepEqual(orderIdsInsideBoundary([], { x: 0, y: 0, width: 1, height: 1 }), [])
})
