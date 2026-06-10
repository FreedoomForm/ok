import { describe, it, expect } from 'vitest'
import { CustomerPolicy, type CustomerPolicyUser, type CustomerPolicyCustomer } from './customer.policy'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<CustomerPolicyUser> = {}): CustomerPolicyUser {
  return { id: overrides.id ?? 'user-1', role: overrides.role ?? 'SUPER_ADMIN' }
}

function makeCustomer(overrides: Partial<CustomerPolicyCustomer> = {}): CustomerPolicyCustomer {
  return {
    id: overrides.id ?? 'cust-1',
    isActive: overrides.isActive ?? true,
    activeOrderCount: overrides.activeOrderCount ?? 0,
    createdBy: overrides.createdBy ?? null,
  }
}

// ── canDelete ────────────────────────────────────────────────────────────────

describe('CustomerPolicy.canDelete', () => {
  it('allows SUPER_ADMIN to delete any customer', () => {
    const user = makeUser({ role: 'SUPER_ADMIN' })
    const customer = makeCustomer()
    const result = CustomerPolicy.canDelete(user, customer, null)
    expect(result.allowed).toBe(true)
  })

  it('allows admin to delete customer in their group', () => {
    const user = makeUser({ role: 'MIDDLE_ADMIN' })
    const customer = makeCustomer({ createdBy: 'admin-in-group' })
    const result = CustomerPolicy.canDelete(user, customer, ['admin-in-group'])
    expect(result.allowed).toBe(true)
  })

  it('rejects admin from deleting customer outside their group', () => {
    const user = makeUser({ role: 'MIDDLE_ADMIN' })
    const customer = makeCustomer({ createdBy: 'admin-outside' })
    const result = CustomerPolicy.canDelete(user, customer, ['admin-in-group'])
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('Customer not in admin group')
  })

  it('allows when groupAdminIds is null (no restriction)', () => {
    const user = makeUser({ role: 'MIDDLE_ADMIN' })
    const customer = makeCustomer({ createdBy: 'any-admin' })
    const result = CustomerPolicy.canDelete(user, customer, null)
    expect(result.allowed).toBe(true)
  })

  it('allows when customer has no createdBy', () => {
    const user = makeUser({ role: 'LOW_ADMIN' })
    const customer = makeCustomer({ createdBy: null })
    const result = CustomerPolicy.canDelete(user, customer, ['admin-in-group'])
    expect(result.allowed).toBe(true)
  })
})

// ── canToggleStatus ──────────────────────────────────────────────────────────

describe('CustomerPolicy.canToggleStatus', () => {
  it('allows SUPER_ADMIN to toggle any customer status', () => {
    const user = makeUser({ role: 'SUPER_ADMIN' })
    const customer = makeCustomer()
    const result = CustomerPolicy.canToggleStatus(user, customer, null)
    expect(result.allowed).toBe(true)
  })

  it('rejects COURIER from toggling customer status', () => {
    const user = makeUser({ role: 'COURIER' })
    const customer = makeCustomer()
    const result = CustomerPolicy.canToggleStatus(user, customer, null)
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('Couriers cannot toggle customer status')
  })

  it('allows admin to toggle customer in their group', () => {
    const user = makeUser({ role: 'MIDDLE_ADMIN' })
    const customer = makeCustomer({ createdBy: 'admin-in-group' })
    const result = CustomerPolicy.canToggleStatus(user, customer, ['admin-in-group'])
    expect(result.allowed).toBe(true)
  })

  it('rejects admin from toggling customer outside their group', () => {
    const user = makeUser({ role: 'LOW_ADMIN' })
    const customer = makeCustomer({ createdBy: 'admin-outside' })
    const result = CustomerPolicy.canToggleStatus(user, customer, ['admin-in-group'])
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('Customer not in admin group')
  })
})

// ── canPermanentlyDelete ─────────────────────────────────────────────────────

describe('CustomerPolicy.canPermanentlyDelete', () => {
  it('allows SUPER_ADMIN', () => {
    const user = makeUser({ role: 'SUPER_ADMIN' })
    const result = CustomerPolicy.canPermanentlyDelete(user)
    expect(result.allowed).toBe(true)
  })

  it('allows MIDDLE_ADMIN', () => {
    const user = makeUser({ role: 'MIDDLE_ADMIN' })
    const result = CustomerPolicy.canPermanentlyDelete(user)
    expect(result.allowed).toBe(true)
  })

  it('rejects LOW_ADMIN', () => {
    const user = makeUser({ role: 'LOW_ADMIN' })
    const result = CustomerPolicy.canPermanentlyDelete(user)
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('Only SUPER_ADMIN or MIDDLE_ADMIN can permanently delete customers')
  })

  it('rejects COURIER', () => {
    const user = makeUser({ role: 'COURIER' })
    const result = CustomerPolicy.canPermanentlyDelete(user)
    expect(result.allowed).toBe(false)
  })

  it('rejects WORKER', () => {
    const user = makeUser({ role: 'WORKER' })
    const result = CustomerPolicy.canPermanentlyDelete(user)
    expect(result.allowed).toBe(false)
  })
})
