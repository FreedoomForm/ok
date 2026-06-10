import { describe, it, expect } from 'vitest'
import { CustomerEntity } from './customer.entity'
import type { PlanType } from '../contracts'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeCustomer(overrides: Partial<{
  isActive: boolean
  balance: number
  dailyPrice: number
  planType: PlanType
  autoOrdersEnabled: boolean
  activeOrderCount: number
}> = {}): CustomerEntity {
  return new CustomerEntity(
    'customer-1',
    overrides.isActive ?? true,
    overrides.balance ?? 0,
    overrides.dailyPrice ?? 84000,
    overrides.planType ?? 'CLASSIC',
    overrides.autoOrdersEnabled ?? true,
    overrides.activeOrderCount ?? 0,
  )
}

// ── canBeDeleted ─────────────────────────────────────────────────────────────

describe('CustomerEntity.canBeDeleted', () => {
  it('returns allowed=true when no active orders', () => {
    const result = makeCustomer({ activeOrderCount: 0 }).canBeDeleted()
    expect(result.allowed).toBe(true)
    expect(result.reason).toBeUndefined()
  })

  it('returns allowed=false when customer has active orders', () => {
    const result = makeCustomer({ activeOrderCount: 3 }).canBeDeleted()
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('Customer has active orders')
  })

  it('returns allowed=false when customer has 1 active order', () => {
    const result = makeCustomer({ activeOrderCount: 1 }).canBeDeleted()
    expect(result.allowed).toBe(false)
  })
})

// ── canToggleStatus ──────────────────────────────────────────────────────────

describe('CustomerEntity.canToggleStatus', () => {
  it('always returns allowed=true', () => {
    const active = makeCustomer({ isActive: true })
    const inactive = makeCustomer({ isActive: false })
    expect(active.canToggleStatus().allowed).toBe(true)
    expect(inactive.canToggleStatus().allowed).toBe(true)
  })
})

// ── canBePermanentlyDeleted ──────────────────────────────────────────────────

describe('CustomerEntity.canBePermanentlyDeleted', () => {
  it('returns allowed=true at entity level', () => {
    const result = makeCustomer().canBePermanentlyDeleted()
    expect(result.allowed).toBe(true)
  })
})

// ── hasSufficientBalance ─────────────────────────────────────────────────────

describe('CustomerEntity.hasSufficientBalance', () => {
  it('returns true when balance >= amount', () => {
    expect(makeCustomer({ balance: 100000 }).hasSufficientBalance(100000)).toBe(true)
    expect(makeCustomer({ balance: 200000 }).hasSufficientBalance(100000)).toBe(true)
  })

  it('returns false when balance < amount', () => {
    expect(makeCustomer({ balance: 50000 }).hasSufficientBalance(100000)).toBe(false)
  })

  it('returns true when balance equals amount', () => {
    expect(makeCustomer({ balance: 84000 }).hasSufficientBalance(84000)).toBe(true)
  })

  it('returns true when amount is 0', () => {
    expect(makeCustomer({ balance: 0 }).hasSufficientBalance(0)).toBe(true)
  })

  it('returns false when balance is 0 and amount is positive', () => {
    expect(makeCustomer({ balance: 0 }).hasSufficientBalance(1)).toBe(false)
  })
})

// ── orderCost ────────────────────────────────────────────────────────────────

describe('CustomerEntity.orderCost', () => {
  it('calculates dailyPrice * quantity with default quantity', () => {
    expect(makeCustomer({ dailyPrice: 84000 }).orderCost()).toBe(84000)
  })

  it('calculates dailyPrice * quantity with explicit quantity', () => {
    expect(makeCustomer({ dailyPrice: 50000 }).orderCost(3)).toBe(150000)
  })
})
