import assert from 'node:assert/strict'
import test from 'node:test'
import { adminLifecycleSchema, buildAdminLifecycleData, canManageAdminLifecycle } from '../src/lib/admin/admin-lifecycle'

const middle = { id: 'middle-1', role: 'MIDDLE_ADMIN' }
const low = { id: 'low-1', role: 'LOW_ADMIN', createdBy: 'middle-1' }

test('admin lifecycle accepts bounded trash and explicit enabled state payloads', () => {
  assert.equal(adminLifecycleSchema.safeParse({ id: 'low-1', deletedAt: true }).success, true)
  assert.equal(adminLifecycleSchema.safeParse({ id: 'low-1', isActive: true }).success, true)
  assert.equal(adminLifecycleSchema.safeParse({ id: 'low-1', isActive: false }).success, true)
  assert.equal(adminLifecycleSchema.safeParse({ id: '' , isActive: true }).success, false)
  assert.equal(adminLifecycleSchema.safeParse({ id: 'low-1', deletedAt: 'true' }).success, false)
  assert.equal(adminLifecycleSchema.safeParse({ id: 'low-1' }).success, false)
  assert.equal(adminLifecycleSchema.safeParse({ id: 'low-1', deletedAt: true, role: 'SUPER_ADMIN' }).success, false)
})

test('admin lifecycle preserves hierarchy and blocks self mutation', () => {
  assert.equal(canManageAdminLifecycle(middle, low), true)
  assert.equal(canManageAdminLifecycle(middle, { ...low, createdBy: 'other-middle' }), false)
  assert.equal(canManageAdminLifecycle(middle, { ...low, id: middle.id }), false)
  assert.equal(canManageAdminLifecycle({ id: 'low-1', role: 'LOW_ADMIN' }, low), false)
  assert.equal(canManageAdminLifecycle({ id: 'super-1', role: 'SUPER_ADMIN' }, { ...low, role: 'MIDDLE_ADMIN' }), true)
})

test('admin lifecycle maps trash, restore and explicit state to additive fields', () => {
  assert.deepEqual(buildAdminLifecycleData(false), { deletedAt: null, isActive: true })
  const trashed = buildAdminLifecycleData(true)
  assert.equal(trashed.isActive, false)
  assert.equal(trashed.deletedAt instanceof Date, true)
  assert.deepEqual(buildAdminLifecycleData({ isActive: false }), { isActive: false })
  assert.deepEqual(buildAdminLifecycleData({ isActive: true }), { isActive: true })
})
