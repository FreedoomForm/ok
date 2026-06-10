/**
 * Admins module — Contract tests
 *
 * These tests verify the Zod schemas match the DTO interfaces defined
 * in `admins.dto.ts` and that the API response shapes are correct.
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  successResponseSchema,
  errorResponseSchema,
  batchGetResponseSchema,
  ErrorCodes,
} from '@/tests/helpers/contract-test-helpers'

// ── Admin Zod schemas (mirrors admins.dto.ts) ───────────────────────────────

const adminRoleEnum = z.enum(['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN', 'COURIER', 'WORKER'])

const adminDTOSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: adminRoleEnum,
  isActive: z.boolean(),
  createdBy: z.string().nullable(),
  allowedTabs: z.array(z.string()).nullable(),
})

const adminListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: adminRoleEnum,
  isActive: z.boolean(),
  createdBy: z.string().nullable(),
  allowedTabs: z.array(z.string()).nullable(),
  createdAt: z.string(),
  salary: z.number(),
  creatorName: z.string().nullable(),
})

const adminDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: adminRoleEnum,
  isActive: z.boolean(),
  createdBy: z.string().nullable(),
  allowedTabs: z.array(z.string()).nullable(),
  createdAt: z.string(),
  salary: z.number(),
  hasPassword: z.boolean(),
})

const toggleStatusResultSchema = z.object({
  id: z.string(),
  isActive: z.boolean(),
  name: z.string(),
  role: adminRoleEnum,
})

const deleteAdminResultSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
})

const resetPasswordResultSchema = z.object({
  password: z.string(),
})

// ── Endpoint response schemas ───────────────────────────────────────────────

const adminListResponseSchema = successResponseSchema.extend({
  data: z.array(adminListItemSchema),
})

const adminDetailResponseSchema = successResponseSchema.extend({
  data: adminDetailSchema,
})

const adminCreateResponseSchema = successResponseSchema.extend({
  data: adminDTOSchema,
})

const adminUpdateResponseSchema = successResponseSchema.extend({
  data: adminDTOSchema,
})

const toggleStatusResponseSchema = successResponseSchema.extend({
  data: toggleStatusResultSchema,
})

const batchGetAdminsResponseSchema = batchGetResponseSchema(adminListItemSchema)

// ── Sample data ─────────────────────────────────────────────────────────────

const sampleAdminDTO = {
  id: 'admin-1',
  name: 'Super Admin',
  email: 'admin@example.com',
  role: 'SUPER_ADMIN' as const,
  isActive: true,
  createdBy: null,
  allowedTabs: null,
}

const sampleAdminListItem = {
  id: 'admin-1',
  name: 'Super Admin',
  email: 'admin@example.com',
  role: 'SUPER_ADMIN' as const,
  isActive: true,
  createdBy: null,
  allowedTabs: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  salary: 0,
  creatorName: null,
}

const sampleAdminDetail = {
  id: 'admin-1',
  name: 'Super Admin',
  email: 'admin@example.com',
  role: 'SUPER_ADMIN' as const,
  isActive: true,
  createdBy: null,
  allowedTabs: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  salary: 0,
  hasPassword: true,
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Admins contract — AdminDTO schema', () => {
  it('validates a well-formed AdminDTO', () => {
    const result = adminDTOSchema.safeParse(sampleAdminDTO)
    expect(result.success).toBe(true)
  })

  it('rejects invalid role', () => {
    const result = adminDTOSchema.safeParse({ ...sampleAdminDTO, role: 'INVALID' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid admin roles', () => {
    const roles = ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN', 'COURIER', 'WORKER'] as const
    for (const role of roles) {
      const result = adminDTOSchema.safeParse({ ...sampleAdminDTO, role })
      expect(result.success).toBe(true)
    }
  })
})

describe('Admins contract — AdminListItem schema', () => {
  it('validates a well-formed AdminListItem', () => {
    const result = adminListItemSchema.safeParse(sampleAdminListItem)
    expect(result.success).toBe(true)
  })
})

describe('Admins contract — AdminDetail schema', () => {
  it('validates a well-formed AdminDetail', () => {
    const result = adminDetailSchema.safeParse(sampleAdminDetail)
    expect(result.success).toBe(true)
  })

  it('requires hasPassword field', () => {
    const { hasPassword, ...missingField } = sampleAdminDetail
    const result = adminDetailSchema.safeParse(missingField)
    expect(result.success).toBe(false)
  })
})

describe('Admins contract — list response', () => {
  it('validates admin list response shape', () => {
    const response = {
      data: [sampleAdminListItem],
      meta: { requestId: 'req-list' },
    }
    const result = adminListResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Admins contract — detail response', () => {
  it('validates admin detail response shape', () => {
    const response = {
      data: sampleAdminDetail,
      meta: { requestId: 'req-detail' },
    }
    const result = adminDetailResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Admins contract — create response', () => {
  it('validates admin create response shape', () => {
    const response = {
      data: sampleAdminDTO,
      meta: { requestId: 'req-create' },
    }
    const result = adminCreateResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Admins contract — update response', () => {
  it('validates admin update response shape', () => {
    const response = {
      data: sampleAdminDTO,
      meta: { requestId: 'req-update' },
    }
    const result = adminUpdateResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Admins contract — toggle status response', () => {
  it('validates toggle status result', () => {
    const response = {
      data: { id: 'admin-1', isActive: false, name: 'Admin User', role: 'LOW_ADMIN' },
      meta: { requestId: 'req-toggle' },
    }
    const result = toggleStatusResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Admins contract — batch-get response', () => {
  it('validates batch-get with items and notFound', () => {
    const response = {
      data: {
        items: [sampleAdminListItem],
        notFound: ['missing-id'],
      },
      meta: { requestId: 'req-batch' },
    }
    const result = batchGetAdminsResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Admins contract — error responses', () => {
  it('validates UNAUTHORIZED error', () => {
    const response = {
      error: { code: ErrorCodes.UNAUTHORIZED, message: 'Unauthorized' },
      meta: { requestId: 'req-err' },
    }
    const result = errorResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })

  it('validates FORBIDDEN error', () => {
    const response = {
      error: { code: ErrorCodes.FORBIDDEN, message: 'Insufficient permissions' },
      meta: { requestId: 'req-403' },
    }
    const result = errorResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })

  it('validates NOT_FOUND error', () => {
    const response = {
      error: { code: ErrorCodes.NOT_FOUND, message: 'Admin not found' },
      meta: { requestId: 'req-404' },
    }
    const result = errorResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })

  it('validates CONFLICT error (duplicate email)', () => {
    const response = {
      error: { code: ErrorCodes.CONFLICT, message: 'Email already exists' },
      meta: { requestId: 'req-409' },
    }
    const result = errorResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })

  it('validates VALIDATION_FAILED error', () => {
    const response = {
      error: { code: ErrorCodes.VALIDATION_FAILED, message: 'Validation failed' },
      meta: { requestId: 'req-422' },
    }
    const result = errorResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})
