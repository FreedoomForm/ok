import assert from 'node:assert/strict'
import test from 'node:test'
import { adminTargetIdSchema, canDeactivateAdmin } from '../src/lib/admin/admin-mutations'

test('prevents a super admin from deactivating the current account', () => {
  assert.equal(canDeactivateAdmin('admin-1', 'admin-1', false), false)
  assert.equal(canDeactivateAdmin('admin-1', 'admin-1', true), true)
  assert.equal(canDeactivateAdmin('admin-1', 'admin-2', false), true)
})

test('bounds dynamic target admin IDs', () => {
  assert.equal(adminTargetIdSchema.safeParse('admin-1').success, true)
  assert.equal(adminTargetIdSchema.safeParse('').success, false)
  assert.equal(adminTargetIdSchema.safeParse('x'.repeat(129)).success, false)
})
