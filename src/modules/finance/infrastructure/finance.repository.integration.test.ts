/**
 * Finance Repository — Integration Tests
 *
 * These tests verify that the finance repository functions correctly
 * interact with the database. They are skipped when no database
 * is available (DATABASE_URL not set).
 */

import { describe, it, expect } from 'vitest'
import { listTransactions, getAdminBalances, getFinanceClients } from './finance.repository'

// Skip all integration tests when no test database is available
// Only run when RUN_INTEGRATION_TESTS=1 is set (requires a running database)
const describeIntegration = process.env.RUN_INTEGRATION_TESTS === '1' ? describe : describe.skip

describeIntegration('FinanceRepository (integration)', () => {
  // ── listTransactions ──────────────────────────────────────────────────────

  describe('listTransactions', () => {
    it('returns result with company balance and history', async () => {
      // We need a valid admin ID; use a non-existent one for safety
      const result = await listTransactions({
        effectiveAdminId: 'nonexistent-admin-id',
        limit: 5,
      })

      expect(result).toHaveProperty('companyBalance')
      expect(result).toHaveProperty('history')
      expect(result).toHaveProperty('pagination')
      expect(typeof result.companyBalance).toBe('number')
      expect(Array.isArray(result.history)).toBe(true)
    })

    it('returns pagination with correct shape', async () => {
      const result = await listTransactions({
        effectiveAdminId: 'nonexistent-admin-id',
        limit: 5,
      })

      expect(result.pagination).toHaveProperty('nextCursor')
      expect(result.pagination).toHaveProperty('hasMore')
      expect(typeof result.pagination!.hasMore).toBe('boolean')
    })

    it('returns empty history for non-existent admin', async () => {
      const result = await listTransactions({
        effectiveAdminId: 'nonexistent-admin-id',
        limit: 5,
      })

      expect(result.history).toHaveLength(0)
    })
  })

  // ── getAdminBalances ──────────────────────────────────────────────────────

  describe('getAdminBalances', () => {
    it('returns result with asOf and admins array', async () => {
      const result = await getAdminBalances({
        effectiveAdminId: 'nonexistent-admin-id',
        groupAdminIds: null,
        isSuperAdmin: true,
        asOf: new Date(),
        from: null,
        to: null,
      })

      expect(result).toHaveProperty('asOf')
      expect(result).toHaveProperty('admins')
      expect(Array.isArray(result.admins)).toBe(true)
    })

    it('admin balance rows have correct shape', async () => {
      const result = await getAdminBalances({
        effectiveAdminId: 'nonexistent-admin-id',
        groupAdminIds: null,
        isSuperAdmin: true,
        asOf: new Date(),
        from: null,
        to: null,
      })

      if (result.admins.length === 0) return

      const admin = result.admins[0]
      expect(admin).toHaveProperty('id')
      expect(admin).toHaveProperty('name')
      expect(admin).toHaveProperty('role')
      expect(admin).toHaveProperty('isActive')
      expect(admin).toHaveProperty('salaryPerDay')
      expect(admin).toHaveProperty('days')
      expect(admin).toHaveProperty('accrued')
      expect(admin).toHaveProperty('paid')
      expect(admin).toHaveProperty('balance')
    })
  })

  // ── getFinanceClients ─────────────────────────────────────────────────────

  describe('getFinanceClients', () => {
    it('returns finance client summaries', async () => {
      const result = await getFinanceClients({
        groupAdminIds: null,
      })

      expect(Array.isArray(result)).toBe(true)
    })

    it('client summaries have correct shape when data exists', async () => {
      const result = await getFinanceClients({
        groupAdminIds: null,
      })

      if (result.length === 0) return

      const client = result[0]
      expect(client).toHaveProperty('id')
      expect(client).toHaveProperty('name')
      expect(client).toHaveProperty('phone')
      expect(client).toHaveProperty('balance')
      expect(client).toHaveProperty('dailyPrice')
      expect(client).toHaveProperty('createdAt')
    })

    it('filters by positive balance', async () => {
      const result = await getFinanceClients({
        groupAdminIds: null,
        filter: 'positive',
      })

      for (const client of result) {
        expect(client.balance).toBeGreaterThan(0)
      }
    })

    it('filters by negative balance', async () => {
      const result = await getFinanceClients({
        groupAdminIds: null,
        filter: 'negative',
      })

      for (const client of result) {
        expect(client.balance).toBeLessThan(0)
      }
    })

    it('filters by zero balance', async () => {
      const result = await getFinanceClients({
        groupAdminIds: null,
        filter: 'zero',
      })

      for (const client of result) {
        expect(client.balance).toBe(0)
      }
    })
  })
})
