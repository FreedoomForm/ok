import { describe, it, expect } from 'vitest'
import { CourierEntity } from './courier.entity'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeCourier(overrides: Partial<{
  isActive: boolean
  isOnShift: boolean
  salary: number
  totalSalaryPaid: number
  createdAt: Date
}> = {}): CourierEntity {
  return new CourierEntity(
    'courier-1',
    overrides.isActive ?? true,
    overrides.isOnShift ?? true,
    overrides.salary ?? 50000,
    overrides.createdAt ?? new Date('2024-01-01'),
    overrides.totalSalaryPaid ?? 0,
  )
}

// ── canAcceptOrder ───────────────────────────────────────────────────────────

describe('CourierEntity.canAcceptOrder', () => {
  it('returns allowed=true when active and on shift', () => {
    const result = makeCourier({ isActive: true, isOnShift: true }).canAcceptOrder()
    expect(result.allowed).toBe(true)
  })

  it('returns allowed=false when not active', () => {
    const result = makeCourier({ isActive: false, isOnShift: true }).canAcceptOrder()
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('Courier is not active')
  })

  it('returns allowed=false when not on shift', () => {
    const result = makeCourier({ isActive: true, isOnShift: false }).canAcceptOrder()
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('Courier is not on shift')
  })

  it('returns allowed=false when both inactive and off shift', () => {
    const result = makeCourier({ isActive: false, isOnShift: false }).canAcceptOrder()
    expect(result.allowed).toBe(false)
    // Should report the first failing condition
    expect(result.reason).toBe('Courier is not active')
  })
})

// ── canWithdraw ──────────────────────────────────────────────────────────────

describe('CourierEntity.canWithdraw', () => {
  it('returns allowed=true when amount <= available balance', () => {
    const courier = makeCourier()
    const result = courier.canWithdraw(50000, 100000)
    expect(result.allowed).toBe(true)
  })

  it('returns allowed=true when amount equals available balance', () => {
    const courier = makeCourier()
    const result = courier.canWithdraw(100000, 100000)
    expect(result.allowed).toBe(true)
  })

  it('returns allowed=false when amount exceeds available balance', () => {
    const courier = makeCourier()
    const result = courier.canWithdraw(200000, 100000)
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('exceeds available balance')
  })

  it('returns allowed=false for zero amount', () => {
    const courier = makeCourier()
    const result = courier.canWithdraw(0, 100000)
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('Invalid withdrawal amount')
  })

  it('returns allowed=false for negative amount', () => {
    const courier = makeCourier()
    const result = courier.canWithdraw(-100, 100000)
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('Invalid withdrawal amount')
  })

  it('returns allowed=false for NaN amount', () => {
    const courier = makeCourier()
    const result = courier.canWithdraw(NaN, 100000)
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('Invalid withdrawal amount')
  })

  it('returns allowed=false for Infinity amount', () => {
    const courier = makeCourier()
    const result = courier.canWithdraw(Infinity, 100000)
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('Invalid withdrawal amount')
  })
})

// ── accruedSalary ────────────────────────────────────────────────────────────

describe('CourierEntity.accruedSalary', () => {
  it('calculates salary for 1 day', () => {
    const created = new Date('2024-01-01')
    const courier = makeCourier({ salary: 50000, createdAt: created })
    const asOf = new Date('2024-01-01')
    expect(courier.accruedSalary(asOf)).toBe(50000)
  })

  it('calculates salary for multiple days', () => {
    const created = new Date('2024-01-01')
    const courier = makeCourier({ salary: 50000, createdAt: created })
    const asOf = new Date('2024-01-10') // 10 days
    expect(courier.accruedSalary(asOf)).toBe(500000)
  })

  it('returns 0 if asOf is before creation', () => {
    const created = new Date('2024-01-10')
    const courier = makeCourier({ salary: 50000, createdAt: created })
    const asOf = new Date('2024-01-01')
    expect(courier.accruedSalary(asOf)).toBe(0)
  })
})

// ── availableBalance ─────────────────────────────────────────────────────────

describe('CourierEntity.availableBalance', () => {
  it('calculates accrued minus paid', () => {
    const created = new Date('2024-01-01')
    const courier = makeCourier({ salary: 50000, createdAt: created, totalSalaryPaid: 100000 })
    const asOf = new Date('2024-01-05') // 5 days * 50000 = 250000
    expect(courier.availableBalance(asOf)).toBe(150000)
  })

  it('can be negative when more paid than accrued', () => {
    const created = new Date('2024-01-01')
    const courier = makeCourier({ salary: 50000, createdAt: created, totalSalaryPaid: 500000 })
    const asOf = new Date('2024-01-05') // 5 days * 50000 = 250000
    expect(courier.availableBalance(asOf)).toBe(-250000)
  })
})
