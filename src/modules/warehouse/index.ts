/**
 * Warehouse module — Clean Architecture.
 *
 * This module encapsulates all warehouse-related business logic following
 * a layered architecture:
 *
 * - `domain/`       — Domain entities, policies, errors, and events
 * - `contracts/`    — DTOs and type definitions (no business logic)
 * - `infrastructure/` — Data access (Prisma repository with select presets)
 * - `application/`   — Use-case queries/commands with auth & scope logic
 */

// Domain
export {
  IngredientEntity,
  DishEntity,
  WarehousePolicy,
  type WarehousePolicyUser,
  InsufficientStockError,
  UnitMismatchError,
  IngredientNotFoundError,
  type IngredientPurchasedEvent,
  type DishCookedEvent,
  createIngredientPurchasedEvent,
  createDishCookedEvent,
} from './domain'

// Contracts (DTOs)
export type {
  WarehouseItemDTO,
  IngredientRef,
  DishDTO,
  CookingPlanDTO,
  CookingPlanRangeItem,
  CookingPlanRangeResult,
  CookResult,
  InventoryDTO,
  WarehousePointDTO,
  WarehousePointUpdateResult,
  CreateIngredientData,
  UpdateIngredientData,
  CreateDishData,
  CookUpdateItem,
  CookData,
  UpdateWarehouseData,
  SaveInventoryData,
} from './contracts'

// Application queries
export {
  executeListIngredients,
  executeListDishes,
  executeGetCookingPlan,
  executeGetWarehouse,
  type ListIngredientsQuery,
  type ListDishesQuery,
  type GetCookingPlanQuery,
  type GetWarehouseQuery,
} from './application/queries'

// Application commands
export {
  executeCreateIngredient,
  executeUpdateIngredient,
  executeCreateDish,
  executeCook,
  executeUpdateWarehouse,
  type CreateIngredientCommand,
  type UpdateIngredientCommand,
  type CreateDishCommand,
  type CookCommand,
  type UpdateWarehouseCommand,
} from './application/commands'

// Infrastructure (for advanced usage / testing)
export {
  listIngredients,
  listDishes,
  getCookingPlanForDate,
  getCookingPlansForRange,
  upsertCookingPlan,
  getWarehousePoint,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  createDish,
  updateDish,
  deleteDish,
  updateWarehousePoint,
  executeCookTransaction,
  saveInventory,
  extractCoordinatesFromInput,
  expandShortUrlIfNeeded,
} from './infrastructure'
