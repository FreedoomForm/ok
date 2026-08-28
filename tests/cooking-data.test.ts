import assert from 'node:assert/strict'
import test from 'node:test'

import {
  parseCookingDeliveryDays,
  parseCookingMenuResponse,
  parseCookingPlanResponse,
} from '@/lib/warehouse/cooking-data'

test('cooking menu parser keeps valid dishes and compatible optional mappings', () => {
  assert.deepEqual(parseCookingMenuResponse({
    dishes: [
      { id: 1, name: 'Rice', mealType: 'LUNCH', calorieMappings: { '1': ['1200'] } },
      { id: 'legacy', name: 'Soup', mealType: 'DINNER' },
      { id: 3, name: 'invalid mappings', mealType: 'SNACK', calorieMappings: { '1': [1200] } },
      { id: 4, name: 'missing meal type' },
    ],
  }), [
    { id: 1, name: 'Rice', mealType: 'LUNCH', calorieMappings: { '1': ['1200'] } },
    { id: 'legacy', name: 'Soup', mealType: 'DINNER' },
    { id: 3, name: 'invalid mappings', mealType: 'SNACK' },
  ])
})

test('cooking plan parser keeps only finite non-negative cooked amounts', () => {
  assert.deepEqual(parseCookingPlanResponse({
    cookedStats: {
      'dish-1': { '1200': 3, '1600': -1, '2000': '4' },
      'dish-2': { '2500': Number.NaN },
      invalid: [],
    },
  }), { dishes: {}, cookedStats: { 'dish-1': { '1200': 3 } }, consumption: [], color: null })
  assert.deepEqual(parseCookingPlanResponse({ dishes: { 'dish-1': 2 }, color: '#123456' }), { dishes: { 'dish-1': 2 }, cookedStats: {}, consumption: [], color: '#123456' })
  assert.deepEqual(parseCookingPlanResponse(null), { dishes: {}, cookedStats: {}, consumption: [], color: null })
})

test('cooking plan parser preserves a stable record id when provided', () => {
  assert.equal((parseCookingPlanResponse({ id: 'plan-1' }) as { id?: string }).id, 'plan-1')
})

test('cooking plan parser keeps valid actual consumption records and drops malformed rows', () => {
  const parsed = parseCookingPlanResponse({ consumption: [
    { dishId: 'dish-1', calorie: 1600, amount: 2, ingredients: [{ name: 'Rice', unit: 'g', amount: 200 }], provenance: { orderIds: ['order-1'] } },
    { dishId: 'dish-2', calorie: -1, amount: 1, ingredients: [] },
  ] })
  assert.deepEqual(parsed.consumption, [{ dishId: 'dish-1', calorie: 1600, amount: 2, ingredients: [{ name: 'Rice', unit: 'g', amount: 200 }], provenance: { orderIds: ['order-1'] } }])
})

test('delivery-day parser preserves legacy JSON strings and defaults malformed input', () => {
  assert.equal(parseCookingDeliveryDays('{"monday":false}').monday, false)
  assert.equal(parseCookingDeliveryDays({ monday: false, sunday: true }).monday, false)
  assert.equal(parseCookingDeliveryDays('{"monday":"false"}').monday, false)
  assert.equal(parseCookingDeliveryDays('not-json').friday, true)
})
