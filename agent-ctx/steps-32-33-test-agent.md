# Steps 32-33: Unit Tests & Integration Tests

## Work Summary

### Step 32: Unit Tests for Domain Layer

**Infrastructure:**
- Installed `vitest` and `@vitest/coverage-v8` as dev dependencies
- Created `vitest.config.ts` at project root with `@/` path alias, node environment, coverage for domain layer
- Added test scripts to package.json: `test`, `test:watch`, `test:coverage`, `test:e2e`

**Domain Entity Tests (6 files, 148 test cases):**
1. `order.entity.test.ts` (50 tests) — canTransitionTo all valid/invalid transitions, CANCELED terminal state, isTerminal, assertCanTransitionTo throws, convenience methods (canBeDelivered, canBeCancelled, etc.), resolvePaymentStatus, totalCost
2. `customer.entity.test.ts` (12 tests) — canBeDeleted (active orders check), canToggleStatus, canBePermanentlyDeleted, hasSufficientBalance, orderCost
3. `transaction.entity.test.ts` (22 tests) — isValidAmount (positive, zero, negative, NaN, Infinity), canBeReversed (SALARY restriction), isCustomerTransaction, isCompanyTransaction, isSalaryTransaction, validateAmount static method (boundaries)
4. `warehouse.entity.test.ts` (17 tests) — IngredientEntity.hasSufficientStock (sufficient, insufficient, exact, unit conversion), calculateCost, DishEntity.canBeCooked (all ingredients, missing ingredient, insufficient stock, multiple shortages), requiredIngredientNames
5. `courier.entity.test.ts` (16 tests) — canAcceptOrder (active/on-shift, inactive, off-shift), canWithdraw (sufficient balance, insufficient, invalid amounts, NaN, Infinity), accruedSalary, availableBalance
6. `admins.entity.test.ts` (30 tests) — canCreateSubordinate (SUPER_ADMIN→all, MIDDLE_ADMIN→subordinates, LOW_ADMIN→rejected, COURIER→rejected), canBeDeleted (self-delete rejected, role hierarchy), canToggleStatus, isHighLevel

**Domain Policy Tests (2 files, 34 test cases):**
1. `order.policy.test.ts` (20 tests) — canChangeStatus for all roles (SUPER_ADMIN, COURIER, MIDDLE_ADMIN, LOW_ADMIN), canDelete, canAcceptOrder
2. `customer.policy.test.ts` (14 tests) — canDelete (SUPER_ADMIN, group scoping), canToggleStatus (COURIER rejection, group scoping), canPermanentlyDelete (role-based)

**Transformer Tests (2 files, 24 test cases):**
1. `order.repository.test.ts` (11 tests) — formatDeliveryDate, toCustomerSnapshot, toListItem (all fields, courier name, deletedAt, isAutoOrder, customer snapshot), toDetail (all detail fields, timestamps)
2. `customer.repository.test.ts` (13 tests) — parseDeliveryDays, toListItem (all fields, delivery days, courier/set names, defaults, preferences→specialFeatures), toDetail (audit fields, deletedAt), toBinItem

**Select Preset Validation Tests (1 file, 7 test cases):**
1. `select-preset.test.ts` (7 tests) — OrderListItem field validation, OrderDetail extra fields, CustomerListItem fields, CustomerDetail audit fields, CustomerBinItem minimal fields, TransactionListItem fields, TransactionDetail extra fields

**Source Changes (for testability):**
- Exported `formatDeliveryDate`, `toCustomerSnapshot`, `toListItem`, `toDetail` from `order.repository.ts`
- Exported `parseDeliveryDays`, `toListItem`, `toDetail`, `toBinItem` from `customer.repository.ts`

### Step 33: Integration Tests for Repositories

**Infrastructure:**
- Created `src/tests/helpers/test-db.ts` — PrismaClient with TEST_DATABASE_URL fallback
- Integration tests use `RUN_INTEGRATION_TESTS=1` env var to skip when no DB is available

**Integration Test Files (3 files, 33 test cases - all skip gracefully):**
1. `order.repository.integration.test.ts` (10 tests) — listOrders shape, item shape, scopedAdminIds, limit, deleted filtering, batchGetOrders, getOrderDetail
2. `customer.repository.integration.test.ts` (13 tests) — listCustomers shape, item shape, scopedCreatedBy, limit, bin customers, customer summary consistency, batchGetCustomers, getCustomerDetail, cursor pagination
3. `finance.repository.integration.test.ts` (10 tests) — listTransactions shape, pagination, empty for non-existent admin, getAdminBalances shape, getFinanceClients shape, balance filtering

### Verification Results
- `npx tsc --noEmit` — **passes** (exit code 0)
- `npx vitest run` — **passes** (19 test files, 315 tests passed, 3 files skipped with 33 tests)
- `bun run lint` — **0 errors** (487 warnings, all pre-existing)

### Test Count Summary
- **Total test files**: 22 (19 unit + 3 integration)
- **Total test cases**: 348 (315 unit passing + 33 integration skipped)
- **New test files created**: 12 (6 entity + 2 policy + 2 transformer + 1 select preset + 1 test-db helper)
