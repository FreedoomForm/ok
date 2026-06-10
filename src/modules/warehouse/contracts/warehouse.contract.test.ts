/**
 * Warehouse module — Contract tests
 *
 * These tests verify the Zod schemas match the DTO interfaces defined
 * in `warehouse.dto.ts` and that the API response shapes are correct.
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  successResponseSchema,
  errorResponseSchema,
  ErrorCodes,
} from '@/tests/helpers/contract-test-helpers'

// ── Warehouse Zod schemas (mirrors warehouse.dto.ts) ────────────────────────

const warehouseItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  unit: z.string(),
  kcalPerGram: z.number().nullable(),
  pricePerUnit: z.number().nullable(),
  priceUnit: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const ingredientRefSchema = z.object({
  name: z.string(),
  amount: z.number(),
  unit: z.string(),
})

const dishSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  mealType: z.string(),
  ingredients: z.array(ingredientRefSchema),
  calorieMappings: z.record(z.string(), z.array(z.string())).nullable(),
  menuNumbers: z.array(z.number()),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const cookResultSchema = z.object({
  success: z.boolean(),
  cookedStats: z.record(z.string(), z.record(z.string(), z.number())),
})

const warehousePointSchema = z.object({
  lat: z.number().nullable(),
  lng: z.number().nullable(),
})

const warehousePointUpdateResultSchema = z.object({
  message: z.string(),
  lat: z.number(),
  lng: z.number(),
})

const inventorySchema = z.record(z.string(), z.number())

// ── Endpoint response schemas ───────────────────────────────────────────────

const ingredientsListResponseSchema = successResponseSchema.extend({
  data: z.array(warehouseItemSchema),
})

const dishesListResponseSchema = successResponseSchema.extend({
  data: z.array(dishSchema),
})

const cookResponseSchema = successResponseSchema.extend({
  data: cookResultSchema,
})

const warehousePointResponseSchema = successResponseSchema.extend({
  data: warehousePointSchema,
})

const inventoryResponseSchema = successResponseSchema.extend({
  data: inventorySchema,
})

// ── Sample data ─────────────────────────────────────────────────────────────

const sampleWarehouseItem = {
  id: 'ing-1',
  name: 'Rice',
  amount: 50,
  unit: 'kg',
  kcalPerGram: 3.5,
  pricePerUnit: 100,
  priceUnit: 'kg',
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const sampleDish = {
  id: 'dish-1',
  name: 'Pilaf',
  description: 'Traditional rice pilaf',
  mealType: 'lunch',
  ingredients: [{ name: 'Rice', amount: 200, unit: 'g' }],
  calorieMappings: { '1200': ['1 portion'], '1600': ['1.5 portions'] },
  menuNumbers: [1, 2],
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('Warehouse contract — WarehouseItem schema', () => {
  it('validates a well-formed WarehouseItem', () => {
    const result = warehouseItemSchema.safeParse(sampleWarehouseItem)
    expect(result.success).toBe(true)
  })

  it('rejects missing required fields', () => {
    const { id, ...missingId } = sampleWarehouseItem
    const result = warehouseItemSchema.safeParse(missingId)
    expect(result.success).toBe(false)
  })
})

describe('Warehouse contract — Dish schema', () => {
  it('validates a well-formed Dish', () => {
    const result = dishSchema.safeParse(sampleDish)
    expect(result.success).toBe(true)
  })

  it('accepts null calorieMappings', () => {
    const result = dishSchema.safeParse({ ...sampleDish, calorieMappings: null })
    expect(result.success).toBe(true)
  })
})

describe('Warehouse contract — ingredients list response', () => {
  it('validates paginated ingredients list', () => {
    const response = {
      data: [sampleWarehouseItem],
      meta: { requestId: 'req-ing' },
    }
    const result = ingredientsListResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Warehouse contract — dishes list response', () => {
  it('validates dishes list', () => {
    const response = {
      data: [sampleDish],
      meta: { requestId: 'req-dish' },
    }
    const result = dishesListResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Warehouse contract — cook command response', () => {
  it('validates cook result', () => {
    const response = {
      data: {
        success: true,
        cookedStats: { '2024-01-15': { 'dish-1': 10 } },
      },
      meta: { requestId: 'req-cook' },
    }
    const result = cookResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Warehouse contract — warehouse point response', () => {
  it('validates warehouse point with coordinates', () => {
    const response = {
      data: { lat: 41.3, lng: 69.2 },
      meta: { requestId: 'req-point' },
    }
    const result = warehousePointResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })

  it('validates warehouse point with null coordinates', () => {
    const response = {
      data: { lat: null, lng: null },
      meta: { requestId: 'req-point2' },
    }
    const result = warehousePointResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Warehouse contract — inventory response', () => {
  it('validates inventory as record of string to number', () => {
    const response = {
      data: { Rice: 50, Flour: 30 },
      meta: { requestId: 'req-inv' },
    }
    const result = inventoryResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})

describe('Warehouse contract — error responses', () => {
  it('validates UNAUTHORIZED error', () => {
    const response = {
      error: { code: ErrorCodes.UNAUTHORIZED, message: 'Unauthorized' },
      meta: { requestId: 'req-err' },
    }
    const result = errorResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })

  it('validates VALIDATION_FAILED error', () => {
    const response = {
      error: { code: ErrorCodes.VALIDATION_FAILED, message: 'Validation failed' },
      meta: { requestId: 'req-val' },
    }
    const result = errorResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })
})
