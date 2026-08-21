import assert from 'node:assert/strict'
import test from 'node:test'

import { findCustomCookIngredients, parseCookIngredients } from '@/lib/warehouse/cook-json'

test('cook ingredient parser keeps only usable name/amount/unit entries', () => {
  const parsed = parseCookIngredients([
    { name: 'Rice', amount: '12.5', unit: 'gr', unsafe: true },
    { name: 'Salt', amount: 0, unit: 'gr' },
    { name: 'Broken', amount: 'not-a-number', unit: 'gr' },
    { name: 'Missing unit', amount: 1 },
    'not-an-object',
  ])

  assert.deepEqual(parsed, [
    { name: 'Rice', amount: 12.5, unit: 'gr' },
    { name: 'Salt', amount: 0, unit: 'gr' },
  ])
})

test('custom cook ingredients resolve by menu number, calorie, and dish id', () => {
  const groups = {
    '3': [{
      calories: 1600,
      dishes: [{
        dishId: 'dish-1',
        customIngredients: [{ name: 'Rice', amount: 20, unit: 'gr' }],
      }],
    }],
  }

  assert.deepEqual(findCustomCookIngredients(groups, 3, 1600, 'dish-1'), [
    { name: 'Rice', amount: 20, unit: 'gr' },
  ])
  assert.equal(findCustomCookIngredients(groups, 3, 1200, 'dish-1'), null)
  assert.equal(findCustomCookIngredients(groups, 4, 1600, 'dish-1'), null)
  assert.equal(findCustomCookIngredients(groups, 3, 1600, 'missing'), null)
})
