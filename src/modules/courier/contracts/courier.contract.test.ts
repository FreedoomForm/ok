/**
 * Courier module — Contract tests
 *
 * These tests verify the Zod schemas match the DTO interfaces defined
 * in `courier.dto.ts` and that the API response shapes are correct.
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  successResponseSchema,
  errorResponseSchema,
  ErrorCodes,
} from '@/tests/helpers/contract-test-helpers'

// ── Courier Zod schemas (mirrors courier.dto.ts) ────────────────────────────

const courierProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  phone: z.string().nullable(),
  salary: z.number(),
  salaryPerDay: z.number(),
  salaryAccrued: z.number(),
  salaryPaid: z.number(),
  balance: z.number(),
  createdAt: z.string(),
})

const courierOrderCustomerSchema = z.object({
  name: z.string(),
  phone: z.string(),
  address: z.string().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
})

const courierOrderSchema = z.object({
  id: z.string(),
  orderNumber: z.number(),
  orderStatus: z.string(),
  customerId: z.string(),
  deliveryAddress: z.string(),
  deliveryTime: z.string().nullable(),
  deliveryDate: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  quantity: z.number(),
  calories: z.number(),
  specialFeatures: z.string().nullable(),
  notes: z.string().nullable(),
  paymentStatus: z.string(),
  paymentMethod: z.string(),
  isPrepaid: z.boolean(),
  courierId: z.string().nullable(),
  customer: courierOrderCustomerSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

const courierStatsSchema = z.object({
  totalDelivered: z.number(),
  todayDelivered: z.number(),
})

const withdrawResultSchema = z.object({
  success: z.boolean(),
  transactionId: z.string(),
  withdrawn: z.number(),
  balance: z.number(),
})

const completeOrderResultSchema = z.object({
  id: z.string(),
  orderStatus: z.string(),
  deliveredAt: z.string().nullable(),
})

// ── Endpoint response schemas ───────────────────────────────────────────────

const courierProfileResponseSchema = successResponseSchema.extend({
  data: courierProfileSchema,
})

const courierOrdersResponseSchema = successResponseSchema.extend({
  data: z.array(courierOrderSchema),
})

const courierStatsResponseSchema = successResponseSchema.extend({
  data: courierStatsSchema,
})

const courierRouteResponseSchema = successResponseSchema.extend({
  data: z.array(courierOrderSchema),
})

const withdrawResponseSchema = successResponseSchema.extend({
  data: withdrawResultSchema,
})

const completeOrderResponseSchema = successResponseSchema.extend({
  data: completeOrderResultSchema,
})

// ── Sample data ─────────────────────────────────────────────────────────────

const sampleCourierProfile = {
  id: 'courier-1',
  name: 'Courier User',
  email: 'courier@example.com',
  role: 'COURIER',
  phone: '+1234567890',
  salary: 0,
  salaryPerDay: 100,
  salaryAccrued: 1500,
  salaryPaid: 500,
  balance: 1000,
  createdAt: '2024-01-01T00:00:00.000Z',
}

const sampleCourierOrder = {
  id: 'order-1',
  orderNumber: 1,
  orderStatus: 'IN_DELIVERY',
  customerId: 'cust-1',
  deliveryAddress: '123 Main St',
  deliveryTime: '12:00',
  deliveryDate: '2024-01-15',
  latitude: 41.3,
  longitude: 69.2,
  quantity: 1,
  calories: 1200,
  specialFeatures: null,
  notes: null,
  paymentStatus: 'PAID',
  paymentMethod: 'CASH',
  isPrepaid: false,
  courierId: 'courier-1',
  customer: { name: 'Jane Smith', phone: '+1234567890' },
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Courier contract — CourierProfile schema', () => {
  it('validates a well-formed CourierProfile', () => {
    const result = courierProfileSchema.safeParse(sampleCourierProfile)
    expect(result.success).toBe(true)
  })

  it('accepts null phone', () => {
    const result = courierProfileSchema.safeParse({ ...sampleCourierProfile, phone: null })
    expect(result.success).toBe(true)
  })
})

describe('Courier contract — CourierOrder schema', () => {
  it('validates a well-formed CourierOrder', () => {
    const result = courierOrderSchema.safeParse(sampleCourierOrder)
    expect(result.success).toBe(true)
  })
})

describe('Courier contract — profile response', () => {
  it('validates profile response shape', () => {
    const response = {
      data: sampleCourierProfile,
      meta: { requestId: 'req-profile' },
    }
    const result = courierProfileResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Courier contract — orders response', () => {
  it('validates orders list response', () => {
    const response = {
      data: [sampleCourierOrder],
      meta: { requestId: 'req-orders' },
    }
    const result = courierOrdersResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Courier contract — stats response', () => {
  it('validates stats response shape', () => {
    const response = {
      data: { totalDelivered: 42, todayDelivered: 5 },
      meta: { requestId: 'req-stats' },
    }
    const result = courierStatsResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Courier contract — route response', () => {
  it('validates route response as array of orders', () => {
    const response = {
      data: [sampleCourierOrder],
      meta: { requestId: 'req-route' },
    }
    const result = courierRouteResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Courier contract — withdraw response', () => {
  it('validates withdraw result', () => {
    const response = {
      data: { success: true, transactionId: 'txn-1', withdrawn: 500, balance: 500 },
      meta: { requestId: 'req-withdraw' },
    }
    const result = withdrawResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Courier contract — complete order response', () => {
  it('validates complete order result', () => {
    const response = {
      data: { id: 'order-1', orderStatus: 'DELIVERED', deliveredAt: '2024-01-15T12:00:00.000Z' },
      meta: { requestId: 'req-complete' },
    }
    const result = completeOrderResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Courier contract — error responses', () => {
  it('validates UNAUTHORIZED error', () => {
    const response = {
      error: { code: ErrorCodes.UNAUTHORIZED, message: 'Unauthorized' },
      meta: { requestId: 'req-err' },
    }
    const result = errorResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })

  it('validates NOT_FOUND error for order', () => {
    const response = {
      error: { code: ErrorCodes.NOT_FOUND, message: 'Order not found' },
      meta: { requestId: 'req-404' },
    }
    const result = errorResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })

  it('validates VALIDATION_FAILED error', () => {
    const response = {
      error: { code: ErrorCodes.VALIDATION_FAILED, message: 'Invalid amount' },
      meta: { requestId: 'req-val' },
    }
    const result = errorResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})
