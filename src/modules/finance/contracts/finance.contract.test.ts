/**
 * Finance module — Contract tests
 *
 * These tests verify the Zod schemas match the DTO interfaces defined
 * in `finance.dto.ts` and that the API response shapes are correct.
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  successResponseSchema,
  errorResponseSchema,
  ErrorCodes,
} from '@/tests/helpers/contract-test-helpers'

// ── Finance Zod schemas (mirrors finance.dto.ts) ────────────────────────────

const transactionTypeEnum = z.enum(['INCOME', 'EXPENSE'])

const transactionListItemSchema = z.object({
  id: z.string(),
  amount: z.number(),
  type: transactionTypeEnum,
  description: z.string().nullable(),
  category: z.string().nullable(),
  createdAt: z.string(),
  customerName: z.string().nullable(),
  customerPhone: z.string().nullable(),
  adminName: z.string().nullable(),
  salaryRecipientAdminId: z.string().nullable(),
})

const transactionDetailSchema = transactionListItemSchema.extend({
  updatedAt: z.string(),
  adminId: z.string().nullable(),
  customerId: z.string().nullable(),
})

const companyBalanceSchema = z.object({
  companyBalance: z.number(),
  history: z.array(transactionListItemSchema),
})

const adminBalanceRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  salaryPerDay: z.number(),
  days: z.number(),
  accrued: z.number(),
  paid: z.number(),
  balance: z.number(),
  withdrawnInRange: z.number(),
})

const adminBalanceResultSchema = z.object({
  asOf: z.string(),
  admins: z.array(adminBalanceRowSchema),
})

const buyIngredientsResultSchema = z.object({
  transactionId: z.string(),
  totalCost: z.number(),
})

const salaryPaymentSchema = z.object({
  recipientAdminId: z.string(),
  amount: z.number(),
})

const financeClientSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  balance: z.number(),
  dailyPrice: z.number(),
  createdAt: z.string(),
})

// ── Endpoint response schemas ───────────────────────────────────────────────

const transactionListResponseSchema = successResponseSchema.extend({
  data: z.array(transactionListItemSchema),
})

const companyBalanceResponseSchema = successResponseSchema.extend({
  data: companyBalanceSchema,
})

const adminBalancesResponseSchema = successResponseSchema.extend({
  data: adminBalanceResultSchema,
})

const buyIngredientsResponseSchema = successResponseSchema.extend({
  data: buyIngredientsResultSchema,
})

const salaryPaymentResponseSchema = successResponseSchema.extend({
  data: salaryPaymentSchema,
})

const financeClientsResponseSchema = successResponseSchema.extend({
  data: z.array(financeClientSummarySchema),
})

// ── Sample data ─────────────────────────────────────────────────────────────

const sampleTransactionListItem = {
  id: 'txn-1',
  amount: 500,
  type: 'INCOME' as const,
  description: 'Monthly payment',
  category: 'subscription',
  createdAt: '2024-01-15T10:00:00.000Z',
  customerName: 'Jane Smith',
  customerPhone: '+1234567890',
  adminName: null,
  salaryRecipientAdminId: null,
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Finance contract — TransactionListItem schema', () => {
  it('validates a well-formed TransactionListItem', () => {
    const result = transactionListItemSchema.safeParse(sampleTransactionListItem)
    expect(result.success).toBe(true)
  })

  it('rejects invalid transaction type', () => {
    const result = transactionListItemSchema.safeParse({
      ...sampleTransactionListItem,
      type: 'INVALID',
    })
    expect(result.success).toBe(false)
  })

  it('accepts INCOME and EXPENSE types', () => {
    for (const type of ['INCOME', 'EXPENSE'] as const) {
      const result = transactionListItemSchema.safeParse({ ...sampleTransactionListItem, type })
      expect(result.success).toBe(true)
    }
  })
})

describe('Finance contract — TransactionDetail schema', () => {
  it('extends TransactionListItem with detail fields', () => {
    const detail = {
      ...sampleTransactionListItem,
      updatedAt: '2024-01-15T12:00:00.000Z',
      adminId: null,
      customerId: 'cust-1',
    }
    const result = transactionDetailSchema.safeParse(detail)
    expect(result.success).toBe(true)
  })
})

describe('Finance contract — company balance response', () => {
  it('validates company balance response shape', () => {
    const response = {
      data: {
        companyBalance: 5000,
        history: [sampleTransactionListItem],
      },
      meta: { requestId: 'req-123' },
    }
    const result = companyBalanceResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Finance contract — admin balances response', () => {
  it('validates admin balances response shape', () => {
    const response = {
      data: {
        asOf: '2024-01-15T12:00:00.000Z',
        admins: [{
          id: 'admin-1',
          name: 'Admin User',
          role: 'LOW_ADMIN',
          isActive: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          salaryPerDay: 100,
          days: 15,
          accrued: 1500,
          paid: 500,
          balance: 1000,
          withdrawnInRange: 500,
        }],
      },
      meta: { requestId: 'req-456' },
    }
    const result = adminBalancesResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Finance contract — buy ingredients response', () => {
  it('validates buy ingredients response shape', () => {
    const response = {
      data: {
        transactionId: 'txn-buy-1',
        totalCost: 250,
      },
      meta: { requestId: 'req-789' },
    }
    const result = buyIngredientsResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Finance contract — salary payment response', () => {
  it('validates salary payment response shape', () => {
    const response = {
      data: {
        recipientAdminId: 'admin-1',
        amount: 500,
      },
      meta: { requestId: 'req-sal' },
    }
    const result = salaryPaymentResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Finance contract — finance clients response', () => {
  it('validates finance clients response shape', () => {
    const response = {
      data: [{
        id: 'cust-1',
        name: 'Jane Smith',
        phone: '+1234567890',
        balance: 1000,
        dailyPrice: 500,
        createdAt: '2024-01-15T10:00:00.000Z',
      }],
      meta: { requestId: 'req-clients' },
    }
    const result = financeClientsResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Finance contract — error responses', () => {
  it('validates UNAUTHORIZED error', () => {
    const response = {
      error: { code: ErrorCodes.UNAUTHORIZED, message: 'Unauthorized' },
      meta: { requestId: 'req-err' },
    }
    const result = errorResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })

  it('validates VALIDATION_FAILED error', () => {
    const response = {
      error: { code: ErrorCodes.VALIDATION_FAILED, message: 'Validation failed' },
      meta: { requestId: 'req-val' },
    }
    const result = errorResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})
