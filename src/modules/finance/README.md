# Finance Module

Financial operations for the AutoFood delivery platform.

## Purpose

Handles transactions (income/expense), salary payments, company balance tracking, ingredient purchases, and client balance summaries. All financial commands include audit logging.

## Directory Structure

```
src/modules/finance/
├── contracts/
│   ├── finance.dto.ts      # All DTOs and type definitions
│   └── index.ts            # Barrel export
├── infrastructure/
│   ├── finance.repository.ts # Prisma queries with select presets + transformers
│   └── index.ts            # Barrel export
├── application/
│   ├── queries/
│   │   ├── list-transactions.ts     # List transactions with filters
│   │   ├── get-admin-balances.ts    # Salary accrual balances
│   │   ├── get-company-balance.ts   # Company balance + history
│   │   ├── get-finance-clients.ts   # Client balance summaries
│   │   └── index.ts
│   ├── commands/
│   │   ├── create-transaction.ts    # Create income/expense transaction
│   │   ├── pay-salary.ts            # Pay salary to admin
│   │   ├── buy-ingredients.ts       # Purchase ingredients (deducts from company balance)
│   │   └── index.ts
│   └── index.ts
└── index.ts                # Module barrel export
```

## Public API (Exported Functions)

### Queries
| Function | Description |
|---|---|
| `executeListTransactions(query)` | List transactions with type/category filters |
| `executeGetAdminBalances(query)` | Salary accrual balances for all admins |
| `executeGetCompanyBalance(query)` | Company balance with transaction history |
| `executeGetFinanceClients(query)` | Client balance summaries |

### Commands
| Function | Description |
|---|---|
| `executeCreateTransaction(command)` | Create income/expense transaction with audit log |
| `executePaySalary(command)` | Pay salary with balance deduction and audit log |
| `executeBuyIngredients(command)` | Purchase ingredients with company balance deduction |

### Infrastructure
| Function | Description |
|---|---|
| `listTransactions(input)` | Raw transaction list with Prisma select preset |
| `getAdminBalances(input)` | Raw salary accrual computation |
| `getFinanceClients(input)` | Raw client balance list |
| `createTransaction(input)` | Raw Prisma create |
| `paySalary(input)` | Raw salary payment with balance update |
| `buyIngredients(input)` | Raw ingredient purchase with unit conversion |
| `verifyCustomerInScope(input)` | Verify customer belongs to admin's scope |
| `verifyStaffInScope(input)` | Verify staff member belongs to admin's scope |

## Key DTOs

| DTO | Purpose |
|---|---|
| `TransactionListItem` | Lightweight transaction row |
| `TransactionDetail` | Full transaction detail |
| `CompanyBalance` | Company balance + transaction history |
| `AdminBalanceResult` | Salary accrual balances for all admins |
| `AdminBalanceRow` | Single admin's salary balance |
| `FinanceClientSummary` | Client balance summary |
| `CreateTransactionData` | Input for creating a transaction |
| `PaySalaryData` | Input for salary payment |
| `BuyIngredientsData` | Input for ingredient purchase |
| `TransactionType` | `'INCOME' \| 'EXPENSE'` |
| `TransactionFilters` | Filter input for list queries |

## Role-Based Scoping Rules

| Role | Scope |
|---|---|
| `SUPER_ADMIN` | All financial data |
| `MIDDLE_ADMIN` | Financial data within own admin group |
| `LOW_ADMIN` | Read-only access to own group's financial data |
| `COURIER` | No financial access |

## Audit Events

All financial commands log audit events:
- `CREATE_TRANSACTION` — on transaction creation
- `PAY_SALARY` — on salary payment
- `BUY_INGREDIENTS` — on ingredient purchase
