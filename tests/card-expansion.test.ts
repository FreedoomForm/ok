import assert from 'node:assert/strict'
import test from 'node:test'

import { buildCardTransactionRow, deriveTransactionStatus } from '../src/lib/finance/card-expansion'

test('card transaction rows carry date, derived status and the linked purchase (§8)', () => {
  const row = buildCardTransactionRow({
    id: 't1',
    amount: 15000,
    type: 'EXPENSE',
    description: 'Продукты',
    createdAt: new Date('2026-08-29T09:30:00.000Z'),
    purchase: { id: 'p1', title: 'Закупка риса', status: 'COMPLETED' },
  })
  assert.deepEqual(row, {
    id: 't1',
    amount: 15000,
    type: 'EXPENSE',
    title: 'Продукты',
    date: '2026-08-29',
    status: 'COMPLETED',
    linkedPurchaseId: 'p1',
    linkedTitle: 'Закупка риса',
  })
})

test('manual ledger rows settle without a linked purchase and fall back to their description (§8)', () => {
  const row = buildCardTransactionRow({
    id: 't2',
    amount: 500000,
    type: 'INCOME',
    description: null,
    createdAt: new Date('2026-08-30T00:00:00.000Z'),
    purchase: null,
  })
  assert.deepEqual(row, {
    id: 't2',
    amount: 500000,
    type: 'INCOME',
    title: 'INCOME',
    date: '2026-08-30',
    status: 'SETTLED',
    linkedPurchaseId: null,
    linkedTitle: null,
  })
})

test('status derivation follows the linked purchase lifecycle honestly', () => {
  assert.equal(deriveTransactionStatus(null), 'SETTLED')
  assert.equal(deriveTransactionStatus({ status: 'DRAFT' }), 'DRAFT')
  assert.equal(deriveTransactionStatus({ status: 'COMPLETED' }), 'COMPLETED')
  assert.equal(deriveTransactionStatus(undefined), 'SETTLED')
})
