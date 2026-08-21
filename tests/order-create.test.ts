import assert from 'node:assert/strict'
import test from 'node:test'

import { parseOrderCreateRequest } from '@/lib/orders/create'

test('order create parser accepts the legacy admin form payload', () => {
  const parsed = parseOrderCreateRequest({
    customerName: 'Browser Customer',
    customerPhone: '+998901112233',
    deliveryAddress: 'Tashkent',
    deliveryTime: '12:00',
    quantity: '2',
    calories: 1600,
    paymentStatus: 'UNPAID',
    paymentMethod: 'CASH',
    isPrepaid: false,
    amountReceived: null,
    latitude: 41.31,
    longitude: 69.24,
    assignedSetId: '',
    legacyUiField: 'ignored',
  })

  assert.equal(parsed.success, true)
  if (parsed.success) {
    assert.equal(parsed.data.quantity, '2')
    assert.equal(parsed.data.calories, 1600)
    assert.equal('legacyUiField' in parsed.data, false)
  }
})

test('order create parser rejects unsafe enum and nested values', () => {
  assert.equal(parseOrderCreateRequest({ paymentMethod: 'BITCOIN' }).success, false)
  assert.equal(parseOrderCreateRequest({ calories: { value: 1600 } }).success, false)
  assert.equal(parseOrderCreateRequest({ assignedSetId: { id: 'set-1' } }).success, false)
})

test('order create parser preserves nullable optional route fields', () => {
  const parsed = parseOrderCreateRequest({
    customerName: 'Customer',
    customerPhone: '+998901112233',
    deliveryAddress: 'Address',
    calories: '1200',
    amountReceived: '50000',
    date: null,
    etaMinutes: null,
    routeDistanceKm: 2.5,
    sequenceInRoute: '3',
  })

  assert.equal(parsed.success, true)
  if (parsed.success) {
    assert.equal(parsed.data.date, null)
    assert.equal(parsed.data.etaMinutes, null)
    assert.equal(parsed.data.routeDistanceKm, 2.5)
    assert.equal(parsed.data.sequenceInRoute, '3')
  }
})
