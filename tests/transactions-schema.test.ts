import assert from 'node:assert/strict'
import test from 'node:test'
import { transactionRequestSchema } from '../src/lib/admin/transactions'

test('accepts valid customer and company transaction payloads', () => {
  assert.equal(transactionRequestSchema.safeParse({
    customerId: 'customer-1',
    amount: 125000,
    type: 'INCOME',
    description: 'Payment',
    category: 'MANUAL_ADJUSTMENT',
  }).success, true)
  assert.equal(transactionRequestSchema.safeParse({ amount: 1, type: 'EXPENSE' }).success, true)
})

test('rejects unsafe transaction payloads', () => {
  assert.equal(transactionRequestSchema.safeParse({ amount: 0, type: 'INCOME' }).success, false)
  assert.equal(transactionRequestSchema.safeParse({ amount: Number.POSITIVE_INFINITY, type: 'INCOME' }).success, false)
  assert.equal(transactionRequestSchema.safeParse({ amount: 1, type: 'TRANSFER' }).success, false)
  assert.equal(transactionRequestSchema.safeParse({ amount: 1, type: 'INCOME', customerId: '' }).success, false)
  assert.equal(transactionRequestSchema.safeParse({ amount: 1, type: 'INCOME', description: 'x'.repeat(1001) }).success, false)
  assert.equal(transactionRequestSchema.safeParse({ amount: 1_000_000_000_001, type: 'INCOME' }).success, false)
})
