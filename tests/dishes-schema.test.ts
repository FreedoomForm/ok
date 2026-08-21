import assert from 'node:assert/strict'
import test from 'node:test'
import { createDishSchema, updateDishSchema } from '../src/lib/warehouse/dishes'

const validDish = {
  name: 'Soup',
  mealType: 'lunch',
  ingredients: [{ name: 'Flour', amount: 10, unit: 'gr' }],
  calorieMappings: { '7': ['1200', '1600'] },
  menuNumbers: [7],
}

test('accepts compatible dish payloads', () => {
  const result = createDishSchema.safeParse(validDish)
  assert.equal(result.success, true)
  assert.equal(updateDishSchema.safeParse({ id: 'dish-1', ...validDish }).success, true)
})

test('rejects unsafe or inconsistent dish payloads', () => {
  assert.equal(createDishSchema.safeParse({ ...validDish, name: '' }).success, false)
  assert.equal(createDishSchema.safeParse({ ...validDish, ingredients: [{ name: 'Flour', amount: -1, unit: 'gr' }] }).success, false)
  assert.equal(createDishSchema.safeParse({ ...validDish, menuNumbers: [7, 7] }).success, false)
  assert.equal(createDishSchema.safeParse({ ...validDish, menuNumbers: [22] }).success, false)
  assert.equal(createDishSchema.safeParse({ ...validDish, calorieMappings: { '22': ['1600'] } }).success, false)
  assert.equal(createDishSchema.safeParse({ ...validDish, ingredients: Array.from({ length: 201 }, () => ({ name: 'Flour', amount: 1, unit: 'gr' })) }).success, false)
})
