import assert from 'node:assert/strict'
import test from 'node:test'

import { findCustomerSetDishes } from '@/lib/menu/customer-set'

test('customer set parser returns the first usable day-group dish projection', () => {
  const groups = {
    '7': [
      { calories: 1200, dishes: [] },
      {
        calories: 1600,
        dishes: [
          { dishId: 12, dishName: 'Soup', mealType: 'LUNCH', unsafe: true },
          { dishId: '13', dishName: 'String id should be ignored' },
        ],
      },
    ],
  }

  assert.deepEqual(findCustomerSetDishes(groups, 7), [
    { dishId: 12, dishName: 'Soup', mealType: 'LUNCH' },
  ])
})

test('customer set parser returns empty for malformed or missing day groups', () => {
  assert.deepEqual(findCustomerSetDishes({ '7': 'not-an-array' }, 7), [])
  assert.deepEqual(findCustomerSetDishes({ '8': [{ dishes: [{ dishId: 1 }] }] }, 7), [])
  assert.deepEqual(findCustomerSetDishes([], 7), [])
})
