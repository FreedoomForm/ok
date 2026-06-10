/**
 * Warehouse Repository — Data access layer for the Warehouse module.
 *
 * Encapsulates all Prisma queries for warehouse items, dishes,
 * cooking plans, and warehouse point (admin geolocation), providing:
 * - **Select presets** — Avoid SELECT * by defining exactly which fields
 *   each use-case needs.
 * - **Transformation** — Map raw Prisma rows to clean DTOs that match
 *   the contracts defined in `../contracts/`.
 */

import { db } from '@/modules/shared/db'
import { Prisma } from '@prisma/client'
import { encodeCursor, decodeCursor, type PaginatedResult } from '@/modules/shared/validation'
import type {
  WarehouseItemDTO,
  DishDTO,
  IngredientRef,
  CookingPlanDTO,
  CookingPlanRangeItem,
  CookingPlanRangeResult,
  WarehousePointDTO,
  CookResult,
  CookUpdateItem,
} from '../contracts'

// ── Prisma select presets ────────────────────────────────────────────────────

/** WarehouseItem select for ingredient list views. */
const WAREHOUSE_ITEM_SELECT = {
  id: true,
  name: true,
  amount: true,
  unit: true,
  kcalPerGram: true,
  pricePerUnit: true,
  priceUnit: true,
  createdAt: true,
  updatedAt: true,
} as const

/** Dish select for list views — includes related menus. */
const DISH_LIST_SELECT = {
  id: true,
  name: true,
  description: true,
  mealType: true,
  ingredients: true,
  calorieMappings: true,
  menus: { select: { number: true } },
  createdAt: true,
  updatedAt: true,
} as const

/** Admin select for warehouse point (geolocation). */
const ADMIN_WAREHOUSE_POINT_SELECT = {
  latitude: true,
  longitude: true,
} as const

// ── Type helpers ─────────────────────────────────────────────────────────────

type WarehouseItemRow = Prisma.WarehouseItemGetPayload<{ select: typeof WAREHOUSE_ITEM_SELECT }>
type DishListRow = Prisma.DishGetPayload<{ select: typeof DISH_LIST_SELECT }>

// ── Transformers ─────────────────────────────────────────────────────────────

