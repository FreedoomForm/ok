/**
 * Warehouse Domain Events — Domain layer.
 */

import type { DomainEvent } from '@/modules/orders/domain/order.events'

export interface IngredientPurchasedPayload {
  ingredientName: string
  amount: number
  unit: string
  costPerUnit: number
  totalCost: number
}

export type IngredientPurchasedEvent = DomainEvent<'warehouse.ingredient-purchased', IngredientPurchasedPayload>

export interface DishCookedPayload {
  dishId: string
  dishName: string
  date: string
  calorie: number
  amount: number
}

export type DishCookedEvent = DomainEvent<'warehouse.dish-cooked', DishCookedPayload>

// ── Event constructors ─────────────────────────────────────────────────────

export function createIngredientPurchasedEvent(payload: IngredientPurchasedPayload): IngredientPurchasedEvent {
  return {
    type: 'warehouse.ingredient-purchased',
    aggregateType: 'warehouse',
    aggregateId: payload.ingredientName,
    payload,
    timestamp: new Date(),
  }
}

export function createDishCookedEvent(payload: DishCookedPayload): DishCookedEvent {
  return {
    type: 'warehouse.dish-cooked',
    aggregateType: 'warehouse',
    aggregateId: payload.dishId,
    payload,
    timestamp: new Date(),
  }
}
