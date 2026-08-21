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
  }), { cookedStats: { 'dish-1': { '1200': 3 } } })
  assert.deepEqual(parseCookingPlanResponse(null), { cookedStats: {} })
})

test('delivery-day parser preserves legacy JSON strings and defaults malformed input', () => {
  assert.equal(parseCookingDeliveryDays('{"monday":false}').monday, false)
  assert.equal(parseCookingDeliveryDays({ monday: false, sunday: true }).monday, false)
  assert.equal(parseCookingDeliveryDays('{"monday":"false"}').monday, false)
  assert.equal(parseCookingDeliveryDays('not-json').friday, true)
})
