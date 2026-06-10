# Warehouse Module

Warehouse and kitchen management for the AutoFood delivery platform.

## Purpose

Handles ingredient inventory, dish recipes, cooking plan management, cooking execution (with ingredient deduction), and warehouse point geolocation. Supports multi-set menu configurations.

## Directory Structure

```
src/modules/warehouse/
├── contracts/
│   ├── warehouse.dto.ts    # All DTOs and type definitions
│   └── index.ts            # Barrel export
├── infrastructure/
│   ├── warehouse.repository.ts # Prisma queries + coordinate extraction + URL expansion
│   └── index.ts            # Barrel export
├── application/
│   ├── queries/
│   │   ├── list-ingredients.ts     # List all ingredients
│   │   ├── list-dishes.ts          # List all dishes with ingredients
│   │   ├── get-cooking-plan.ts     # Get cooking plan for date range
│   │   ├── get-warehouse.ts        # Get warehouse point coordinates
│   │   └── index.ts
│   ├── commands/
│   │   ├── create-ingredient.ts    # Add new ingredient to inventory
│   │   ├── update-ingredient.ts    # Update ingredient data
│   │   ├── create-dish.ts          # Create dish with ingredient refs
│   │   ├── cook.ts                 # Execute cooking (deduct ingredients, update plan)
│   │   ├── update-warehouse.ts     # Update warehouse point coordinates
│   │   └── index.ts
│   └── index.ts
└── index.ts                # Module barrel export
```

## Public API (Exported Functions)

### Queries
| Function | Description |
|---|---|
| `executeListIngredients(query)` | List all ingredients with role-based scoping |
| `executeListDishes(query)` | List all dishes with ingredient references |
| `executeGetCookingPlan(query)` | Get cooking plan for a date or date range |
| `executeGetWarehouse(query)` | Get warehouse point coordinates |

### Commands
| Function | Description |
|---|---|
| `executeCreateIngredient(command)` | Add a new ingredient |
| `executeUpdateIngredient(command)` | Update ingredient data |
| `executeCreateDish(command)` | Create a dish with ingredient references |
| `executeCook(command)` | Execute cooking: deduct ingredients, update plan stats |
| `executeUpdateWarehouse(command)` | Update warehouse geolocation point |

### Infrastructure
| Function | Description |
|---|---|
| `listIngredients()` | Raw ingredient list |
| `listDishes()` | Raw dish list |
| `getCookingPlanForDate()` | Raw cooking plan for single date |
| `getCookingPlansForRange()` | Raw cooking plan for date range |
| `upsertCookingPlan()` | Upsert cooking plan data |
| `getWarehousePoint()` | Raw warehouse point query |
| `createIngredient()` | Raw Prisma create |
| `updateIngredient()` | Raw Prisma update |
| `deleteIngredient()` | Raw Prisma delete |
| `createDish()` | Raw Prisma create |
| `updateDish()` | Raw Prisma update |
| `deleteDish()` | Raw Prisma delete |
| `updateWarehousePoint()` | Raw warehouse point update |
| `executeCookTransaction()` | Raw cooking execution with transaction |
| `saveInventory()` | Save inventory snapshot |
| `extractCoordinatesFromInput()` | Parse coordinates from text input |
| `expandShortUrlIfNeeded()` | Expand shortened Google Maps URLs |

## Key DTOs

| DTO | Purpose |
|---|---|
| `WarehouseItemDTO` | Ingredient in stock |
| `DishDTO` | Dish with ingredient references and calorie mappings |
| `CookingPlanDTO` | Cooking plan for a single date |
| `CookingPlanRangeResult` | Cooking plan for a date range |
| `CookResult` | Result of cook execution |
| `InventoryDTO` | Inventory snapshot (name → quantity map) |
| `WarehousePointDTO` | Warehouse geolocation point |
| `CreateIngredientData` | Input for creating an ingredient |
| `UpdateIngredientData` | Input for updating an ingredient |
| `CreateDishData` | Input for creating a dish |
| `CookData` | Input for cook execution |
| `UpdateWarehouseData` | Input for updating warehouse point |
| `IngredientRef` | Ingredient reference in a dish recipe |

## Role-Based Scoping Rules

| Role | Scope |
|---|---|
| `SUPER_ADMIN` | Full warehouse access |
| `MIDDLE_ADMIN` | Warehouse within own admin group |
| `LOW_ADMIN` | Read-only warehouse access within own group |
| `COURIER` | No warehouse access |
