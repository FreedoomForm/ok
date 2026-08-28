import assert from 'node:assert/strict'
import test from 'node:test'
import type { CookingConsumptionRecord } from '../src/lib/warehouse/cooking-consumption'
import { adjustCookingDraftIngredient, setCookingDraftIngredientAmount } from '../src/lib/warehouse/cooking-draft'

const records: CookingConsumptionRecord[] = [{
  dishId: 'dish-1',
  calorie: 1600,
  amount: 2,
  ingredients: [{ name: 'Rice', unit: 'g', amount: 200 }],
}]

test('cooking draft amount edits preserve the saved record shape and source immutability', () => {
  const updated = setCookingDraftIngredientAmount(records, 'dish-1', 1600, 0, 275)

  assert.deepEqual(updated[0]?.ingredients[0], { name: 'Rice', unit: 'g', amount: 275 })
  assert.equal(records[0]?.ingredients[0]?.amount, 200)
  assert.notEqual(updated, records)
})

test('cooking draft plus and minus clamp ingredient amounts at zero', () => {
  const plus = adjustCookingDraftIngredient(records, 'dish-1', 1600, 0, 25)
  const minus = adjustCookingDraftIngredient(plus, 'dish-1', 1600, 0, -400)

  assert.equal(plus[0]?.ingredients[0]?.amount, 225)
  assert.equal(minus[0]?.ingredients[0]?.amount, 0)
})

test('cooking draft edits reject invalid amounts and unknown records', () => {
  assert.throws(() => setCookingDraftIngredientAmount(records, 'dish-1', 1600, 0, Number.NaN), /amount/i)
  assert.deepEqual(adjustCookingDraftIngredient(records, 'missing', 1600, 0, 10), records)
})
