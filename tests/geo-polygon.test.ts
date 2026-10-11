import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatPeriodLabel,
  isLegacyPanelBoundary,
  isPointInPolygon,
  nextMondayInclusive,
  normalizeRouteGeoBoundary,
  orderIdsInsidePolygon,
  parseRouteBoundary,
} from '@/lib/routes/geo-polygon'
import { planWeeklyRouteRollForward, type RollForwardSourceRoute } from '@/lib/routes/weekly-rollforward'

// C9 / R43, R46, R47: real-geo route boundaries, the default period and the
// roll-forward respect for isActive.

const SQUARE: Array<{ lat: number; lng: number }> = [
  { lat: 41.3, lng: 69.24 },
  { lat: 41.3, lng: 69.30 },
  { lat: 41.26, lng: 69.30 },
  { lat: 41.26, lng: 69.24 },
]

test('point-in-polygon captures orders inside the drawn area only', () => {
  assert.equal(isPointInPolygon({ lat: 41.28, lng: 69.27 }, SQUARE), true)
  assert.equal(isPointInPolygon({ lat: 41.31, lng: 69.27 }, SQUARE), false)
  assert.equal(isPointInPolygon({ lat: 41.28, lng: 69.35 }, SQUARE), false)
})

test('polygon capture preserves entry order and skips id-less entries', () => {
  const ids = orderIdsInsidePolygon(
    [
      { id: 'b', position: { lat: 41.28, lng: 69.27 } },
      { position: { lat: 41.28, lng: 69.27 } },
      { id: 'a', position: { lat: 41.31, lng: 69.27 } },
      { id: 'c', position: { lat: 41.29, lng: 69.25 } },
    ],
    SQUARE,
  )
  assert.deepEqual(ids, ['b', 'c'])
})

test('legacy panel-relative rectangles are detected and ignored on read', () => {
  const legacy = { x: 0.15, y: 0.2, width: 0.5, height: 0.5 }
  assert.equal(isLegacyPanelBoundary(legacy), true)
  assert.equal(parseRouteBoundary(legacy), null)
  const geo = { kind: 'geo-polygon', points: SQUARE }
  assert.equal(parseRouteBoundary(geo)?.points.length, 4)
})

test('geo boundary normalizer rejects degenerate and out-of-window polygons', () => {
  assert.equal(normalizeRouteGeoBoundary({ kind: 'geo-polygon', points: SQUARE.slice(0, 2) }), null)
  assert.equal(normalizeRouteGeoBoundary({ kind: 'geo-polygon', points: [{ lat: 55, lng: 37 }, { lat: 56, lng: 38 }, { lat: 55, lng: 38 }] }), null)
  assert.equal(normalizeRouteGeoBoundary({ kind: 'geo-polygon', points: SQUARE })?.points.length, 4)
})

test('the default period runs from today to the next Monday inclusive (R46)', () => {
  // Wednesday 2026-10-14 → Monday 2026-10-19.
  const wednesday = new Date('2026-10-14T00:00:00')
  assert.equal(nextMondayInclusive(wednesday).toISOString().slice(0, 10), '2026-10-19')
  // Monday itself → the NEXT Monday (a week ahead).
  const monday = new Date('2026-10-12T00:00:00')
  assert.equal(nextMondayInclusive(monday).toISOString().slice(0, 10), '2026-10-19')
  // Sunday 2026-10-18 → tomorrow (Monday the 19th).
  const sunday = new Date('2026-10-18T00:00:00')
  assert.equal(nextMondayInclusive(sunday).toISOString().slice(0, 10), '2026-10-19')
  assert.match(formatPeriodLabel(wednesday, nextMondayInclusive(wednesday)), /14\.10 → 19\.10/)
})

function route(overrides: Partial<RollForwardSourceRoute>): RollForwardSourceRoute {
  return { id: 'r1', name: 'Route', color: '#2563eb', courierId: 'c1', boundary: null, weekStart: '2026-10-05', isActive: true, deletedAt: null, ...overrides }
}

test('roll-forward skips disabled routes (R47: disabled does not extend to future weeks)', () => {
  const plans = planWeeklyRouteRollForward(
    [route({ isActive: false }), route({ id: 'r2', name: 'Active', isActive: true })],
    '2026-10-12',
    [],
  )
  assert.equal(plans.length, 1)
  assert.equal(plans[0].name, 'Active')
})
