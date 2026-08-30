import assert from 'node:assert/strict'
import test from 'node:test'

import { groundPurchaseSuggestion } from '@/lib/ai/purchase-assistant'

test('grounds purchase items to known inventory prices only', () => {
  const result = groundPurchaseSuggestion({ items: [{ name: 'Rice', amount: 2, unit: 'kg' }, { name: 'Unknown', amount: 1, unit: 'kg' }] }, [{ name: 'Rice', unit: 'kg', pricePerUnit: 12000 }])
  assert.deepEqual(result.items, [{ name: 'Rice', amount: 2, unit: 'kg', costPerUnit: 12000, totalCost: 24000, matchedInventoryId: null, confidence: 'exact' }])
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

test('exact matches carry the matched inventory id and exact confidence (§12)', () => {
  const result = groundPurchaseSuggestion({ items: [{ name: 'рис круглый', amount: 2, unit: 'кг' }] }, [
    { id: 'inv-1', name: 'Рис круглый', unit: 'кг', pricePerUnit: 12000 },
  ])
  assert.deepEqual(result.items, [
    { name: 'Рис круглый', amount: 2, unit: 'кг', costPerUnit: 12000, totalCost: 24000, matchedInventoryId: 'inv-1', confidence: 'exact' },
  ])
  assert.deepEqual(result.rejected, [])
})

test('unique partial matches ground to the nearest inventory item with a fuzzy warning (§12)', () => {
  const result = groundPurchaseSuggestion({ items: [{ name: 'рис', amount: 1, unit: 'кг' }] }, [
    { id: 'inv-2', name: 'Рис круглый', unit: 'кг', pricePerUnit: 12000 },
    { id: 'inv-3', name: 'Гречка', unit: 'кг', pricePerUnit: 9000 },
  ])
  assert.deepEqual(result.items, [
    { name: 'Рис круглый', amount: 1, unit: 'кг', costPerUnit: 12000, totalCost: 12000, matchedInventoryId: 'inv-2', confidence: 'fuzzy', warning: 'fuzzy-match' },
  ])
  assert.deepEqual(result.rejected, [])
})

test('ambiguous partial matches are rejected instead of guessing (§12)', () => {
  const result = groundPurchaseSuggestion({ items: [{ name: 'рис', amount: 1, unit: 'кг' }] }, [
    { id: 'inv-2', name: 'Рис круглый', unit: 'кг', pricePerUnit: 12000 },
    { id: 'inv-4', name: 'Рис пропаренный', unit: 'кг', pricePerUnit: 13000 },
  ])
  assert.equal(result.items.length, 0)
  assert.deepEqual(result.rejected, ['рис:ambiguous'])
})

test('exact match wins over fuzzy candidates (§12)', () => {
  const result = groundPurchaseSuggestion({ items: [{ name: 'рис круглый', amount: 1, unit: 'кг' }] }, [
    { id: 'inv-2', name: 'Рис круглый', unit: 'кг', pricePerUnit: 12000 },
    { id: 'inv-4', name: 'Рис круглый пропаренный', unit: 'кг', pricePerUnit: 13000 },
  ])
  assert.deepEqual(result.items.map((item) => [item.matchedInventoryId, item.confidence]), [['inv-2', 'exact']])
})
