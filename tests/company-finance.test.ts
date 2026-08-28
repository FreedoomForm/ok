import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCompanyHistoryWhere, companyHistoryQuerySchema } from '../src/lib/admin/company-finance'

test('accepts bounded company history query parameters', () => {
  assert.deepEqual(companyHistoryQuerySchema.parse({ limit: '100', type: 'company', category: 'MANUAL_ADJUSTMENT', search: ' flour ' }), {
    limit: 100,
    type: 'company',
    category: 'MANUAL_ADJUSTMENT',
    search: 'flour',
  })
  assert.deepEqual(buildCompanyHistoryWhere('admin-1', 'client', 'SALARY'), {
    adminId: 'admin-1',
    deletedAt: null,
    customerId: { not: null },
    category: 'SALARY',
  })
  assert.deepEqual(buildCompanyHistoryWhere('admin-1', 'all', undefined, undefined, true), {
    adminId: 'admin-1',
    deletedAt: { not: null },
  })
  assert.deepEqual(buildCompanyHistoryWhere('admin-1', 'all', undefined, 'flour'), {
    adminId: 'admin-1',
    deletedAt: null,
    OR: [{ description: { contains: 'flour', mode: 'insensitive' } }, { category: { contains: 'flour', mode: 'insensitive' } }],
  })
})

test('rejects unsafe company history queries and builds company scope', () => {
  assert.equal(companyHistoryQuerySchema.safeParse({ limit: 0 }).success, false)
  assert.equal(companyHistoryQuerySchema.safeParse({ limit: 501 }).success, false)
  assert.equal(companyHistoryQuerySchema.safeParse({ type: 'unknown' }).success, false)
  assert.equal(companyHistoryQuerySchema.safeParse({ category: 'x'.repeat(65) }).success, false)
  assert.deepEqual(buildCompanyHistoryWhere('admin-1', 'company'), {
    adminId: 'admin-1',
    deletedAt: null,
    customerId: null,
  })
})
