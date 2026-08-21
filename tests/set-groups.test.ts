import assert from 'node:assert/strict'
import test from 'node:test'

import { getSetDayDishes, getSetDayGroups, parseSetGroupDocument } from '@/lib/menu/set-groups'

test('set group parser keeps valid numeric and string dish identifiers and strips malformed groups', () => {
  const document = parseSetGroupDocument({
    '1': [
      { id: 'group-1', calories: 1200, dishes: [{ dishId: 1, dishName: 'Soup', customIngredients: [{ name: 'Rice' }] }] },
      { calories: Number.POSITIVE_INFINITY, dishes: [{ dishId: 2 }] },
      { dishes: [{ dishId: null }] },
    ],
    _meta: { dayOrder: ['1'] },
    invalid: 'not-a-day',
  })

  assert.deepEqual(document['1'], [
    { id: 'group-1', calories: 1200, dishes: [{ dishId: 1, dishName: 'Soup', customIngredients: [{ name: 'Rice' }] }] },
    { dishes: [{ dishId: 2 }] },
    { dishes: [] },
  ])
  assert.equal(document.invalid, undefined)
  assert.equal(document._meta, undefined)
})

test('set group accessors isolate menu days and flatten group dishes', () => {
  const groups = {
    '2': [
      { calories: 1600, dishes: [{ dishId: 'dish-1', dishName: 'Meal' }] },
      { calories: 2000, dishes: [{ dishId: 2 }] },
    ],
  }

  assert.equal(getSetDayGroups(groups, 1).length, 0)
  assert.equal(getSetDayGroups(groups, 2).length, 2)
  assert.deepEqual(getSetDayDishes(groups, 2).map((dish) => dish.dishId), ['dish-1', 2])
})