function toWarehouseItemDTO(row: WarehouseItemRow): WarehouseItemDTO {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    unit: row.unit,
    kcalPerGram: row.kcalPerGram,
    pricePerUnit: row.pricePerUnit,
    priceUnit: row.priceUnit,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function toDishDTO(row: DishListRow): DishDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    mealType: row.mealType,
    ingredients: Array.isArray(row.ingredients) ? (row.ingredients as unknown as IngredientRef[]) : [],
    calorieMappings: row.calorieMappings as Record<string, string[]> | null,
    menuNumbers: row.menus.map((m) => m.number),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

// ── Query operations ─────────────────────────────────────────────────────────

/**
 * List all warehouse items (ingredients) ordered by name.
 * Supports cursor-based pagination with stable sort (name ASC, id ASC).
 */
export async function listIngredients(
  cursor?: string,
  limit: number = 25,
): Promise<PaginatedResult<WarehouseItemDTO>> {
  const where: Prisma.WarehouseItemWhereInput = {}

  // Apply cursor filter
  if (cursor) {
    const decoded = decodeCursor(cursor)
    if (decoded) {
      const cursorName = decoded.name as string
      const cursorId = decoded.id as string
      if (cursorName && cursorId) {
        where.OR = [
          { name: { gt: cursorName } },
          { name: { equals: cursorName }, id: { gt: cursorId } },
        ]
      }
    }
  }

  // Fetch limit + 1 to determine hasMore
  const rows = await db.warehouseItem.findMany({
    where,
    select: WAREHOUSE_ITEM_SELECT,
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    take: limit + 1,
  })

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows

  const lastRow = items[items.length - 1]
  const nextCursor = hasMore && lastRow
    ? encodeCursor({ name: lastRow.name, id: lastRow.id })
    : null

  return {
    items: items.map(toWarehouseItemDTO),
    nextCursor,
    hasMore,
  }
}

/**
 * List all dishes with their related menu numbers.
 * Supports cursor-based pagination with stable sort (name ASC, id ASC).
 */
export async function listDishes(
  cursor?: string,
  limit: number = 25,
): Promise<PaginatedResult<DishDTO>> {
  const where: Prisma.DishWhereInput = {}

  // Apply cursor filter
  if (cursor) {
    const decoded = decodeCursor(cursor)
    if (decoded) {
      const cursorName = decoded.name as string
      const cursorId = decoded.id as string
      if (cursorName && cursorId) {
        where.OR = [
          { name: { gt: cursorName } },
          { name: { equals: cursorName }, id: { gt: cursorId } },
        ]
      }
    }
  }

  // Fetch limit + 1 to determine hasMore
  const rows = await db.dish.findMany({
    where,
    select: DISH_LIST_SELECT,
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    take: limit + 1,
  })

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows

  const lastRow = items[items.length - 1]
  const nextCursor = hasMore && lastRow
    ? encodeCursor({ name: lastRow.name, id: lastRow.id })
    : null

  return {
    items: items.map(toDishDTO),
    nextCursor,
    hasMore,
  }
}

/**
 * Get the cooking plan for a specific date.
 */
export async function getCookingPlanForDate(
  start: Date,
  end: Date,
): Promise<CookingPlanDTO> {
  const plan = await db.dailyCookingPlan.findFirst({
    where: {
      date: {
        gte: start,
        lte: end,
      },
    },
  })

  if (!plan) {
    return { dishes: {}, cookedStats: {} }
  }

  return {
    dishes: plan.dishes as Record<string, unknown>,
    cookedStats: (plan.cookedStats as Record<string, Record<string, number>>) || {},
  }
}

/**
 * Get cooking plans for a date range (for audits/overview).
 */
export async function getCookingPlansForRange(
  start: Date,
  end: Date,
): Promise<CookingPlanRangeResult> {
  const plans = await db.dailyCookingPlan.findMany({
    where: {
      date: {
        gte: start,
        lte: end,
      },
    },
    orderBy: { date: 'asc' },
  })

  return {
    plans: plans.map((plan) => ({
      date: plan.date.toISOString().split('T')[0],
      menuNumber: plan.menuNumber,
      dishes: plan.dishes,
      cookedStats: (plan.cookedStats as Record<string, Record<string, number>>) || {},
    })),
  }
}

/**
 * Upsert a cooking plan for a date.
 */
export async function upsertCookingPlan(
  date: Date,
  menuNumber: number,
  dishes: unknown,
): Promise<{ id: string }> {
  const plan = await db.dailyCookingPlan.upsert({
    where: { date },
    update: { menuNumber, dishes: dishes as any },
    create: { date, menuNumber, dishes: dishes as any },
  })
  return { id: plan.id }
}

/**
 * Get warehouse point (admin geolocation).
 */
export async function getWarehousePoint(
  ownerAdminId: string,
): Promise<WarehousePointDTO> {
  const row = await db.admin.findUnique({
    where: { id: ownerAdminId },
    select: ADMIN_WAREHOUSE_POINT_SELECT,
  })

  return {
    lat: row?.latitude ?? null,
    lng: row?.longitude ?? null,
  }
}

// ── Command operations ───────────────────────────────────────────────────────

/**
 * Create a new ingredient (warehouse item).
 */
export async function createIngredient(data: {
  name: string
  amount: number
  unit: string
  kcalPerGram: number | null
  pricePerUnit: number | null
  priceUnit: string
}): Promise<WarehouseItemDTO> {
  const row = await db.warehouseItem.create({
    data: {
      name: data.name,
      amount: data.amount,
      unit: data.unit,
      kcalPerGram: data.kcalPerGram,
      pricePerUnit: data.pricePerUnit,
      priceUnit: data.priceUnit,
    },
    select: WAREHOUSE_ITEM_SELECT,
  })
  return toWarehouseItemDTO(row)
}

/**
 * Update an existing ingredient (warehouse item).
 */
export async function updateIngredient(
  id: string,
  data: {
    name?: string
    amount?: number
    unit?: string
    kcalPerGram?: number | null
    pricePerUnit?: number | null
    priceUnit?: string
  },
): Promise<WarehouseItemDTO> {
  const row = await db.warehouseItem.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.unit !== undefined && { unit: data.unit }),
      ...(data.kcalPerGram !== undefined && { kcalPerGram: data.kcalPerGram }),
      ...(data.pricePerUnit !== undefined && { pricePerUnit: data.pricePerUnit }),
      ...(data.priceUnit !== undefined && { priceUnit: data.priceUnit }),
    },
    select: WAREHOUSE_ITEM_SELECT,
  })
  return toWarehouseItemDTO(row)
}

