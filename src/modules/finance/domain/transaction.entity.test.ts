import { describe, it, expect } from 'vitest'
import { TransactionEntity } from './transaction.entity'
import type { TransactionType } from '../contracts'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTransaction(overrides: Partial<{
  amount: number
  type: TransactionType
  category: string | null
  adminId: string | null
  customerId: string | null
  salaryRecipientAdminId: string | null
}> = {}): TransactionEntity {
  return new TransactionEntity(
    'tx-1',
    overrides.amount ?? 1000,
    overrides.type ?? 'INCOME',
    overrides.category ?? null,
    overrides.adminId ?? 'admin-1',
    overrides.customerId ?? null,
    overrides.salaryRecipientAdminId ?? null,
  )
}

// ── isValidAmount ────────────────────────────────────────────────────────────

describe('TransactionEntity.isValidAmount', () => {
  it('returns true for positive amounts', () => {
    expect(makeTransaction({ amount: 1000 }).isValidAmount()).toBe(true)
    expect(makeTransaction({ amount: 0.01 }).isValidAmount()).toBe(true)
    expect(makeTransaction({ amount: 1_000_000 }).isValidAmount()).toBe(true)
  })

  it('returns false for zero', () => {
    expect(makeTransaction({ amount: 0 }).isValidAmount()).toBe(false)
  })

  it('returns false for negative amounts', () => {
    expect(makeTransaction({ amount: -100 }).isValidAmount()).toBe(false)
    expect(makeTransaction({ amount: -0.01 }).isValidAmount()).toBe(false)
  })

  it('returns false for NaN', () => {
    expect(makeTransaction({ amount: NaN }).isValidAmount()).toBe(false)
  })

  it('returns false for Infinity', () => {
    expect(makeTransaction({ amount: Infinity }).isValidAmount()).toBe(false)
    expect(makeTransaction({ amount: -Infinity }).isValidAmount()).toBe(false)
  })
})

// ── canBeReversed ────────────────────────────────────────────────────────────

describe('TransactionEntity.canBeReversed', () => {
  it('returns allowed=true for non-salary transactions', () => {
    const result = makeTransaction({ category: 'MANUAL_ADJUSTMENT' }).canBeReversed()
    expect(result.allowed).toBe(true)
  })

  it('returns allowed=true for null category', () => {
    const result = makeTransaction({ category: null }).canBeReversed()
    expect(result.allowed).toBe(true)
  })

  it('returns allowed=false for SALARY transactions', () => {
    const result = makeTransaction({ category: 'SALARY' }).canBeReversed()
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('Salary transactions cannot be reversed')
  })
})

// ── isCustomerTransaction ────────────────────────────────────────────────────

describe('TransactionEntity.isCustomerTransaction', () => {
  it('returns true when customerId is set', () => {
    expect(makeTransaction({ customerId: 'cust-1' }).isCustomerTransaction()).toBe(true)
  })

  it('returns false when customerId is null', () => {
    expect(makeTransaction({ customerId: null }).isCustomerTransaction()).toBe(false)
  })
})

// ── isCompanyTransaction ─────────────────────────────────────────────────────

describe('TransactionEntity.isCompanyTransaction', () => {
  it('returns true when both customerId and salaryRecipientAdminId are null', () => {
    expect(makeTransaction({ customerId: null, salaryRecipientAdminId: null }).isCompanyTransaction()).toBe(true)
  })

  it('returns false when customerId is set', () => {
    expect(makeTransaction({ customerId: 'cust-1' }).isCompanyTransaction()).toBe(false)
  })

  it('returns false when salaryRecipientAdminId is set', () => {
    expect(makeTransaction({ salaryRecipientAdminId: 'admin-2' }).isCompanyTransaction()).toBe(false)
  })
})

// ── isSalaryTransaction ──────────────────────────────────────────────────────

describe('TransactionEntity.isSalaryTransaction', () => {
  it('returns true when category is SALARY', () => {
    expect(makeTransaction({ category: 'SALARY' }).isSalaryTransaction()).toBe(true)
  })

  it('returns true when salaryRecipientAdminId is set', () => {
    expect(makeTransaction({ salaryRecipientAdminId: 'admin-2', category: null }).isSalaryTransaction()).toBe(true)
  })

  it('returns false when neither SALARY category nor salaryRecipientAdminId', () => {
    expect(makeTransaction({ category: 'MANUAL_ADJUSTMENT', salaryRecipientAdminId: null }).isSalaryTransaction()).toBe(false)
  })
})

// ── validateAmount (static) ─────────────────────────────────────────────────

describe('TransactionEntity.validateAmount (static)', () => {
  it('returns valid=true for positive finite amounts', () => {
    const result = TransactionEntity.validateAmount(1000)
    expect(result.valid).toBe(true)
  })

  it('returns valid=false for zero', () => {
    const result = TransactionEntity.validateAmount(0)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('Amount must be positive')
  })

  it('returns valid=false for negative amounts', () => {
    const result = TransactionEntity.validateAmount(-100)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('Amount must be positive')
  })

  it('returns valid=false for non-finite values', () => {
    expect(TransactionEntity.validateAmount(NaN).valid).toBe(false)
    expect(TransactionEntity.validateAmount(Infinity).valid).toBe(false)
  })

  it('returns valid=false for amounts exceeding maximum', () => {
    const result = TransactionEntity.validateAmount(1_000_000_001)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('Amount exceeds maximum allowed')
  })

  it('returns valid=true at the maximum boundary', () => {
    expect(TransactionEntity.validateAmount(1_000_000_000).valid).toBe(true)
  })
})
