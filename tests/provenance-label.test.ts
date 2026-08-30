import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildCookingProvenanceLabel,
  buildCookingProvenanceLabels,
  collectCookingProvenanceIds,
} from '../src/lib/warehouse/provenance-label'
import type { CookingConsumptionRecord } from '../src/lib/warehouse/cooking-consumption'

const lookups = {
  clientName: (id: string) => ({ c1: 'Алишер', c2: 'Дилноза' })[id] ?? null,
  contractLabel: (id: string) => ({ k1: 'Алишер · 01.09–07.09' })[id] ?? null,
  orderLabel: (id: string) => ({ o1: '№1601', o2: '№1602' })[id] ?? null,
  setName: (id: string) => ({ s1: 'Стандарт' })[id] ?? null,
}

const records: CookingConsumptionRecord[] = [
  {
    dishId: 'dish-1',
    calorie: 1600,
    amount: 2,
    ingredients: [{ name: 'Rice', amount: 200, unit: 'g' }],
    provenance: { clientIds: ['c1', 'c2', 'ghost'], contractIds: ['k1'], orderIds: ['o1'], setId: 's1', groupCalories: 1600 },
  },
  {
    dishId: 'dish-2',
    calorie: 1300,
    amount: 1,
    ingredients: [{ name: 'Tea', amount: 200, unit: 'ml' }],
    provenance: { orderIds: ['o2', 'missing'] },
  },
  {
    dishId: 'dish-3',
    calorie: 900,
    amount: 1,
    ingredients: [{ name: 'Bread', amount: 80, unit: 'g' }],
  },
]

test('collectCookingProvenanceIds gathers bounded unique ids across records', () => {
  const ids = collectCookingProvenanceIds(records)
  assert.deepEqual([...ids.clientIds].sort(), ['c1', 'c2', 'ghost'])
  assert.deepEqual([...ids.contractIds].sort(), ['k1'])
  assert.deepEqual([...ids.orderIds].sort(), ['missing', 'o1', 'o2'])
  assert.deepEqual([...ids.setIds], ['s1'])
  assert.deepEqual(collectCookingProvenanceIds([]), { clientIds: new Set(), contractIds: new Set(), orderIds: new Set(), setIds: new Set() })
  const junk = collectCookingProvenanceIds([{ dishId: 'x', calorie: 1, amount: 1, ingredients: [], provenance: { clientIds: ['only-one'], orderIds: Array.from({ length: 400 }, (_, index) => `o${index}`) } } as unknown as CookingConsumptionRecord])
  assert.deepEqual([...junk.clientIds], ['only-one'])
  assert.equal(junk.orderIds.size, 200)
})

test('buildCookingProvenanceLabels keys readable labels by dish and calorie', () => {
  const labels = buildCookingProvenanceLabels(records, lookups, 'ru')
  assert.equal(labels['dish-1:1600'], 'Клиенты: Алишер, Дилноза; Контракт: Алишер · 01.09–07.09; Заказы: №1601; Сет: Стандарт; Группа: 1600 ккал')
  assert.equal(labels['dish-2:1300'], 'Заказы: №1602')
  assert.equal(labels['dish-3:900'], undefined)
})

test('buildCookingProvenanceLabel localizes, skips unresolvable ids and survives malformed input', () => {
  assert.equal(
    buildCookingProvenanceLabel({ clientIds: ['c1'], orderIds: ['ghost'] }, lookups, 'uz'),
    'Mijozlar: Алишер',
  )
  assert.equal(
    buildCookingProvenanceLabel({ groupCalories: 1300 }, lookups, 'ru'),
    'Группа: 1300 ккал',
  )
  assert.equal(buildCookingProvenanceLabel(undefined, lookups, 'ru'), '')
  assert.equal(buildCookingProvenanceLabel({ clientIds: ['ghost'] }, lookups, 'ru'), '')
  assert.equal(buildCookingProvenanceLabel({ setId: null, clientIds: [] }, lookups, 'ru'), '')
})
