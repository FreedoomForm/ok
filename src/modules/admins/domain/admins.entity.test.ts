import { describe, it, expect } from 'vitest'
import { AdminEntity } from './admins.entity'
import type { AdminRole } from '@/modules/shared/auth/roles'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeAdmin(overrides: Partial<{
  role: AdminRole
  isActive: boolean
  createdBy: string | null
}> = {}): AdminEntity {
  return new AdminEntity(
    'admin-1',
    overrides.role ?? 'SUPER_ADMIN',
    overrides.isActive ?? true,
    overrides.createdBy ?? null,
  )
}

// ── canCreateSubordinate ─────────────────────────────────────────────────────

describe('AdminEntity.canCreateSubordinate', () => {
  it('allows SUPER_ADMIN to create MIDDLE_ADMIN', () => {
    const result = makeAdmin({ role: 'SUPER_ADMIN' }).canCreateSubordinate('MIDDLE_ADMIN')
    expect(result.allowed).toBe(true)
  })

  it('allows SUPER_ADMIN to create LOW_ADMIN', () => {
    const result = makeAdmin({ role: 'SUPER_ADMIN' }).canCreateSubordinate('LOW_ADMIN')
    expect(result.allowed).toBe(true)
  })

  it('allows SUPER_ADMIN to create COURIER', () => {
    const result = makeAdmin({ role: 'SUPER_ADMIN' }).canCreateSubordinate('COURIER')
    expect(result.allowed).toBe(true)
  })

  it('allows SUPER_ADMIN to create WORKER', () => {
    const result = makeAdmin({ role: 'SUPER_ADMIN' }).canCreateSubordinate('WORKER')
    expect(result.allowed).toBe(true)
  })

  it('rejects SUPER_ADMIN creating another SUPER_ADMIN', () => {
    const result = makeAdmin({ role: 'SUPER_ADMIN' }).canCreateSubordinate('SUPER_ADMIN')
    expect(result.allowed).toBe(false)
  })

  it('allows MIDDLE_ADMIN to create LOW_ADMIN', () => {
    const result = makeAdmin({ role: 'MIDDLE_ADMIN' }).canCreateSubordinate('LOW_ADMIN')
    expect(result.allowed).toBe(true)
  })

  it('allows MIDDLE_ADMIN to create COURIER', () => {
    const result = makeAdmin({ role: 'MIDDLE_ADMIN' }).canCreateSubordinate('COURIER')
    expect(result.allowed).toBe(true)
  })

  it('allows MIDDLE_ADMIN to create WORKER', () => {
    const result = makeAdmin({ role: 'MIDDLE_ADMIN' }).canCreateSubordinate('WORKER')
    expect(result.allowed).toBe(true)
  })

  it('rejects MIDDLE_ADMIN creating SUPER_ADMIN', () => {
    const result = makeAdmin({ role: 'MIDDLE_ADMIN' }).canCreateSubordinate('SUPER_ADMIN')
    expect(result.allowed).toBe(false)
  })

  it('rejects MIDDLE_ADMIN creating MIDDLE_ADMIN', () => {
    const result = makeAdmin({ role: 'MIDDLE_ADMIN' }).canCreateSubordinate('MIDDLE_ADMIN')
    expect(result.allowed).toBe(false)
  })

  it('rejects LOW_ADMIN creating any subordinate', () => {
    const admin = makeAdmin({ role: 'LOW_ADMIN' })
    expect(admin.canCreateSubordinate('COURIER').allowed).toBe(false)
    expect(admin.canCreateSubordinate('WORKER').allowed).toBe(false)
    expect(admin.canCreateSubordinate('LOW_ADMIN').allowed).toBe(false)
  })

  it('rejects COURIER creating any subordinate', () => {
    const admin = makeAdmin({ role: 'COURIER' })
    expect(admin.canCreateSubordinate('WORKER').allowed).toBe(false)
  })

  it('rejects WORKER creating any subordinate', () => {
    const admin = makeAdmin({ role: 'WORKER' })
    expect(admin.canCreateSubordinate('COURIER').allowed).toBe(false)
  })
})

// ── canBeDeleted ─────────────────────────────────────────────────────────────

