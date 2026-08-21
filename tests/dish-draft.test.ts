import assert from 'node:assert/strict'
import test from 'node:test'

import { parseDishDraft } from '@/lib/menu/dish-draft'

test('dish draft parser keeps compatible IDs and optional metadata', () => {
  const ingredients = [{ name: 'Rice', amount: 10, unit: 'gr' }]
  assert.deepEqual(parseDishDraft({ id: 'dish-1', name: 'Meal', mealType: 'CUSTOM', mealIndex: 2, ingredients }), {
    id: 'dish-1',
    name: 'Meal',
    mealType: 'CUSTOM',
    mealIndex: 2,
    ingredients,
  })
  assert.deepEqual(parseDishDraft({ id: 7, name: 'Legacy meal' }), { id: 7, name: 'Legacy meal' })
})

test('dish draft parser rejects missing or unsafe identifiers', () => {
  assert.equal(parseDishDraft(null), null)
  assert.equal(parseDishDraft({ name: 'Missing id' }), null)
  assert.equal(parseDishDraft({ id: { nested: true } }), null)
})
