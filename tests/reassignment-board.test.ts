import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  applyOrderDrop,
  hasUnassignedOrders,
  ordersByTarget,
  unassignedOrderIds,
  REASSIGNMENT_UNASSIGNED,
} from '../src/lib/admin/reassignment-board'

const ORDER_IDS = ['o1', 'o2', 'o3', 'o4']

test('C7: dropping an order binds it to exactly one courier', () => {
  let targets = applyOrderDrop({}, 'o1', 'c1')
  assert.deepEqual(targets, { o1: 'c1' })
  // Re-dropping the same order onto another courier moves it (no duplicates).
  targets = applyOrderDrop(targets, 'o1', 'c2')
  assert.deepEqual(targets, { o1: 'c2' })
})

test('C7: dropping back on the source pane unassigns the order', () => {
  const targets = applyOrderDrop({ o1: 'c1' }, 'o1', REASSIGNMENT_UNASSIGNED)
  assert.deepEqual(targets, { o1: '' })
  assert.deepEqual(unassignedOrderIds(['o1'], targets), ['o1'])
})

test('C7: several orders may share one courier', () => {
  let targets = applyOrderDrop({}, 'o1', 'c1')
  targets = applyOrderDrop(targets, 'o2', 'c1')
  targets = applyOrderDrop(targets, 'o3', 'c2')
  const grouped = ordersByTarget(ORDER_IDS, targets)
  assert.deepEqual(grouped.get('c1'), ['o1', 'o2'])
  assert.deepEqual(grouped.get('c2'), ['o3'])
  assert.deepEqual(unassignedOrderIds(ORDER_IDS, targets), ['o4'])
  assert.equal(hasUnassignedOrders(ORDER_IDS, targets), true)
})

test('C7: save unlocks only when every order is assigned', () => {
  const partial = { o1: 'c1', o2: 'c1' }
  assert.equal(hasUnassignedOrders(ORDER_IDS, partial), true)
  const full = { o1: 'c1', o2: 'c1', o3: 'c2', o4: 'c2' }
  assert.equal(hasUnassignedOrders(ORDER_IDS, full), false)
  // An empty board has no unassigned rows — the dialog additionally disables
  // Save when there is nothing to apply at all.
  assert.equal(hasUnassignedOrders([], {}), false)
})

test('C7: unknown order ids are ignored', () => {
  const targets = applyOrderDrop({ o1: 'c1' }, '', 'c2')
  assert.deepEqual(targets, { o1: 'c1' })
})
