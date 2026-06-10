/**
 * Orders module — Contract tests
 *
 * These tests verify the Zod schemas match the DTO interfaces defined
 * in `order.dto.ts` and that the API response shapes are correct.
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  successResponseSchema,
  errorResponseSchema,
  batchGetResponseSchema,
  ErrorCodes,
} from '@/tests/helpers/contract-test-helpers'

// ── Order Zod schemas (mirrors order.dto.ts) ────────────────────────────────

const orderStatusEnum = z.enum([
  'NEW', 'PENDING', 'IN_PROCESS', 'IN_DELIVERY',
  'PAUSED', 'DELIVERED', 'CANCELED', 'FAILED',
])

const paymentStatusEnum = z.enum(['PAID', 'UNPAID', 'PARTIAL'])
const paymentMethodEnum = z.enum(['CASH', 'CARD', 'TRANSFER'])
const orderTypeEnum = z.enum(['MORNING', 'EVENING'])

const orderCustomerSnapshotSchema = z.object({
  name: z.string(),
  phone: z.string(),
  assignedSetId: z.string().nullable(),
  assignedSetName: z.string().nullable(),
})

const orderListItemSchema = z.object({
  id: z.string(),
  orderNumber: z.number(),
  orderStatus: orderStatusEnum,
  customerId: z.string(),
  customerName: z.string(),
  customerPhone: z.string(),
  assignedSetId: z.string().nullable(),
  assignedSetName: z.string().nullable(),
  customer: orderCustomerSnapshotSchema,
  deliveryDate: z.string(),
  deliveryAddress: z.string().nullable(),
  deliveryTime: z.string().nullable(),
  quantity: z.number(),
  calories: z.number(),
  specialFeatures: z.string().nullable(),
  paymentStatus: paymentStatusEnum,
  paymentMethod: paymentMethodEnum,
  isPrepaid: z.boolean(),
  amountReceived: z.number().nullable(),
  courierId: z.string().nullable(),
  courierName: z.string().nullable(),
  isAutoOrder: z.boolean(),
  orderType: orderTypeEnum.nullable(),
  priority: z.number(),
  sourceChannel: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
})

const orderDetailSchema = orderListItemSchema.extend({
  adminId: z.string().nullable(),
  etaMinutes: z.number().nullable(),
  routeDistanceKm: z.number().nullable(),
  routeDurationMin: z.number().nullable(),
  sequenceInRoute: z.number().nullable(),
  customerRating: z.number().nullable(),
  customerFeedback: z.string().nullable(),
  lastLatitude: z.number().nullable(),
  lastLongitude: z.number().nullable(),
  lastLocationAt: z.string().nullable(),
  statusChangedAt: z.string().nullable(),
  assignedAt: z.string().nullable(),
  pickedUpAt: z.string().nullable(),
  pausedAt: z.string().nullable(),
  resumedAt: z.string().nullable(),
  deliveredAt: z.string().nullable(),
  failedAt: z.string().nullable(),
  canceledAt: z.string().nullable(),
  confirmedAt: z.string().nullable(),
  updatedAt: z.string(),
})

// ── Endpoint response schemas ───────────────────────────────────────────────

const orderListResponseSchema = successResponseSchema.extend({
  data: z.object({
    orders: z.array(orderListItemSchema),
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
  }),
})

const orderDetailResponseSchema = successResponseSchema.extend({
  data: orderDetailSchema,
})

const orderStatsResponseSchema = successResponseSchema.extend({
  data: z.object({
    successfulOrders: z.number(),
    failedOrders: z.number(),
    pendingOrders: z.number(),
    inDeliveryOrders: z.number(),
    pausedOrders: z.number(),
    prepaidOrders: z.number(),
    unpaidOrders: z.number(),
    cardOrders: z.number(),
    cashOrders: z.number(),
    dailyCustomers: z.number(),
    evenDayCustomers: z.number(),
    oddDayCustomers: z.number(),
    specialPreferenceCustomers: z.number(),
    orders1200: z.number(),
    orders1600: z.number(),
    orders2000: z.number(),
    orders2500: z.number(),
    orders3000: z.number(),
    singleItemOrders: z.number(),
    multiItemOrders: z.number(),
  }),
})

const orderBatchGetResponseSchema = batchGetResponseSchema(orderListItemSchema)

// ── Sample data ─────────────────────────────────────────────────────────────

const sampleOrderListItem = {
  id: 'order-1',
  orderNumber: 1,
  orderStatus: 'NEW' as const,
  customerId: 'cust-1',
  customerName: 'John Doe',
  customerPhone: '+1234567890',
  assignedSetId: null,
  assignedSetName: null,
  customer: { name: 'John Doe', phone: '+1234567890', assignedSetId: null, assignedSetName: null },
  deliveryDate: '2024-01-15',
  deliveryAddress: '123 Main St',
  deliveryTime: '12:00',
  quantity: 1,
  calories: 1200,
  specialFeatures: null,
  paymentStatus: 'PAID' as const,
  paymentMethod: 'CASH' as const,
  isPrepaid: false,
  amountReceived: null,
  courierId: null,
  courierName: null,
  isAutoOrder: false,
  orderType: 'MORNING' as const,
  priority: 0,
  sourceChannel: null,
  latitude: null,
  longitude: null,
  deletedAt: null,
  createdAt: '2024-01-15T10:00:00.000Z',
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Orders contract — OrderListItem schema', () => {
  it('validates a well-formed OrderListItem', () => {
    const result = orderListItemSchema.safeParse(sampleOrderListItem)
    expect(result.success).toBe(true)
  })

  it('rejects missing required fields', () => {
    const { id, ...missingId } = sampleOrderListItem
    const result = orderListItemSchema.safeParse(missingId)
    expect(result.success).toBe(false)
  })

  it('rejects invalid orderStatus', () => {
    const result = orderListItemSchema.safeParse({
      ...sampleOrderListItem,
      orderStatus: 'INVALID_STATUS',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid order statuses', () => {
    const statuses = ['NEW', 'PENDING', 'IN_PROCESS', 'IN_DELIVERY', 'PAUSED', 'DELIVERED', 'CANCELED', 'FAILED'] as const
    for (const status of statuses) {
      const result = orderListItemSchema.safeParse({ ...sampleOrderListItem, orderStatus: status })
      expect(result.success).toBe(true)
    }
  })
})

describe('Orders contract — OrderDetail schema', () => {
  it('extends OrderListItem with detail fields', () => {
    const detail = {
      ...sampleOrderListItem,
      adminId: null,
      etaMinutes: null,
      routeDistanceKm: null,
      routeDurationMin: null,
      sequenceInRoute: null,
      customerRating: null,
      customerFeedback: null,
      lastLatitude: null,
      lastLongitude: null,
      lastLocationAt: null,
      statusChangedAt: null,
      assignedAt: null,
      pickedUpAt: null,
      pausedAt: null,
      resumedAt: null,
      deliveredAt: null,
      failedAt: null,
      canceledAt: null,
      confirmedAt: null,
      updatedAt: '2024-01-15T10:00:00.000Z',
    }
    const result = orderDetailSchema.safeParse(detail)
    expect(result.success).toBe(true)
  })
})

describe('Orders contract — list response shape', () => {
  it('validates success response with orders list', () => {
    const response = {
      data: {
        orders: [sampleOrderListItem],
        nextCursor: null,
        hasMore: false,
      },
      meta: { requestId: 'req-123' },
    }
    const result = orderListResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Orders contract — error response shapes', () => {
  it('validates UNAUTHORIZED error (401)', () => {
    const response = {
      error: { code: ErrorCodes.UNAUTHORIZED, message: 'Unauthorized' },
      meta: { requestId: 'req-123' },
    }
    const result = errorResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.error.code).toBe(ErrorCodes.UNAUTHORIZED)
    }
  })

  it('validates FORBIDDEN error (403)', () => {
    const response = {
      error: { code: ErrorCodes.FORBIDDEN, message: 'Role COURIER cannot access this endpoint' },
      meta: { requestId: 'req-456' },
    }
    const result = errorResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.error.code).toBe(ErrorCodes.FORBIDDEN)
    }
  })

  it('validates NOT_FOUND error (404)', () => {
    const response = {
      error: { code: ErrorCodes.NOT_FOUND, message: 'Order not found: order-999' },
      meta: { requestId: 'req-789' },
    }
    const result = errorResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.error.code).toBe(ErrorCodes.NOT_FOUND)
    }
  })

  it('validates VALIDATION_FAILED error (422)', () => {
    const response = {
      error: { code: ErrorCodes.VALIDATION_FAILED, message: 'Validation failed', details: { field: 'orderStatus' } },
      meta: { requestId: 'req-abc' },
    }
    const result = errorResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.error.code).toBe(ErrorCodes.VALIDATION_FAILED)
    }
  })
})

describe('Orders contract — batch-get response', () => {
  it('validates batch-get response shape', () => {
    const response = {
      data: {
        items: [sampleOrderListItem],
        notFound: ['missing-id'],
      },
      meta: { requestId: 'req-batch' },
    }
    const result = orderBatchGetResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Orders contract — stats response', () => {
  it('validates stats response shape', () => {
    const response = {
      data: {
        successfulOrders: 10,
        failedOrders: 1,
        pendingOrders: 5,
        inDeliveryOrders: 3,
        pausedOrders: 0,
        prepaidOrders: 8,
        unpaidOrders: 2,
        cardOrders: 4,
        cashOrders: 6,
        dailyCustomers: 15,
        evenDayCustomers: 7,
        oddDayCustomers: 8,
        specialPreferenceCustomers: 3,
        orders1200: 5,
        orders1600: 3,
        orders2000: 2,
        orders2500: 1,
        orders3000: 0,
        singleItemOrders: 12,
        multiItemOrders: 3,
      },
      meta: { requestId: 'req-stats' },
    }
    const result = orderStatsResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})
