/**
 * Order Repository — Integration Tests
 *
 * These tests verify that the order repository functions correctly
 * interact with the database. They are skipped when no database
 * is available (DATABASE_URL not set).
 *
 * Run with: DATABASE_URL="file:./test.db" npx vitest run
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { testDb } from '@/tests/helpers/test-db'
import { listOrders, batchGetOrders, getOrderDetail } from './order.repository'
import type { PaginatedResult } from '@/modules/shared/validation'
import type { OrderListItem } from '../contracts'

// Skip all integration tests when no test database is available
// Only run when RUN_INTEGRATION_TESTS=1 is set (requires a running database)
const describeIntegration = process.env.RUN_INTEGRATION_TESTS === '1' ? describe : describe.skip

describeIntegration('OrderRepository (integration)', () => {
  // ── listOrders ────────────────────────────────────────────────────────────

  describe('listOrders', () => {
    it('returns PaginatedResult with correct shape', async () => {
      const result = await listOrders({
        scopedAdminIds: null,
        limit: 5,
      })

      expect(result).toHaveProperty('items')
      expect(result).toHaveProperty('nextCursor')
      expect(result).toHaveProperty('hasMore')
      expect(Array.isArray(result.items)).toBe(true)
      expect(typeof result.hasMore).toBe('boolean')
    })

    it('returns items that match OrderListItem shape', async () => {
      const result = await listOrders({
        scopedAdminIds: null,
        limit: 5,
      })

      if (result.items.length === 0) return // no data in DB

      const item = result.items[0]
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('orderNumber')
      expect(item).toHaveProperty('orderStatus')
      expect(item).toHaveProperty('customerId')
      expect(item).toHaveProperty('deliveryDate')
      expect(item).toHaveProperty('paymentStatus')
      expect(item).toHaveProperty('createdAt')
    })

    it('respects scopedAdminIds filter', async () => {
      // With a non-existent admin ID, should return no orders
      const result = await listOrders({
        scopedAdminIds: ['nonexistent-admin-id'],
        limit: 10,
      })

      expect(result.items.length).toBe(0)
    })

    it('respects limit parameter', async () => {
      const result = await listOrders({
        scopedAdminIds: null,
        limit: 2,
      })

      expect(result.items.length).toBeLessThanOrEqual(2)
    })

    it('excludes deleted orders by default', async () => {
      const result = await listOrders({
        scopedAdminIds: null,
        limit: 100,
      })

      // All items should have null deletedAt
      for (const item of result.items) {
        expect(item.deletedAt).toBeNull()
      }
    })

    it('includes deleted orders when includeDeleted is true', async () => {
      const result = await listOrders({
        scopedAdminIds: null,
        includeDeleted: true,
        limit: 100,
      })

      // Result may include items with deletedAt
      expect(Array.isArray(result.items)).toBe(true)
    })
  })

  // ── batchGetOrders ────────────────────────────────────────────────────────

  describe('batchGetOrders', () => {
    it('returns empty items for non-existent IDs', async () => {
      const result = await batchGetOrders({
        ids: ['nonexistent-id-1', 'nonexistent-id-2'],
        scopedAdminIds: null,
      })

      expect(result.items).toHaveLength(0)
      expect(result.notFound).toEqual(['nonexistent-id-1', 'nonexistent-id-2'])
    })

    it('returns found items and reports not found IDs', async () => {
      // First get some order IDs from the DB
      const list = await listOrders({ scopedAdminIds: null, limit: 3 })
      if (list.items.length === 0) return

      const existingIds = list.items.map((i) => i.id)
      const mixedIds = [...existingIds, 'nonexistent-id']

      const result = await batchGetOrders({
        ids: mixedIds,
        scopedAdminIds: null,
      })

      expect(result.items.length).toBe(existingIds.length)
      expect(result.notFound).toEqual(['nonexistent-id'])
    })
  })

  // ── getOrderDetail ────────────────────────────────────────────────────────

  describe('getOrderDetail', () => {
    it('returns null for non-existent order', async () => {
      const result = await getOrderDetail({
        orderId: 'nonexistent-order-id',
        scopedAdminIds: null,
      })

      expect(result).toBeNull()
    })

    it('returns detail for existing order', async () => {
      const list = await listOrders({ scopedAdminIds: null, limit: 1 })
      if (list.items.length === 0) return

      const orderId = list.items[0].id
      const result = await getOrderDetail({
        orderId,
        scopedAdminIds: null,
      })

      expect(result).not.toBeNull()
      expect(result!.id).toBe(orderId)
      expect(result!).toHaveProperty('adminId')
      expect(result!).toHaveProperty('updatedAt')
    })
  })
})
