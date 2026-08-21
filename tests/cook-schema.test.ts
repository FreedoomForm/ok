import assert from 'node:assert/strict'
import test from 'node:test'
import { cookRequestSchema } from '../src/lib/warehouse/cook'

test('accepts detailed cook requests and normalizes numeric fields', () => {
  const result = cookRequestSchema.safeParse({
    date: '2026-08-21',
    menuNumber: '7',
    updates: [{ dishId: 42, calorie: '1600', amount: '3' }],
    activeSetId: 'set-1',
  })

  assert.equal(result.success, true)
  if (result.success) {
    assert.deepEqual(result.data.updates[0], { dishId: '42', calorie: 1600, amount: 3 })
    assert.equal(result.data.menuNumber, 7)
  }
})

test('rejects malformed or unbounded cook requests', () => {
  assert.equal(cookRequestSchema.safeParse({ date: 'invalid', updates: [{ dishId: 'dish-1', calorie: 1600, amount: 1 }] }).success, false)
  assert.equal(cookRequestSchema.safeParse({ date: '2026-08-21', updates: [] }).success, false)
  assert.equal(cookRequestSchema.safeParse({ date: '2026-08-21', menuNumber: 22, updates: [{ dishId: 'dish-1', calorie: 1600, amount: 1 }] }).success, false)
  assert.equal(cookRequestSchema.safeParse({ date: '2026-08-21', updates: [{ dishId: 'dish-1', calorie: 1600, amount: 0 }] }).success, false)
  assert.equal(cookRequestSchema.safeParse({ date: '2026-08-21', updates: Array.from({ length: 501 }, () => ({ dishId: 'dish-1', calorie: 1600, amount: 1 })) }).success, false)
})
