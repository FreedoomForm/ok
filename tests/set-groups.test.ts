import assert from 'node:assert/strict'
import test from 'node:test'

import { findSetGroup, getSetDayDishes, getSetDayGroups, parseSetGroupDocument } from '@/lib/menu/set-groups'

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

test('findSetGroup supports day maps and legacy array documents', () => {
  const dayMap = { '2': [{ calories: 1600, dishes: [{ dishId: 'dish-1' }] }] }
  const legacyArray = [{ calories: 1200, dishes: [{ dishId: 1 }] }]

  assert.equal(findSetGroup(dayMap, 2, 1600)?.calories, 1600)
  assert.equal(findSetGroup(legacyArray, 1, 1200)?.calories, 1200)
  assert.equal(findSetGroup(dayMap, 1, 1600), null)
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
