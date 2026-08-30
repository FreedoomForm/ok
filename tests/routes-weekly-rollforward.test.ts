import assert from 'node:assert/strict'
import test from 'node:test'

import { planWeeklyRouteRollForward, selectRollForwardStopCandidates } from '../src/lib/routes/weekly-rollforward'

const route = (overrides: Record<string, unknown>) => ({
  id: 'r1',
  name: 'Monday route',
  color: '#2563eb',
  courierId: 'c1',
  boundary: { x: 0.1, y: 0.1, width: 0.4, height: 0.4 },
  weekStart: '2026-08-24',
  isActive: true,
  deletedAt: null,
  ...overrides,
})

test('enabled routes roll forward into the target week with idempotent skips', () => {
  const plans = planWeeklyRouteRollForward(
    [
      route({ id: 'r-old', name: 'Fresh area', courierId: 'c2' }),
      route({ id: 'r-disabled', name: 'Disabled area', courierId: 'c3', isActive: false }),
      route({ id: 'r-trashed', name: 'Trashed area', courierId: 'c4', deletedAt: '2026-08-25T00:00:00.000Z' }),
      route({ id: 'r-current', name: 'Current week', courierId: 'c5', weekStart: '2026-08-31' }),
      route({ id: 'r-rolled', name: 'Already rolled', courierId: 'c6' }),
    ],
    '2026-08-31',
    [route({ id: 'r-existing', name: 'Already rolled', courierId: 'c6', weekStart: '2026-08-31' })],
  )
  assert.deepEqual(plans.map((plan) => [plan.sourceRouteId, plan.courierId, plan.weekStart]), [
    ['r-old', 'c2', '2026-08-31'],
  ])
  const plan = plans[0]
  assert.equal(plan?.name, 'Fresh area')
  assert.equal(plan?.color, '#2563eb')
  assert.deepEqual(plan?.boundary, { x: 0.1, y: 0.1, width: 0.4, height: 0.4 })
})

test('stop candidates join the target week by courier availability and take no taken orders', () => {
  const orders = [
    { id: 'o1', courierId: 'c2', deliveryDate: '2026-09-02T12:00:00.000Z', customerId: 'k1' },
    { id: 'o2', courierId: 'c2', deliveryDate: '2026-09-03T12:00:00.000Z', customerId: 'k2' },
    { id: 'o3', courierId: 'c9', deliveryDate: '2026-09-03T12:00:00.000Z', customerId: 'k3' },
    { id: 'o4', courierId: 'c2', deliveryDate: '2026-08-25T12:00:00.000Z', customerId: 'k4' },
    { id: 'o5', courierId: 'c2', deliveryDate: null, customerId: 'k5' },
  ]
  const candidates = selectRollForwardStopCandidates(
    orders,
    'c2',
    '2026-08-31',
    new Set(['o2']),
    new Set(['o1']),
  )
  assert.deepEqual(candidates, [])
  const available = selectRollForwardStopCandidates(orders, 'c2', '2026-08-31', new Set(), new Set())
  assert.deepEqual(available, ['o1', 'o2'])
})
