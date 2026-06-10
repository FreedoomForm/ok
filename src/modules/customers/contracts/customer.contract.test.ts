/**
 * Customers module — Contract tests
 *
 * These tests verify the Zod schemas match the DTO interfaces defined
 * in `customer.dto.ts` and that the API response shapes are correct.
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  successResponseSchema,
  errorResponseSchema,
  batchGetResponseSchema,
  ErrorCodes,
} from '@/tests/helpers/contract-test-helpers'

// ── Customer Zod schemas (mirrors customer.dto.ts) ──────────────────────────

const planTypeEnum = z.enum(['CLASSIC', 'INDIVIDUAL', 'DIABETIC'])

const deliveryDaysSchema = z.object({
  monday: z.boolean(),
  tuesday: z.boolean(),
  wednesday: z.boolean(),
  thursday: z.boolean(),
  friday: z.boolean(),
  saturday: z.boolean(),
  sunday: z.boolean(),
})

const customerListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  nickName: z.string().nullable(),
  phone: z.string(),
  address: z.string(),
  calories: z.number(),
  planType: planTypeEnum,
  dailyPrice: z.number(),
  balance: z.number(),
  notes: z.string(),
  specialFeatures: z.string(),
  deliveryDays: deliveryDaysSchema,
  autoOrdersEnabled: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.string(),
  defaultCourierId: z.string().nullable(),
  defaultCourierName: z.string().nullable(),
  assignedSetId: z.string().nullable(),
  assignedSetName: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
})

const customerDetailSchema = customerListItemSchema.extend({
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  deletedBy: z.string().nullable(),
  createdBy: z.string().nullable(),
})

// ── Endpoint response schemas ───────────────────────────────────────────────

const customerListResponseSchema = successResponseSchema.extend({
  data: z.object({
    customers: z.array(customerListItemSchema),
    nextCursor: z.string().nullable().optional(),
    hasMore: z.boolean().optional(),
  }),
})

const customerDetailResponseSchema = successResponseSchema.extend({
  data: customerDetailSchema,
})

const customerBatchGetResponseSchema = batchGetResponseSchema(customerListItemSchema)

// ── Sample data ─────────────────────────────────────────────────────────────

const sampleDeliveryDays = {
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
  sunday: false,
}

const sampleCustomerListItem = {
  id: 'cust-1',
  name: 'Jane Smith',
  nickName: null,
  phone: '+1234567890',
  address: '456 Oak Ave',
  calories: 1200,
  planType: 'CLASSIC' as const,
  dailyPrice: 500,
  balance: 1000,
  notes: '',
  specialFeatures: '',
  deliveryDays: sampleDeliveryDays,
  autoOrdersEnabled: true,
  isActive: true,
  createdAt: '2024-01-15T10:00:00.000Z',
  defaultCourierId: null,
  defaultCourierName: null,
  assignedSetId: null,
  assignedSetName: null,
  latitude: null,
  longitude: null,
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Customers contract — CustomerListItem schema', () => {
  it('validates a well-formed CustomerListItem', () => {
    const result = customerListItemSchema.safeParse(sampleCustomerListItem)
    expect(result.success).toBe(true)
  })

  it('rejects missing required fields', () => {
    const { id, ...missingId } = sampleCustomerListItem
    const result = customerListItemSchema.safeParse(missingId)
    expect(result.success).toBe(false)
  })

  it('rejects invalid planType', () => {
    const result = customerListItemSchema.safeParse({
      ...sampleCustomerListItem,
      planType: 'INVALID',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid plan types', () => {
    const planTypes = ['CLASSIC', 'INDIVIDUAL', 'DIABETIC'] as const
    for (const planType of planTypes) {
      const result = customerListItemSchema.safeParse({ ...sampleCustomerListItem, planType })
      expect(result.success).toBe(true)
    }
  })
})

describe('Customers contract — CustomerDetail schema', () => {
  it('extends CustomerListItem with detail fields', () => {
    const detail = {
      ...sampleCustomerListItem,
      updatedAt: '2024-01-15T12:00:00.000Z',
      deletedAt: null,
      deletedBy: null,
      createdBy: null,
    }
    const result = customerDetailSchema.safeParse(detail)
    expect(result.success).toBe(true)
  })
})

describe('Customers contract — list response shape', () => {
  it('validates success response with customers list', () => {
    const response = {
      data: {
        customers: [sampleCustomerListItem],
        nextCursor: null,
        hasMore: false,
      },
      meta: { requestId: 'req-123' },
    }
    const result = customerListResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Customers contract — detail response shape', () => {
  it('validates success response with customer detail', () => {
    const response = {
      data: {
        ...sampleCustomerListItem,
        updatedAt: '2024-01-15T12:00:00.000Z',
        deletedAt: null,
        deletedBy: null,
        createdBy: null,
      },
      meta: { requestId: 'req-456' },
    }
    const result = customerDetailResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Customers contract — batch-get response shape', () => {
  it('validates batch-get with items and notFound', () => {
    const response = {
      data: {
        items: [sampleCustomerListItem],
        notFound: ['missing-id'],
      },
      meta: { requestId: 'req-batch' },
    }
    const result = customerBatchGetResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })

  it('validates batch-get with empty items', () => {
    const response = {
      data: {
        items: [],
        notFound: ['id1', 'id2'],
      },
      meta: { requestId: 'req-batch2' },
    }
    const result = customerBatchGetResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Customers contract — error response shapes', () => {
  it('validates UNAUTHORIZED error (401)', () => {
    const response = {
      error: { code: ErrorCodes.UNAUTHORIZED, message: 'Unauthorized' },
      meta: { requestId: 'req-123' },
    }
    const result = errorResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })

  it('validates NOT_FOUND error (404)', () => {
    const response = {
      error: { code: ErrorCodes.NOT_FOUND, message: 'Customer not found: cust-999' },
      meta: { requestId: 'req-456' },
    }
    const result = errorResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })

  it('validates VALIDATION_FAILED error (422)', () => {
    const response = {
      error: { code: ErrorCodes.VALIDATION_FAILED, message: 'Validation failed' },
      meta: { requestId: 'req-789' },
    }
    const result = errorResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})
