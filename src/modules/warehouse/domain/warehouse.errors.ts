/**
 * Warehouse Domain Errors — Domain layer.
 */

import { BadRequestError, ConflictError } from '@/modules/shared/errors'

/** Thrown when there is insufficient ingredient stock. */
export class InsufficientStockError extends BadRequestError {
  constructor(ingredientName: string, required: number, available: number) {
    super(`Insufficient stock for ${ingredientName}: need ${required}, have ${available}`, { ingredientName, required, available })
    this.name = 'InsufficientStockError'
  }
}

/** Thrown when a unit mismatch occurs during warehouse operations. */
export class UnitMismatchError extends ConflictError {
  constructor(ingredientName: string, existingUnit: string, requestedUnit: string) {
    super(`Unit mismatch for ${ingredientName}: warehouse uses ${existingUnit}, attempted with ${requestedUnit}`, { ingredientName, existingUnit, requestedUnit })
    this.name = 'UnitMismatchError'
  }
}

/** Thrown when an ingredient is not found in the warehouse. */
export class IngredientNotFoundError extends BadRequestError {
  constructor(ingredientName: string) {
    super(`Ingredient not found: ${ingredientName}`, { ingredientName })
    this.name = 'IngredientNotFoundError'
  }
}
