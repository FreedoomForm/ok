import assert from 'node:assert/strict'
import test from 'node:test'
import { inventorySchema } from '../src/lib/warehouse/inventory'

test('accepts finite nonnegative inventory amounts within the operational bound', () => {
  const result = inventorySchema.safeParse({ flour: 10.5, rice: 0 })
  assert.equal(result.success, true)
})

test('rejects malformed inventory names and unsafe amounts', () => {
  assert.equal(inventorySchema.safeParse({ '': 1 }).success, false)
  assert.equal(inventorySchema.safeParse({ flour: -1 }).success, false)
  assert.equal(inventorySchema.safeParse({ flour: Number.NaN }).success, false)
  assert.equal(inventorySchema.safeParse({ flour: 1_000_001 }).success, false)
  assert.equal(inventorySchema.safeParse([]).success, false)
})
