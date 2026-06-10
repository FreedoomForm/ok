import { describe, it, expect } from 'vitest'
import { OrderPolicy, type OrderPolicyUser, type OrderPolicyOrder } from './order.policy'
import type { OrderStatus } from '../contracts'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<OrderPolicyUser> = {}): OrderPolicyUser {
  return { id: overrides.id ?? 'user-1', role: overrides.role ?? 'SUPER_ADMIN' }
}

function makeOrder(overrides: Partial<OrderPolicyOrder> = {}): OrderPolicyOrder {
  return {
    id: overrides.id ?? 'order-1',
    orderStatus: overrides.orderStatus ?? 'PENDING',
    courierId: overrides.courierId ?? null,
    adminId: overrides.adminId ?? null,
  }
}

// ── canChangeStatus ──────────────────────────────────────────────────────────

describe('OrderPolicy.canChangeStatus', () => {
  describe('SUPER_ADMIN', () => {
    it('can always change any order status', () => {
      const user = makeUser({ role: 'SUPER_ADMIN' })
      const order = makeOrder({ orderStatus: 'PENDING' })
      const result = OrderPolicy.canChangeStatus(user, order, 'IN_DELIVERY', null)
      expect(result.allowed).toBe(true)
    })

    it('can change status regardless of group', () => {
      const user = makeUser({ role: 'SUPER_ADMIN' })
      const order = makeOrder({ orderStatus: 'NEW', adminId: 'other-admin' })
      const result = OrderPolicy.canChangeStatus(user, order, 'PENDING', ['admin-1'])
      expect(result.allowed).toBe(true)
    })
  })

  describe('COURIER', () => {
    it('can change status of orders assigned to them to allowed statuses', () => {
      const user = makeUser({ id: 'courier-1', role: 'COURIER' })
      const order = makeOrder({ courierId: 'courier-1' })
      const allowedStatuses: OrderStatus[] = ['IN_DELIVERY', 'PAUSED', 'DELIVERED', 'FAILED']
      for (const status of allowedStatuses) {
        const result = OrderPolicy.canChangeStatus(user, order, status, null)
        expect(result.allowed).toBe(true)
      }
    })

    it('cannot change status of orders not assigned to them', () => {
      const user = makeUser({ id: 'courier-1', role: 'COURIER' })
      const order = makeOrder({ courierId: 'courier-2' })
      const result = OrderPolicy.canChangeStatus(user, order, 'DELIVERED', null)
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('Courier can only modify assigned orders')
    })

    it('cannot set disallowed statuses', () => {
      const user = makeUser({ id: 'courier-1', role: 'COURIER' })
      const order = makeOrder({ courierId: 'courier-1' })
      const disallowedStatuses: OrderStatus[] = ['NEW', 'PENDING', 'IN_PROCESS', 'CANCELED']
      for (const status of disallowedStatuses) {
        const result = OrderPolicy.canChangeStatus(user, order, status, null)
        expect(result.allowed).toBe(false)
        expect(result.reason).toBe('Courier cannot set this status')
      }
    })
  })

  describe('MIDDLE_ADMIN', () => {
    it('can change status of orders in their group', () => {
      const user = makeUser({ role: 'MIDDLE_ADMIN' })
      const order = makeOrder({ adminId: 'admin-in-group' })
      const result = OrderPolicy.canChangeStatus(user, order, 'IN_DELIVERY', ['admin-in-group'])
      expect(result.allowed).toBe(true)
    })

    it('cannot change status of orders outside their group', () => {
      const user = makeUser({ role: 'MIDDLE_ADMIN' })
      const order = makeOrder({ adminId: 'admin-outside' })
      const result = OrderPolicy.canChangeStatus(user, order, 'IN_DELIVERY', ['admin-in-group'])
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('Order not in admin group')
    })

    it('allows when order has no adminId (unassigned order)', () => {
      const user = makeUser({ role: 'MIDDLE_ADMIN' })
      const order = makeOrder({ adminId: null })
      const result = OrderPolicy.canChangeStatus(user, order, 'IN_DELIVERY', ['admin-in-group'])
      expect(result.allowed).toBe(true)
    })

    it('allows when groupAdminIds is null (no restriction)', () => {
      const user = makeUser({ role: 'MIDDLE_ADMIN' })
      const order = makeOrder({ adminId: 'any-admin' })
      const result = OrderPolicy.canChangeStatus(user, order, 'IN_DELIVERY', null)
      expect(result.allowed).toBe(true)
    })
  })

  describe('LOW_ADMIN', () => {
    it('can always set IN_DELIVERY status', () => {
      const user = makeUser({ role: 'LOW_ADMIN' })
      const order = makeOrder()
      const result = OrderPolicy.canChangeStatus(user, order, 'IN_DELIVERY', null)
      expect(result.allowed).toBe(true)
    })

    it('can change status of orders in own group', () => {
      const user = makeUser({ role: 'LOW_ADMIN' })
      const order = makeOrder({ adminId: 'admin-in-group' })
      const result = OrderPolicy.canChangeStatus(user, order, 'PENDING', ['admin-in-group'])
      expect(result.allowed).toBe(true)
    })

    it('cannot change status of orders outside own group', () => {
      const user = makeUser({ role: 'LOW_ADMIN' })
      const order = makeOrder({ adminId: 'admin-outside' })
      const result = OrderPolicy.canChangeStatus(user, order, 'PENDING', ['admin-in-group'])
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('Low admin cannot modify this order')
    })
  })
})

