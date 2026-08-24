import assert from 'node:assert/strict'
import test from 'node:test'

import { groundPurchaseSuggestion } from '@/lib/ai/purchase-assistant'

test('grounds purchase items to known inventory prices only', () => {
  const result = groundPurchaseSuggestion({ items: [{ name: 'Rice', amount: 2, unit: 'kg' }, { name: 'Unknown', amount: 1, unit: 'kg' }] }, [{ name: 'Rice', unit: 'kg', pricePerUnit: 12000 }])
  assert.deepEqual(result.items, [{ name: 'Rice', amount: 2, unit: 'kg', costPerUnit: 12000, totalCost: 24000 }])
  assert.deepEqual(result.rejected, ['Unknown'])
})

test('rejects unsupported units and unpriced inventory instead of guessing', () => {
  const result = groundPurchaseSuggestion({ items: [{ name: 'Milk', amount: 2, unit: 'l' }, { name: 'Salt', amount: 1, unit: 'kg' }] }, [{ name: 'Milk', unit: 'ml', pricePerUnit: 10 }, { name: 'Salt', unit: 'kg', pricePerUnit: null }])
  assert.equal(result.items.length, 0)
  assert.deepEqual(result.rejected, ['Milk:unit', 'Salt'])
})

test('rejects malformed model output', () => {
  const result = groundPurchaseSuggestion({ items: [{ name: 'Rice', amount: -1, unit: 'kg', pricePerUnit: 999999 }] }, [{ name: 'Rice', unit: 'kg', pricePerUnit: 1 }])
  assert.deepEqual(result, { items: [], rejected: ['invalid-json'] })
})