/**
 * Delete an ingredient (warehouse item).
 */
export async function deleteIngredient(id: string): Promise<void> {
  await db.warehouseItem.delete({ where: { id } })
}

/**
 * Create a new dish.
 */
export async function createDish(data: {
  name: string
  description?: string
  mealType: string
  ingredients: IngredientRef[]
  calorieMappings?: Record<string, string[]>
  menuNumbers?: number[]
}): Promise<DishDTO> {
  const row = await db.dish.create({
    data: {
      name: data.name,
      description: data.description,
      mealType: data.mealType,
      ingredients: data.ingredients as any,
      calorieMappings: data.calorieMappings as any,
      menus: {
        connect: data.menuNumbers?.map((num) => ({ number: num })) || [],
      },
    },
    select: DISH_LIST_SELECT,
  })
  return toDishDTO(row)
}

/**
 * Update an existing dish.
 */
export async function updateDish(
  id: string,
  data: {
    name?: string
    description?: string
    mealType?: string
    ingredients?: IngredientRef[]
    calorieMappings?: Record<string, string[]>
    menuNumbers?: number[]
  },
): Promise<DishDTO> {
  const row = await db.dish.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.mealType !== undefined && { mealType: data.mealType }),
      ...(data.ingredients !== undefined && { ingredients: data.ingredients as any }),
      ...(data.calorieMappings !== undefined && { calorieMappings: data.calorieMappings as any }),
      ...(data.menuNumbers !== undefined && {
        menus: {
          set: [],
          connect: data.menuNumbers.map((num) => ({ number: num })),
        },
      }),
    },
    select: DISH_LIST_SELECT,
  })
  return toDishDTO(row)
}

/**
 * Delete a dish.
 */
export async function deleteDish(id: string): Promise<void> {
  await db.dish.delete({ where: { id } })
}

/**
 * Update the warehouse point (admin geolocation).
 */
export async function updateWarehousePoint(
  ownerAdminId: string,
  lat: number,
  lng: number,
): Promise<void> {
  await db.admin.update({
    where: { id: ownerAdminId },
    data: { latitude: lat, longitude: lng },
  })
}

/**
 * Execute the cook command — deducts ingredients from warehouse and updates cooking plan stats.
 */
