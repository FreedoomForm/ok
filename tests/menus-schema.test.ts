import assert from 'node:assert/strict'
import test from 'node:test'
import { menuDishMutationSchema, menuNumberSchema } from '../src/lib/admin/menus'

test('accepts and normalizes valid menu identifiers', () => {
  assert.equal(menuNumberSchema.safeParse('21').success, true)
  assert.deepEqual(menuDishMutationSchema.parse({ menuNumber: '7', dishId: 42 }), {
    menuNumber: 7,
    dishId: '42',
  })
})

test('rejects invalid menu numbers and dish identifiers', () => {
  assert.equal(menuNumberSchema.safeParse('0').success, false)
  assert.equal(menuNumberSchema.safeParse('22').success, false)
  assert.equal(menuNumberSchema.safeParse('7.5').success, false)
  assert.equal(menuDishMutationSchema.safeParse({ menuNumber: 7, dishId: '' }).success, false)
  assert.equal(menuDishMutationSchema.safeParse({ menuNumber: 7, dishId: 0 }).success, false)
})
