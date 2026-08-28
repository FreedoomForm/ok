import assert from 'node:assert/strict'
import test from 'node:test'

import {
  GLOBAL_OPERATIONAL_RESOURCE_KINDS,
  canManageGlobalOperationalResource,
  isGlobalOperationalResource,
} from '@/lib/resources/global-policy'

test('warehouse, dish, and cooking records are explicitly global operational resources', () => {
  assert.deepEqual(GLOBAL_OPERATIONAL_RESOURCE_KINDS, ['INGREDIENT', 'DISH', 'COOKING_RECORD'])
  for (const kind of GLOBAL_OPERATIONAL_RESOURCE_KINDS) assert.equal(isGlobalOperationalResource(kind), true)
  assert.equal(isGlobalOperationalResource('CLIENT'), false)
})

test('global operational resources use role authorization instead of false owner claims', () => {
  assert.equal(canManageGlobalOperationalResource('SUPER_ADMIN'), true)
  assert.equal(canManageGlobalOperationalResource('MIDDLE_ADMIN'), true)
  assert.equal(canManageGlobalOperationalResource('LOW_ADMIN'), true)
  assert.equal(canManageGlobalOperationalResource('COURIER'), false)
  assert.equal(canManageGlobalOperationalResource('WORKER'), false)
})
