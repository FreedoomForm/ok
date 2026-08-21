import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildInitialCalorieGroups,
  buildMenuSetWhere,
  setCreateSchema,
} from '@/lib/admin/sets'

test('set create schema bounds names and descriptions while stripping unknown fields', () => {
  const parsed = setCreateSchema.safeParse({
    name: 'Healthy Week',
    description: 'Standard menu set',
    adminId: 'must-not-be-assigned-by-request',
  })

  assert.equal(parsed.success, true)
  if (parsed.success) {
    assert.deepEqual(parsed.data, { name: 'Healthy Week', description: 'Standard menu set' })
  }

  assert.equal(setCreateSchema.safeParse({ name: '   ' }).success, false)
  assert.equal(setCreateSchema.safeParse({ name: 'x'.repeat(201) }).success, false)
  assert.equal(setCreateSchema.safeParse({ name: 'Valid', description: 'x'.repeat(2_001) }).success, false)
})

test('menu set scope uses the selected owner admin or remains global for super admin', () => {
  assert.deepEqual(buildMenuSetWhere('middle-id'), { adminId: 'middle-id' })
  assert.deepEqual(buildMenuSetWhere(null), {})
})

test('initial calorie groups preserve every canonical menu and typed dish projection', () => {
  const groups = buildInitialCalorieGroups()
  const menuKeys = Object.keys(groups)

  assert.equal(menuKeys.length, 21)
  assert.deepEqual(groups['1']?.[0], {
    id: 'group-1',
    name: '1',
    calories: 0,
    dishes: groups['1']?.[0]?.dishes,
  })
  assert.ok(groups['1']?.[0]?.dishes.length)
  assert.equal(typeof groups['1']?.[0]?.dishes[0]?.dishId, 'number')
  assert.equal(typeof groups['1']?.[0]?.dishes[0]?.dishName, 'string')
  assert.equal(typeof groups['1']?.[0]?.dishes[0]?.mealType, 'string')
})