export async function executeCookTransaction(input: {
  date: Date
  menuNumber: number | undefined
  updates: CookUpdateItem[]
  activeSetId?: string
}): Promise<CookResult> {
  const { date, updates, activeSetId } = input

  // 1. Fetch current plan to update stats
  const targetDate = new Date(date)
  let plan = await db.dailyCookingPlan.findFirst({
    where: {
      date: {
        gte: new Date(targetDate.setHours(0, 0, 0, 0)),
        lt: new Date(targetDate.setHours(23, 59, 59, 999)),
      },
    },
  })

  if (!plan) {
    if (!input.menuNumber) {
      throw new Error('No cooking plan found and no menuNumber provided to create one')
    }

    plan = await db.dailyCookingPlan.create({
      data: {
        date: new Date(date),
        menuNumber: parseInt(String(input.menuNumber)),
        dishes: {},
        cookedStats: {},
      },
    })
  }

  const cookedStats = (plan.cookedStats as any) || {}

  // 2. Fetch Active Set if provided (for custom ingredients)
  let activeSet: any = null
  if (activeSetId) {
    activeSet = await db.menuSet.findUnique({
      where: { id: activeSetId },
    })
  }

  // 3. Fetch standard dishes
  const dishIds = updates.map((u) => u.dishId.toString())
  const dishes = await db.dish.findMany({
    where: { id: { in: dishIds } },
  })
  const dishMap = new Map(dishes.map((d) => [d.id, d]))

  const inventoryUpdates = new Map<string, number>()

  for (const update of updates) {
    const { dishId, calorie, amount } = update
    const dId = dishId.toString()

    const dish = dishMap.get(dId)
    if (!dish) continue

    // Determine Ingredients: Standard or Custom from Set?
    let ingredientsToUse = dish.ingredients as any[]

    if (activeSet && activeSet.calorieGroups) {
      const currentMenuNumber = plan!.menuNumber
      const setGroups = activeSet.calorieGroups as any
      const dayGroups = setGroups[currentMenuNumber.toString()]

      if (dayGroups && Array.isArray(dayGroups)) {
        const targetGroup = dayGroups.find((g: any) => g.calories === calorie)

        if (targetGroup && targetGroup.dishes) {
          const setDish = targetGroup.dishes.find((d: any) => d.dishId.toString() === dId)

          if (setDish && setDish.customIngredients && setDish.customIngredients.length > 0) {
            ingredientsToUse = setDish.customIngredients
          }
        }
      }
    }

    // Scale ingredients by amount multiplier
    const scaled = (Array.isArray(ingredientsToUse) ? ingredientsToUse : []).map((ing: any) => ({
      ...ing,
      amount: (Number(ing?.amount) || 0) * amount,
    }))

    // Accumulate deductions
    for (const ing of scaled) {
      const current = inventoryUpdates.get(ing.name) || 0
      inventoryUpdates.set(ing.name, current + ing.amount)
    }

    // Update stats
    if (!cookedStats[dId]) cookedStats[dId] = {}
    const currentCooked = cookedStats[dId][calorie] || 0
    cookedStats[dId][calorie] = currentCooked + amount
  }

  // 4. Apply DB Transaction
  await db.$transaction(async (tx) => {
    // Update Plan
    await tx.dailyCookingPlan.update({
      where: { id: plan!.id },
      data: { cookedStats },
    })

    // Update Inventory with safety check
    for (const [name, deductAmount] of inventoryUpdates) {
      const item = await tx.warehouseItem.findUnique({ where: { name } })

      if (!item) {
        throw new Error(`Ingredient not found in warehouse: ${name}`)
      }

      if (item.amount < deductAmount) {
        throw new Error(
          `Insufficient stock: ${name}. Need ${deductAmount.toFixed(1)}${item.unit}, have ${item.amount.toFixed(1)}${item.unit}`,
        )
      }

      await tx.warehouseItem.update({
        where: { name },
        data: { amount: { decrement: deductAmount } },
      })
    }
  })

  return {
    success: true,
    cookedStats,
  }
}

/**
 * Save inventory (bulk upsert by name).
 */
export async function saveInventory(
  inventory: Record<string, number>,
): Promise<{ success: boolean; count: number }> {
  const updates = Object.entries(inventory).map(([name, amount]) => {
    return db.warehouseItem.upsert({
      where: { name },
      update: { amount },
      create: { name, amount },
    })
  })

  await db.$transaction(updates)

  return { success: true, count: updates.length }
}

// ── Warehouse Point coordinate extraction ────────────────────────────────────

/**
 * Extract coordinates from various Google Maps link formats or raw lat,lng strings.
 */
export function extractCoordinatesFromInput(input: string): { lat: number; lng: number } | null {
  if (!input) return null

  // 1) @lat,lng
  const atMatch = input.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)
  if (atMatch) return { lat: Number(atMatch[1]), lng: Number(atMatch[2]) }

  // 2) q=lat,lng or ll=lat,lng
  const qMatch = input.match(/[?&](?:q|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)
  if (qMatch) return { lat: Number(qMatch[1]), lng: Number(qMatch[2]) }

  // 3) !3dLAT!4dLNG (pb params)
  const pbMatch = input.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
  if (pbMatch) return { lat: Number(pbMatch[1]), lng: Number(pbMatch[2]) }

  // 4) raw "lat,lng"
  const simpleMatch = input.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/)
  if (simpleMatch) return { lat: Number(simpleMatch[1]), lng: Number(simpleMatch[2]) }

  // 5) /search/lat,lng
  const searchMatch = input.match(/search\/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/)
  if (searchMatch) return { lat: Number(searchMatch[1]), lng: Number(searchMatch[2]) }

  return null
}

/**
 * Expand short Google Maps URLs (goo.gl / maps.app.goo.gl) to full URLs.
 */
export async function expandShortUrlIfNeeded(url: string): Promise<string> {
  if (!url) return url
  if (!url.includes('goo.gl') && !url.includes('maps.app.goo.gl')) return url

  const res = await fetch(url, { method: 'HEAD', redirect: 'follow' })
  return res.url || url
}
