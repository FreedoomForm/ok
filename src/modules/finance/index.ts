/**
 * Finance module — Clean Architecture.
 *
 * This module encapsulates all finance-related business logic following
 * a layered architecture:
 *
 * - `contracts/`   — DTOs and type definitions (no business logic)
 * - `infrastructure/` — Data access (Prisma repository with select presets)
 * - `application/`   — Use-case queries/commands with auth & scope logic
 */

// Contracts (DTOs)
export type {
  TransactionType,
  TransactionListItem,
  TransactionDetail,
  SalaryPayment,
  BuyIngredientsResult,
  CompanyBalance,
  AdminBalanceRow,
  AdminBalanceResult,
  FinanceClientSummary,
  CreateTransactionData,
  PaySalaryData,
  BuyIngredientItem,
  BuyIngredientsData,
  TransactionFilters,
} from './contracts'

// Application queries
export {
  executeListTransactions,
  executeGetAdminBalances,
  executeGetCompanyBalance,
  executeGetFinanceClients,
  type ListTransactionsQuery,
  type GetAdminBalancesQuery,
  type GetCompanyBalanceQuery,
  type GetFinanceClientsQuery,
} from './application/queries'

// Application commands
export {
  executeCreateTransaction,
  executePaySalary,
  executeBuyIngredients,
  type CreateTransactionCommand,
  type PaySalaryCommand,
  type BuyIngredientsCommand,
} from './application/commands'

// Infrastructure (for advanced usage / testing)
export {
  listTransactions,
  getAdminBalances,
  getFinanceClients,
  createTransaction,
  paySalary,
  buyIngredients,
  verifyCustomerInScope,
  verifyStaffInScope,
  type ListTransactionsInput,
  type GetAdminBalancesInput,
  type GetFinanceClientsInput,
  type CreateTransactionInput,
  type PaySalaryInput,
  type BuyIngredientsInput,
} from './infrastructure'
