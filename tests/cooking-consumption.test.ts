import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCookingConsumptionRecord } from '../src/lib/warehouse/cooking-consumption'
import { cookingPlanWriteSchema } from '../src/lib/warehouse/cooking-plan'

test('legacy cooking updates scale recipe ingredients and preserve provenance', () => {
  const record = buildCookingConsumptionRecord({
    dishId: 'dish-1', calorie: 1600, amount: 3,
    provenance: { clientIds: ['c1', 'c1'], orderIds: ['o1', 'o2', 'o1'], setId: 'set-1' },
  }, [{ name: 'Rice', amount: 100, unit: 'g' }])
  assert.deepEqual(record.ingredients, [{ name: 'Rice', amount: 300, unit: 'g' }])
  assert.deepEqual(record.provenance, { clientIds: ['c1'], orderIds: ['o1', 'o2'], setId: 'set-1' })
})

test('manual actual consumption overrides recipe scaling only for matched ingredients', () => {
  const record = buildCookingConsumptionRecord({
    dishId: 'dish-1', calorie: 1600, amount: 3,
    actualIngredients: [{ name: 'rice', amount: 275, unit: 'G' }],
  }, [{ name: 'Rice', amount: 100, unit: 'g' }])
  assert.deepEqual(record.ingredients, [{ name: 'Rice', amount: 275, unit: 'g' }])
})

test('cooking plan REST schema accepts bounded consumption and rejects unknown fields', () => {
  const valid = cookingPlanWriteSchema.safeParse({
    date: '2026-08-25', menuNumber: 1, dishes: { 'dish-1': 2 },
    consumption: [{ dishId: 'dish-1', calorie: 1600, amount: 2, ingredients: [{ name: 'Rice', amount: 200, unit: 'g' }], provenance: { orderIds: ['order-1'] } }],
  })
  assert.equal(valid.success, true)
  assert.equal(cookingPlanWriteSchema.safeParse({ date: '2026-08-25', menuNumber: 1, dishes: {}, consumption: [{ dishId: 'dish-1', calorie: 1, amount: 1, ingredients: [{ name: 'Rice', amount: 1, unit: 'g' }], unknown: true }] }).success, false)
})

test('manual consumption rejects unknown ingredients and unit mismatches', () => {
  assert.throws(() => buildCookingConsumptionRecord({ dishId: 'dish-1', calorie: 1600, amount: 1, actualIngredients: [{ name: 'Salt', amount: 1, unit: 'g' }] }, [{ name: 'Rice', amount: 100, unit: 'g' }]), /does not match recipe/)
  assert.throws(() => buildCookingConsumptionRecord({ dishId: 'dish-1', calorie: 1600, amount: 1, actualIngredients: [{ name: 'Rice', amount: 1, unit: 'kg' }] }, [{ name: 'Rice', amount: 100, unit: 'g' }]), /does not match recipe/)
})
