import assert from 'node:assert/strict'
import test from 'node:test'
import { purchaseRequestSchema } from '../src/lib/admin/purchases'

test('accepts valid bounded warehouse purchases and defaults unit', () => {
  const result = purchaseRequestSchema.safeParse({
    items: [{ name: 'Flour', amount: 10, costPerUnit: 25000 }],
  })

  assert.equal(result.success, true)
  if (result.success) assert.equal(result.data.items[0].unit, 'kg')
})

test('rejects unsafe or oversized warehouse purchases', () => {
  assert.equal(purchaseRequestSchema.safeParse({ items: [] }).success, false)
  assert.equal(purchaseRequestSchema.safeParse({ items: [{ name: 'Flour', amount: -1, costPerUnit: 1 }] }).success, false)
  assert.equal(purchaseRequestSchema.safeParse({ items: [{ name: 'Flour', amount: 1, costPerUnit: Number.POSITIVE_INFINITY }] }).success, false)
  assert.equal(purchaseRequestSchema.safeParse({ items: [{ name: 'Flour', amount: 1, costPerUnit: 1, kcalPerGram: -1 }] }).success, false)
  assert.equal(purchaseRequestSchema.safeParse({ items: Array.from({ length: 201 }, () => ({ name: 'Flour', amount: 1, costPerUnit: 1 })) }).success, false)
})