describe('AdminEntity.canBeDeleted', () => {
  it('rejects deleting yourself', () => {
    const admin = makeAdmin({ role: 'LOW_ADMIN' })
    const result = admin.canBeDeleted('SUPER_ADMIN', 'admin-1')
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('Cannot delete yourself')
  })

  it('allows SUPER_ADMIN deleting LOW_ADMIN', () => {
    const admin = makeAdmin({ role: 'LOW_ADMIN' })
    const result = admin.canBeDeleted('SUPER_ADMIN', 'other-admin')
    expect(result.allowed).toBe(true)
  })

  it('allows SUPER_ADMIN deleting MIDDLE_ADMIN', () => {
    const admin = makeAdmin({ role: 'MIDDLE_ADMIN' })
    const result = admin.canBeDeleted('SUPER_ADMIN', 'other-admin')
    expect(result.allowed).toBe(true)
  })

  it('allows SUPER_ADMIN deleting COURIER', () => {
    const admin = makeAdmin({ role: 'COURIER' })
    const result = admin.canBeDeleted('SUPER_ADMIN', 'other-admin')
    expect(result.allowed).toBe(true)
  })

  it('rejects MIDDLE_ADMIN deleting SUPER_ADMIN', () => {
    const admin = makeAdmin({ role: 'SUPER_ADMIN' })
    const result = admin.canBeDeleted('MIDDLE_ADMIN', 'other-admin')
    expect(result.allowed).toBe(false)
  })

  it('rejects LOW_ADMIN deleting MIDDLE_ADMIN', () => {
    const admin = makeAdmin({ role: 'MIDDLE_ADMIN' })
    const result = admin.canBeDeleted('LOW_ADMIN', 'other-admin')
    expect(result.allowed).toBe(false)
  })

  it('rejects COURIER deleting LOW_ADMIN', () => {
    const admin = makeAdmin({ role: 'LOW_ADMIN' })
    const result = admin.canBeDeleted('COURIER', 'other-admin')
    expect(result.allowed).toBe(false)
  })

  it('allows MIDDLE_ADMIN deleting LOW_ADMIN', () => {
    const admin = makeAdmin({ role: 'LOW_ADMIN' })
    const result = admin.canBeDeleted('MIDDLE_ADMIN', 'other-admin')
    expect(result.allowed).toBe(true)
  })
})

// ── canToggleStatus ──────────────────────────────────────────────────────────

describe('AdminEntity.canToggleStatus', () => {
  it('rejects toggling your own status', () => {
    const admin = makeAdmin({ role: 'LOW_ADMIN' })
    const result = admin.canToggleStatus('SUPER_ADMIN', 'admin-1')
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe('Cannot toggle your own status')
  })

  it('allows SUPER_ADMIN toggling MIDDLE_ADMIN', () => {
    const admin = makeAdmin({ role: 'MIDDLE_ADMIN' })
    const result = admin.canToggleStatus('SUPER_ADMIN', 'other-admin')
    expect(result.allowed).toBe(true)
  })

  it('rejects MIDDLE_ADMIN toggling SUPER_ADMIN', () => {
    const admin = makeAdmin({ role: 'SUPER_ADMIN' })
    const result = admin.canToggleStatus('MIDDLE_ADMIN', 'other-admin')
    expect(result.allowed).toBe(false)
  })

  it('allows MIDDLE_ADMIN toggling LOW_ADMIN', () => {
    const admin = makeAdmin({ role: 'LOW_ADMIN' })
    const result = admin.canToggleStatus('MIDDLE_ADMIN', 'other-admin')
    expect(result.allowed).toBe(true)
  })
})

// ── isHighLevel ──────────────────────────────────────────────────────────────

describe('AdminEntity.isHighLevel', () => {
  it('returns true for SUPER_ADMIN', () => {
    expect(makeAdmin({ role: 'SUPER_ADMIN' }).isHighLevel()).toBe(true)
  })

  it('returns true for MIDDLE_ADMIN', () => {
    expect(makeAdmin({ role: 'MIDDLE_ADMIN' }).isHighLevel()).toBe(true)
  })

  it('returns false for LOW_ADMIN', () => {
    expect(makeAdmin({ role: 'LOW_ADMIN' }).isHighLevel()).toBe(false)
  })

  it('returns false for COURIER', () => {
    expect(makeAdmin({ role: 'COURIER' }).isHighLevel()).toBe(false)
  })

  it('returns false for WORKER', () => {
    expect(makeAdmin({ role: 'WORKER' }).isHighLevel()).toBe(false)
  })
})
