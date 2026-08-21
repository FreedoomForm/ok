import assert from 'node:assert/strict'
import test from 'node:test'
import { salaryPaymentSchema } from '../src/lib/admin/salary'

test('accepts salary payments through either target alias', () => {
  assert.equal(salaryPaymentSchema.safeParse({ adminId: 'admin-1', amount: 1000 }).success, true)
  assert.equal(salaryPaymentSchema.safeParse({ recipientAdminId: 'admin-1', amount: 1000 }).success, true)
})

test('rejects unsafe salary payment requests', () => {
  assert.equal(salaryPaymentSchema.safeParse({ amount: 1000 }).success, false)
  assert.equal(salaryPaymentSchema.safeParse({ recipientAdminId: '', amount: 1000 }).success, false)
  assert.equal(salaryPaymentSchema.safeParse({ recipientAdminId: 'admin-1', amount: 0 }).success, false)
  assert.equal(salaryPaymentSchema.safeParse({ recipientAdminId: 'admin-1', amount: Number.POSITIVE_INFINITY }).success, false)
  assert.equal(salaryPaymentSchema.safeParse({ recipientAdminId: 'admin-1', amount: 1_000_000_000_001 }).success, false)
})
