import assert from 'node:assert/strict'
import test from 'node:test'

import { parseLiveMapPayload, parseOptimizedRoutes } from '../src/lib/dispatch/live-map-contract'

test('live-map parser keeps valid points and discards malformed rows', () => {
  const payload = parseLiveMapPayload({
    couriers: [
      { id: 'c1', name: 'Courier One', lat: '41.3', lng: 69.2 },
      { id: 'bad', lat: 'not-a-coordinate', lng: 69.2 },
    ],
    clients: [{ id: 'client-1', lat: 41.31, lng: 69.21 }],
    orders: [
      { id: 'o1', orderNumber: 12, customerName: 'Client One', lat: 41.32, lng: 69.22 },
      { id: 'bad-order', lat: null, lng: 69.23 },
    ],
    warehouse: { lat: '41.33', lng: '69.23' },
  })

  assert.deepEqual(payload.couriers, [{ id: 'c1', name: 'Courier One', lat: 41.3, lng: 69.2 }])
  assert.deepEqual(payload.clients, [{ id: 'client-1', name: 'Client', lat: 41.31, lng: 69.21 }])
  assert.equal(payload.orders.length, 1)
  assert.equal(payload.orders[0]?.status, 'NEW')
  assert.deepEqual(payload.warehouse, { lat: 41.33, lng: 69.23 })
})

test('live-map parser normalizes missing payloads to empty collections', () => {
  assert.deepEqual(parseLiveMapPayload(null), {
    couriers: [],
    clients: [],
    orders: [],
    warehouse: null,
  })
})

test('optimized route parser keeps route identity and valid polyline points', () => {
  const routes = parseOptimizedRoutes({
    routes: [
      { containerId: 'c1', polyline: [{ lat: 41.3, lng: 69.2 }, { lat: '41.31', lng: '69.21' }, { lat: 'bad', lng: 69.22 }] },
      { containerId: 'ignored', polyline: 'invalid' },
      { polyline: [{ lat: 1, lng: 2 }] },
    ],
  })

  assert.equal(routes.size, 2)
  assert.deepEqual(routes.get('c1')?.polyline, [{ lat: 41.3, lng: 69.2 }, { lat: 41.31, lng: 69.21 }])
  assert.deepEqual(routes.get('ignored')?.polyline, [])
})
