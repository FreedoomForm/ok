import assert from 'node:assert/strict'
import test from 'node:test'
import { createIngredientSchema, ingredientLifecycleSchema, updateIngredientSchema } from '../src/lib/warehouse/ingredients'

test('preserves ingredient create defaults while accepting valid values', () => {
  const result = createIngredientSchema.safeParse({ name: ' Flour ' })
  assert.equal(result.success, true)
  if (result.success) {
    assert.deepEqual(result.data, {
      name: 'Flour',
      amount: 0,
      unit: 'gr',
      priceUnit: 'kg',
    })
  }
})

test('rejects unsafe ingredient create and update payloads', () => {
  assert.equal(createIngredientSchema.safeParse({ name: '', amount: 1 }).success, false)
  assert.equal(createIngredientSchema.safeParse({ name: 'flour', amount: -1 }).success, false)
  assert.equal(createIngredientSchema.safeParse({ name: 'flour', pricePerUnit: Number.POSITIVE_INFINITY }).success, false)
  assert.equal(updateIngredientSchema.safeParse({ id: 'item-1', name: 'flour', amount: 1, unit: 'gr', priceUnit: 'kg' }).success, true)
  assert.equal(updateIngredientSchema.safeParse({ id: '', name: 'flour', amount: 1, unit: 'gr', priceUnit: 'kg' }).success, false)
})

test('accepts strict ingredient lifecycle enable, disable and restore payloads', () => {
  assert.equal(ingredientLifecycleSchema.safeParse({ id: 'item-1', isActive: true }).success, true)
  assert.equal(ingredientLifecycleSchema.safeParse({ id: 'item-1', isActive: false }).success, true)
  assert.equal(ingredientLifecycleSchema.safeParse({ id: 'item-1', deletedAt: false }).success, true)
  assert.equal(ingredientLifecycleSchema.safeParse({ id: 'item-1', deletedAt: true }).success, true)
  assert.equal(ingredientLifecycleSchema.safeParse({ id: 'item-1' }).success, false)
  assert.equal(ingredientLifecycleSchema.safeParse({ id: 'item-1', unknown: true }).success, false)
  assert.equal(ingredientLifecycleSchema.safeParse({ id: '' }).success, false)
})
