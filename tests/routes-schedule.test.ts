import assert from 'node:assert/strict'
import test from 'node:test'
import { nextRouteDate, normalizeOrderIds, normalizeRouteBoundary, normalizeRouteColor, normalizeRouteName, normalizeWeekStart } from '../src/lib/routes/schedule'

test('normalizes every date to the Monday of its week', () => {
  assert.equal(normalizeWeekStart('2026-08-26')?.toISOString().slice(0, 10), '2026-08-24')
  assert.equal(normalizeWeekStart('2026-08-23')?.toISOString().slice(0, 10), '2026-08-17')
})

test('accepts bounded route identity and strict hex colors only', () => {
  assert.equal(normalizeRouteName('  North   route '), 'North route')
  assert.equal(normalizeRouteName(''), null)
  assert.equal(normalizeRouteColor('#C14E24'), '#c14e24')
  assert.equal(normalizeRouteColor('red'), null)
})

test('rejects duplicate, malformed or oversized stop ids', () => {
  assert.deepEqual(normalizeOrderIds(['a', 'b']), ['a', 'b'])
  assert.equal(normalizeOrderIds(['a', 'a']), null)
  assert.equal(normalizeOrderIds(['']), null)
})

test('accepts bounded route selection rectangles and rejects malformed geometry', () => {
  assert.deepEqual(normalizeRouteBoundary({ x: 0.1, y: 0.2, width: 0.4, height: 0.3 }), { x: 0.1, y: 0.2, width: 0.4, height: 0.3 })
  assert.equal(normalizeRouteBoundary({ x: 0, y: 0, width: 1.1, height: 0.3 }), null)
  assert.equal(normalizeRouteBoundary({ x: 0, y: 0, width: 0, height: 0.3 }), null)
})

test('moves the selected route day by one calendar day', () => {
  assert.equal(nextRouteDate(new Date('2026-08-24T00:00:00Z'), 1).toISOString().slice(0, 10), '2026-08-25')
  assert.equal(nextRouteDate(new Date('2026-08-24T00:00:00Z'), -1).toISOString().slice(0, 10), '2026-08-23')
})
