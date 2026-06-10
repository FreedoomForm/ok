import { describe, it, expect } from 'vitest'
import { OrderEntity, OrderStatusTransitionError } from './order.entity'
import type { OrderStatus, PaymentStatus } from '../contracts'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeOrder(overrides: Partial<{ orderStatus: OrderStatus; paymentStatus: PaymentStatus; isPrepaid: boolean; amountReceived: number | null; quantity: number; dailyPrice: number }> = {}): OrderEntity {
  return new OrderEntity(
    'order-1',
    overrides.orderStatus ?? 'NEW',
    overrides.paymentStatus ?? 'UNPAID',
    overrides.isPrepaid ?? false,
    overrides.amountReceived ?? null,
    overrides.quantity ?? 1,
    overrides.dailyPrice ?? 84000,
  )
}

// ── canTransitionTo ──────────────────────────────────────────────────────────

describe('OrderEntity.canTransitionTo', () => {
  it('allows NEW → PENDING', () => {
    expect(makeOrder({ orderStatus: 'NEW' }).canTransitionTo('PENDING')).toBe(true)
  })

  it('allows NEW → IN_PROCESS', () => {
    expect(makeOrder({ orderStatus: 'NEW' }).canTransitionTo('IN_PROCESS')).toBe(true)
  })

  it('allows NEW → IN_DELIVERY', () => {
    expect(makeOrder({ orderStatus: 'NEW' }).canTransitionTo('IN_DELIVERY')).toBe(true)
  })

  it('allows NEW → CANCELED', () => {
    expect(makeOrder({ orderStatus: 'NEW' }).canTransitionTo('CANCELED')).toBe(true)
  })

  it('allows PENDING → IN_PROCESS', () => {
    expect(makeOrder({ orderStatus: 'PENDING' }).canTransitionTo('IN_PROCESS')).toBe(true)
  })

  it('allows PENDING → IN_DELIVERY', () => {
    expect(makeOrder({ orderStatus: 'PENDING' }).canTransitionTo('IN_DELIVERY')).toBe(true)
  })

  it('allows PENDING → PAUSED', () => {
    expect(makeOrder({ orderStatus: 'PENDING' }).canTransitionTo('PAUSED')).toBe(true)
  })

  it('allows PENDING → CANCELED', () => {
    expect(makeOrder({ orderStatus: 'PENDING' }).canTransitionTo('CANCELED')).toBe(true)
  })

  it('allows IN_PROCESS → IN_DELIVERY', () => {
    expect(makeOrder({ orderStatus: 'IN_PROCESS' }).canTransitionTo('IN_DELIVERY')).toBe(true)
  })

  it('allows IN_PROCESS → CANCELED', () => {
    expect(makeOrder({ orderStatus: 'IN_PROCESS' }).canTransitionTo('CANCELED')).toBe(true)
  })

  it('allows IN_DELIVERY → DELIVERED', () => {
    expect(makeOrder({ orderStatus: 'IN_DELIVERY' }).canTransitionTo('DELIVERED')).toBe(true)
  })

  it('allows IN_DELIVERY → PAUSED', () => {
    expect(makeOrder({ orderStatus: 'IN_DELIVERY' }).canTransitionTo('PAUSED')).toBe(true)
  })

  it('allows IN_DELIVERY → CANCELED', () => {
    expect(makeOrder({ orderStatus: 'IN_DELIVERY' }).canTransitionTo('CANCELED')).toBe(true)
  })

  it('allows IN_DELIVERY → FAILED', () => {
    expect(makeOrder({ orderStatus: 'IN_DELIVERY' }).canTransitionTo('FAILED')).toBe(true)
  })

  it('allows PAUSED → IN_DELIVERY', () => {
    expect(makeOrder({ orderStatus: 'PAUSED' }).canTransitionTo('IN_DELIVERY')).toBe(true)
  })

  it('allows PAUSED → CANCELED', () => {
    expect(makeOrder({ orderStatus: 'PAUSED' }).canTransitionTo('CANCELED')).toBe(true)
  })
})