// ── canDelete ────────────────────────────────────────────────────────────────

describe('OrderPolicy.canDelete', () => {
  it('allows SUPER_ADMIN to delete any order', () => {
    const user = makeUser({ role: 'SUPER_ADMIN' })
    const order = makeOrder()
    const result = OrderPolicy.canDelete(user, order, null)
    expect(result.allowed).toBe(true)
  })

  it('rejects COURIER from deleting orders', () => {
    const user = makeUser({ role: 'COURIER' })
    const order = makeOrder()
    const result = OrderPolicy.canDelete(user, order, null)
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('Couriers cannot delete orders')
  })

  it('allows admins to delete orders in their group', () => {
    const user = makeUser({ role: 'MIDDLE_ADMIN' })
    const order = makeOrder({ adminId: 'admin-in-group' })
    const result = OrderPolicy.canDelete(user, order, ['admin-in-group'])
    expect(result.allowed).toBe(true)
  })

  it('rejects admins from deleting orders outside their group', () => {
    const user = makeUser({ role: 'LOW_ADMIN' })
    const order = makeOrder({ adminId: 'admin-outside' })
    const result = OrderPolicy.canDelete(user, order, ['admin-in-group'])
    expect(result.allowed).toBe(false)
  })
})

// ── canAcceptOrder ───────────────────────────────────────────────────────────

describe('OrderPolicy.canAcceptOrder', () => {
  it('allows COURIER to accept PENDING order', () => {
    const user = makeUser({ id: 'courier-1', role: 'COURIER' })
    const order = makeOrder({ orderStatus: 'PENDING' })
    const result = OrderPolicy.canAcceptOrder(user, order)
    expect(result.allowed).toBe(true)
  })

  it('allows COURIER to accept NEW order', () => {
    const user = makeUser({ id: 'courier-1', role: 'COURIER' })
    const order = makeOrder({ orderStatus: 'NEW' })
    const result = OrderPolicy.canAcceptOrder(user, order)
    expect(result.allowed).toBe(true)
  })

  it('rejects non-COURIER from accepting orders', () => {
    const user = makeUser({ role: 'SUPER_ADMIN' })
    const order = makeOrder({ orderStatus: 'PENDING' })
    const result = OrderPolicy.canAcceptOrder(user, order)
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('Only couriers can accept orders')
  })

  it('rejects COURIER from accepting non-PENDING/NEW orders', () => {
    const user = makeUser({ id: 'courier-1', role: 'COURIER' })
    const order = makeOrder({ orderStatus: 'IN_DELIVERY' })
    const result = OrderPolicy.canAcceptOrder(user, order)
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('cannot be accepted')
  })
})
