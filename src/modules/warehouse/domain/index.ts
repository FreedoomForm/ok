/**
 * Warehouse Domain — barrel export.
 */

export {
  IngredientEntity,
  DishEntity,
} from './warehouse.entity'

export {
  WarehousePolicy,
  type WarehousePolicyUser,
} from './warehouse.policy'

export {
  InsufficientStockError,
  UnitMismatchError,
  IngredientNotFoundError,
} from './warehouse.errors'

export {
  type IngredientPurchasedEvent,
  type DishCookedEvent,
  type IngredientPurchasedPayload,
  type DishCookedPayload,
  createIngredientPurchasedEvent,
  createDishCookedEvent,
} from './warehouse.events'
