import assert from 'node:assert/strict'
import test from 'node:test'

import { groupRoutesByCourier } from '../src/lib/routes/rail-grouping'

const route = (overrides: Record<string, unknown>) => ({
  id: 'r1',
  name: 'Route A',
  color: '#2563eb',
  weekStart: '2026-08-24',
  stops: [{ id: 's1' }, { id: 's2' }],
  courier: { id: 'c1', name: 'Курьер А' },
  ...overrides,
})

test('routes rail groups records per courier with deterministic ordering and newest color', () => {
  const groups = groupRoutesByCourier([
    route({ id: 'r-old', name: 'Old week', weekStart: '2026-08-17', color: '#16a34a', courier: { id: 'c2', name: 'Борис' } }),
    route({ id: 'r-new', name: 'New week', weekStart: '2026-08-24', color: '#dc2626', stops: [{ id: 's1' }], courier: { id: 'c2', name: 'Борис' } }),
    route({ id: 'r-a', name: 'Alpha', courier: { id: 'c1', name: 'Алишер' } }),
  ])

  assert.deepEqual(groups.map((group) => group.courierName), ['Алишер', 'Борис'])
  const boris = groups[1]
  assert.equal(boris?.color, '#dc2626')
  assert.equal(boris?.totalStops, 3)
  assert.deepEqual(boris?.routes.map((entry) => [entry.id, entry.stopCount]), [['r-new', 1], ['r-old', 2]])
})

test('routes rail grouping skips malformed rows and survives empty input', () => {
  const groups = groupRoutesByCourier([
    route({ id: 'broken', courier: null }),
    route({ id: 'no-courier-name', courier: { id: 'c9', name: '' } }),
    'junk' as unknown as Record<string, unknown>,
    route({ id: 'r-keep', name: 'Kept', stops: [], courier: { id: 'c3', name: 'Курьер В' } }),
  ])
  assert.equal(groups.length, 1)
  assert.equal(groups[0]?.courierId, 'c3')
  assert.equal(groups[0]?.totalStops, 0)
  assert.deepEqual(groupRoutesByCourier([]), [])
  assert.deepEqual(groupRoutesByCourier(undefined as unknown as never[]), [])
})
