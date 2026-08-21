import assert from 'node:assert/strict'
import test from 'node:test'
import { cookingPlanWriteSchema, validateCookingPlanRange } from '../src/lib/warehouse/cooking-plan'

test('accepts cooking plans with bounded menu and quantity-map payloads', () => {
  const result = cookingPlanWriteSchema.safeParse({
    date: '2026-08-21',
    menuNumber: '7',
    dishes: { 'dish-1': 3, 'dish-2': 0 },
  })

  assert.equal(result.success, true)
  if (result.success) {
    assert.equal(result.data.menuNumber, 7)
    assert.equal(result.data.dishes['dish-1'], 3)
  }
})

test('rejects unsafe cooking plan writes and oversized ranges', () => {
  assert.equal(cookingPlanWriteSchema.safeParse({ date: 'not-a-date', menuNumber: 1, dishes: {} }).success, false)
  assert.equal(cookingPlanWriteSchema.safeParse({ date: '2026-08-21', menuNumber: 22, dishes: {} }).success, false)
  assert.equal(cookingPlanWriteSchema.safeParse({ date: '2026-08-21', menuNumber: 1, dishes: { 'dish-1': -1 } }).success, false)

  const start = new Date('2026-08-01T00:00:00.000Z')
  const end = new Date('2026-09-01T23:59:59.999Z')
  assert.match(validateCookingPlanRange(start, end) || '', /31 days/)
  assert.match(validateCookingPlanRange(end, start) || '', /reversed/)
})
