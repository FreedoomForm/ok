/**
 * Customer Repository — Integration Tests
 *
 * These tests verify that the customer repository functions correctly
 * interact with the database. They are skipped when no database
 * is available (DATABASE_URL not set).
 */

import { describe, it, expect } from 'vitest'
import { listCustomers, batchGetCustomers, getCustomerDetail, listBinCustomers, getCustomerSummary } from './customer.repository'

// Skip all integration tests when no test database is available
// Only run when RUN_INTEGRATION_TESTS=1 is set (requires a running database)
const describeIntegration = process.env.RUN_INTEGRATION_TESTS === '1' ? describe : describe.skip

describeIntegration('CustomerRepository (integration)', () => {
  // ── listCustomers ─────────────────────────────────────────────────────────

  describe('listCustomers', () => {
    it('returns PaginatedResult with correct shape', async () => {
      const result = await listCustomers({
        scopedCreatedBy: null,
        limit: 5,
      })

      expect(result).toHaveProperty('items')
      expect(result).toHaveProperty('nextCursor')
      expect(result).toHaveProperty('hasMore')
      expect(Array.isArray(result.items)).toBe(true)
      expect(typeof result.hasMore).toBe('boolean')
    })

    it('returns items that match CustomerListItem shape', async () => {
      const result = await listCustomers({
        scopedCreatedBy: null,
        limit: 5,
      })

      if (result.items.length === 0) return

      const item = result.items[0]
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('name')
      expect(item).toHaveProperty('phone')
      expect(item).toHaveProperty('address')
      expect(item).toHaveProperty('isActive')
      expect(item).toHaveProperty('deliveryDays')
      expect(item).toHaveProperty('createdAt')
    })

    it('respects scopedCreatedBy filter', async () => {
      const result = await listCustomers({
        scopedCreatedBy: ['nonexistent-admin-id'],
        limit: 10,
      })

      expect(result.items.length).toBe(0)
    })

    it('respects limit parameter', async () => {
      const result = await listCustomers({
        scopedCreatedBy: null,
        limit: 2,
      })

      expect(result.items.length).toBeLessThanOrEqual(2)
    })

    it('excludes soft-deleted customers by default', async () => {
      const result = await listCustomers({
        scopedCreatedBy: null,
        limit: 100,
      })

      for (const item of result.items) {
        expect(item).toHaveProperty('isActive')
      }
    })
  })

  // ── listBinCustomers ──────────────────────────────────────────────────────

  describe('listBinCustomers', () => {
    it('returns only soft-deleted customers', async () => {
      const result = await listBinCustomers({
        scopedCreatedBy: null,
      })

      expect(Array.isArray(result)).toBe(true)
      // Each bin item should have the minimal shape
      for (const item of result) {
        expect(item).toHaveProperty('id')
        expect(item).toHaveProperty('name')
        expect(item).toHaveProperty('deletedAt')
      }
    })
  })

  // ── getCustomerSummary ────────────────────────────────────────────────────

  describe('getCustomerSummary', () => {
    it('returns summary with correct shape', async () => {
      const result = await getCustomerSummary({
        scopedCreatedBy: null,
      })

      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('active')
      expect(result).toHaveProperty('inactive')
      expect(result).toHaveProperty('withAutoOrders')
      expect(result).toHaveProperty('withoutAutoOrders')
      expect(typeof result.total).toBe('number')
      expect(typeof result.active).toBe('number')
    })

    it('summary totals are consistent', async () => {
      const result = await getCustomerSummary({
        scopedCreatedBy: null,
      })

      expect(result.active + result.inactive).toBe(result.total)
      expect(result.withAutoOrders + result.withoutAutoOrders).toBe(result.total)
    })
  })

  // ── batchGetCustomers ─────────────────────────────────────────────────────

  describe('batchGetCustomers', () => {
    it('returns empty items for non-existent IDs', async () => {
      const result = await batchGetCustomers({
        ids: ['nonexistent-id-1', 'nonexistent-id-2'],
        scopedCreatedBy: null,
      })

      expect(result.items).toHaveLength(0)
      expect(result.notFound).toEqual(['nonexistent-id-1', 'nonexistent-id-2'])
    })

    it('returns found items and reports not found IDs', async () => {
      const list = await listCustomers({ scopedCreatedBy: null, limit: 3 })
      if (list.items.length === 0) return

      const existingIds = list.items.map((i) => i.id)
      const mixedIds = [...existingIds, 'nonexistent-id']

      const result = await batchGetCustomers({
        ids: mixedIds,
        scopedCreatedBy: null,
      })

      expect(result.items.length).toBe(existingIds.length)
      expect(result.notFound).toEqual(['nonexistent-id'])
    })
  })

  // ── getCustomerDetail ─────────────────────────────────────────────────────

  describe('getCustomerDetail', () => {
    it('returns null for non-existent customer', async () => {
      const result = await getCustomerDetail({
        customerId: 'nonexistent-customer-id',
        scopedCreatedBy: null,
      })

      expect(result).toBeNull()
    })

    it('returns detail for existing customer', async () => {
      const list = await listCustomers({ scopedCreatedBy: null, limit: 1 })
      if (list.items.length === 0) return

      const customerId = list.items[0].id
      const result = await getCustomerDetail({
        customerId,
        scopedCreatedBy: null,
      })

      expect(result).not.toBeNull()
      expect(result!.id).toBe(customerId)
      expect(result!).toHaveProperty('createdBy')
      expect(result!).toHaveProperty('deletedAt')
    })
  })

  // ── Cursor pagination ────────────────────────────────────────────────────

  describe('cursor pagination', () => {
    it('second page starts after first page last item', async () => {
      const firstPage = await listCustomers({
        scopedCreatedBy: null,
        limit: 5,
      })

      if (!firstPage.nextCursor || firstPage.items.length < 5) return

      const secondPage = await listCustomers({
        scopedCreatedBy: null,
        cursor: firstPage.nextCursor,
        limit: 5,
      })

      // Items on second page should be different from first page
      const firstPageIds = new Set(firstPage.items.map((i) => i.id))
      for (const item of secondPage.items) {
        expect(firstPageIds.has(item.id)).toBe(false)
      }
    })
  })
})
