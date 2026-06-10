/**
 * Warehouse DTOs — Data Transfer Objects for the Warehouse module.
 *
 * These define the **contract** between the application layer and
 * the outside world (API routes, frontend).  No Prisma types leak
 * through these interfaces.
 */

// ── WarehouseItem (ingredient in stock) ──────────────────────────────────────

export interface WarehouseItemDTO {
  id: string
  name: string
  amount: number
  unit: string
  kcalPerGram: number | null
  pricePerUnit: number | null
  priceUnit: string
  createdAt: string
  updatedAt: string
}

// ── Dish ─────────────────────────────────────────────────────────────────────

export interface IngredientRef {
  name: string
  amount: number
  unit: string
}

export interface DishDTO {
  id: string
  name: string
  description: string | null
  mealType: string
  ingredients: IngredientRef[]
  calorieMappings: Record<string, string[]> | null
  menuNumbers: number[]
  createdAt: string
  updatedAt: string
}

// ── Cooking Plan ─────────────────────────────────────────────────────────────

export interface CookingPlanDTO {
  dishes: Record<string, unknown>
  cookedStats: Record<string, Record<string, number>>
}

export interface CookingPlanRangeItem {
  date: string
  menuNumber: number
  dishes: unknown
  cookedStats: Record<string, Record<string, number>>
}

export interface CookingPlanRangeResult {
  plans: CookingPlanRangeItem[]
}

// ── Cook Command Result ──────────────────────────────────────────────────────

export interface CookResult {
  success: boolean
  cookedStats: Record<string, Record<string, number>>
}

// ── Inventory ────────────────────────────────────────────────────────────────

export interface InventoryDTO {
  [name: string]: number
}

// ── Warehouse Point (admin geolocation) ──────────────────────────────────────

export interface WarehousePointDTO {
  lat: number | null
  lng: number | null
}

export interface WarehousePointUpdateResult {
  message: string
  lat: number
  lng: number
}

// ── Create Ingredient input ──────────────────────────────────────────────────

export interface CreateIngredientData {
  name: string
  amount?: number
  unit?: string
  kcalPerGram?: number | null
  pricePerUnit?: number | null
  priceUnit?: string
}

// ── Update Ingredient input ──────────────────────────────────────────────────

export interface UpdateIngredientData {
  id: string
  name?: string
  amount?: number
  unit?: string
  kcalPerGram?: number | null
  pricePerUnit?: number | null
  priceUnit?: string
}

// ── Create Dish input ────────────────────────────────────────────────────────

export interface CreateDishData {
  name: string
  description?: string
  mealType: string
  ingredients: IngredientRef[]
  calorieMappings?: Record<string, string[]>
  menuNumbers?: number[]
}

// ── Cook input ───────────────────────────────────────────────────────────────

export interface CookUpdateItem {
  dishId: string
  calorie: number
  amount: number
}

export interface CookData {
  date: string
  menuNumber?: number
  updates: CookUpdateItem[]
  activeSetId?: string
}

// ── Update Warehouse Point input ─────────────────────────────────────────────

export interface UpdateWarehouseData {
  lat?: number
  lng?: number
  googleMapsLink?: string
}

// ── Inventory Save input ─────────────────────────────────────────────────────

export interface SaveInventoryData {
  [name: string]: number
}
