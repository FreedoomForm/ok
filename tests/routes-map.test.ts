import assert from 'node:assert/strict'
import test from 'node:test'
import { buildGoogleMapsRouteUrl } from '../src/lib/routes/map-url'

test('route map URL preserves origin, waypoints and destination order', () => {
  const url = buildGoogleMapsRouteUrl([
    { latitude: 41.31, longitude: 69.24 },
    { latitude: 41.32, longitude: 69.25 },
    { latitude: 41.33, longitude: 69.26 },
  ])
  assert.equal(url, 'https://www.google.com/maps/dir/?api=1&destination=41.33%2C69.26&origin=41.31%2C69.24&waypoints=41.32%2C69.25')
})

test('route map URL supports one point and rejects invalid coordinates', () => {
  assert.equal(buildGoogleMapsRouteUrl([{ latitude: 41.31, longitude: 69.24 }]), 'https://www.google.com/maps/dir/?api=1&destination=41.31%2C69.24')
  assert.equal(buildGoogleMapsRouteUrl([{ latitude: 95, longitude: 69.24 }, { latitude: null, longitude: 1 }]), null)
})