// ── Invalid transitions ──────────────────────────────────────────────────────

describe('OrderEntity invalid transitions', () => {
  it('rejects DELIVERED → PREPARING (terminal state)', () => {
    expect(makeOrder({ orderStatus: 'DELIVERED' }).canTransitionTo('IN_PROCESS')).toBe(false)
  })

  it('rejects DELIVERED → any other status', () => {
    const order = makeOrder({ orderStatus: 'DELIVERED' })
    const statuses: OrderStatus[] = ['NEW', 'PENDING', 'IN_PROCESS', 'IN_DELIVERY', 'PAUSED', 'CANCELED', 'FAILED']
    for (const s of statuses) {
      expect(order.canTransitionTo(s)).toBe(false)
    }
  })

  it('rejects CANCELED → any other status (terminal state)', () => {
    const order = makeOrder({ orderStatus: 'CANCELED' })
    const statuses: OrderStatus[] = ['NEW', 'PENDING', 'IN_PROCESS', 'IN_DELIVERY', 'PAUSED', 'DELIVERED', 'FAILED']
    for (const s of statuses) {
      expect(order.canTransitionTo(s)).toBe(false)
    }
  })

  it('rejects FAILED → any other status (terminal state)', () => {
    const order = makeOrder({ orderStatus: 'FAILED' })
    const statuses: OrderStatus[] = ['NEW', 'PENDING', 'IN_PROCESS', 'IN_DELIVERY', 'PAUSED', 'DELIVERED', 'CANCELED']
    for (const s of statuses) {
      expect(order.canTransitionTo(s)).toBe(false)
    }
  })

  it('rejects backward transitions like IN_DELIVERY → PENDING', () => {
    expect(makeOrder({ orderStatus: 'IN_DELIVERY' }).canTransitionTo('PENDING')).toBe(false)
  })

  it('rejects NEW → DELIVERED (skip steps)', () => {
    expect(makeOrder({ orderStatus: 'NEW' }).canTransitionTo('DELIVERED')).toBe(false)
  })
})

// ── Any status can transition to CANCELED (except terminals) ─────────────────

describe('OrderEntity CANCELED transition', () => {
  const nonTerminalStatuses: OrderStatus[] = ['NEW', 'PENDING', 'IN_PROCESS', 'IN_DELIVERY', 'PAUSED']

  for (const status of nonTerminalStatuses) {
    it(`allows ${status} → CANCELED`, () => {
      expect(makeOrder({ orderStatus: status }).canTransitionTo('CANCELED')).toBe(true)
    })
  }
})

// ── isTerminal ───────────────────────────────────────────────────────────────

describe('OrderEntity.isTerminal', () => {
  it('returns true for DELIVERED', () => {
    expect(makeOrder({ orderStatus: 'DELIVERED' }).isTerminal()).toBe(true)
  })

  it('returns true for CANCELED', () => {
    expect(makeOrder({ orderStatus: 'CANCELED' }).isTerminal()).toBe(true)
  })

  it('returns true for FAILED', () => {
    expect(makeOrder({ orderStatus: 'FAILED' }).isTerminal()).toBe(true)
  })

  it('returns false for NEW', () => {
    expect(makeOrder({ orderStatus: 'NEW' }).isTerminal()).toBe(false)
  })

  it('returns false for PENDING', () => {
    expect(makeOrder({ orderStatus: 'PENDING' }).isTerminal()).toBe(false)
  })

  it('returns false for IN_PROCESS', () => {
    expect(makeOrder({ orderStatus: 'IN_PROCESS' }).isTerminal()).toBe(false)
  })

  it('returns false for IN_DELIVERY', () => {
    expect(makeOrder({ orderStatus: 'IN_DELIVERY' }).isTerminal()).toBe(false)
  })

  it('returns false for PAUSED', () => {
    expect(makeOrder({ orderStatus: 'PAUSED' }).isTerminal()).toBe(false)
  })
})

// ── assertCanTransitionTo ────────────────────────────────────────────────────

describe('OrderEntity.assertCanTransitionTo', () => {
  it('does not throw for valid transitions', () => {
    expect(() => makeOrder({ orderStatus: 'NEW' }).assertCanTransitionTo('PENDING')).not.toThrow()
  })

  it('throws OrderStatusTransitionError for invalid transitions', () => {
    expect(() => makeOrder({ orderStatus: 'DELIVERED' }).assertCanTransitionTo('PENDING')).toThrow(OrderStatusTransitionError)
  })
})

// ── Convenience methods ──────────────────────────────────────────────────────

describe('OrderEntity convenience methods', () => {
  it('canBeDelivered() returns true for IN_DELIVERY', () => {
    expect(makeOrder({ orderStatus: 'IN_DELIVERY' }).canBeDelivered()).toBe(true)
  })

  it('canBeDelivered() returns false for PENDING', () => {
    expect(makeOrder({ orderStatus: 'PENDING' }).canBeDelivered()).toBe(false)
  })

  it('canBeCancelled() returns true for NEW', () => {
    expect(makeOrder({ orderStatus: 'NEW' }).canBeCancelled()).toBe(true)
  })

  it('canBeCancelled() returns false for DELIVERED', () => {
    expect(makeOrder({ orderStatus: 'DELIVERED' }).canBeCancelled()).toBe(false)
  })

  it('canStartDelivery() returns true for PENDING', () => {
    expect(makeOrder({ orderStatus: 'PENDING' }).canStartDelivery()).toBe(true)
  })

  it('canPauseDelivery() returns true for IN_DELIVERY', () => {
    expect(makeOrder({ orderStatus: 'IN_DELIVERY' }).canPauseDelivery()).toBe(true)
  })

  it('canResumeDelivery() returns true for PAUSED', () => {
    expect(makeOrder({ orderStatus: 'PAUSED' }).canResumeDelivery()).toBe(true)
  })

  it('canResumeDelivery() returns false for IN_DELIVERY (not paused)', () => {
    expect(makeOrder({ orderStatus: 'IN_DELIVERY' }).canResumeDelivery()).toBe(false)
  })
})

// ── resolvePaymentStatus ─────────────────────────────────────────────────────

describe('OrderEntity.resolvePaymentStatus', () => {
  it('returns PAID when amount received >= total cost', () => {
    const order = makeOrder({ dailyPrice: 84000, quantity: 1 })
    expect(order.resolvePaymentStatus(84000)).toBe('PAID')
    expect(order.resolvePaymentStatus(100000)).toBe('PAID')
  })

  it('returns PARTIAL when amount received > 0 but < total cost', () => {
    const order = makeOrder({ dailyPrice: 84000, quantity: 1 })
    expect(order.resolvePaymentStatus(50000)).toBe('PARTIAL')
  })

  it('returns UNPAID when amount received is 0', () => {
    const order = makeOrder({ dailyPrice: 84000, quantity: 1 })
    expect(order.resolvePaymentStatus(0)).toBe('UNPAID')
  })

  it('calculates total cost correctly for multiple quantities', () => {
    const order = makeOrder({ dailyPrice: 50000, quantity: 3 })
    expect(order.totalCost()).toBe(150000)
    expect(order.resolvePaymentStatus(150000)).toBe('PAID')
    expect(order.resolvePaymentStatus(100000)).toBe('PARTIAL')
  })
})

// ── totalCost ────────────────────────────────────────────────────────────────

describe('OrderEntity.totalCost', () => {
  it('calculates dailyPrice * quantity', () => {
    expect(makeOrder({ dailyPrice: 84000, quantity: 1 }).totalCost()).toBe(84000)
    expect(makeOrder({ dailyPrice: 50000, quantity: 3 }).totalCost()).toBe(150000)
  })
})
