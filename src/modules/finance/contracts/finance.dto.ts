/**
 * Finance DTOs — Data Transfer Objects for the Finance module.
 *
 * These define the **contract** between the application layer and
 * the outside world (API routes, frontend).  No Prisma types leak
 * through these interfaces.
 *
 * Convention:
 * - `ListItem` — lightweight row for list/table views
 * - `Detail`   — full object for detail/edit views
 * - `Summary`  — count-based stats
 */

// ── Enums (mirror Prisma enums without importing @prisma/client) ────────────

export type TransactionType = 'INCOME' | 'EXPENSE'

// ── Transaction List Item (lightweight, for table/list views) ────────────────

export interface TransactionListItem {
  id: string
  amount: number
  type: TransactionType
  description: string | null
  category: string | null
  createdAt: string
  customerName: string | null
  customerPhone: string | null
  adminName: string | null
  salaryRecipientAdminId: string | null
}

// ── Transaction Detail (full object, for detail/edit views) ──────────────────

export interface TransactionDetail extends TransactionListItem {
  updatedAt: string
  adminId: string | null
  customerId: string | null
}

// ── Salary Payment ───────────────────────────────────────────────────────────

export interface SalaryPayment {
  recipientAdminId: string
  amount: number
}

// ── Buy Ingredients Result ───────────────────────────────────────────────────

export interface BuyIngredientsResult {
  transactionId: string
  totalCost: number
}

// ── Company Balance ──────────────────────────────────────────────────────────

export interface CompanyBalance {
  companyBalance: number
  history: TransactionListItem[]
}

// ── Admin Balance (for salary tracking) ──────────────────────────────────────

export interface AdminBalanceRow {
  id: string
  name: string
  role: string
  isActive: boolean
  createdAt: string
  salaryPerDay: number
  days: number
  accrued: number
  paid: number
  balance: number
  withdrawnInRange: number
}

export interface AdminBalanceResult {
  asOf: string
  admins: AdminBalanceRow[]
}

// ── Finance Client Summary ───────────────────────────────────────────────────

export interface FinanceClientSummary {
  id: string
  name: string
  phone: string
  balance: number
  dailyPrice: number
  createdAt: string
}

// ── Create Transaction input ─────────────────────────────────────────────────

export interface CreateTransactionData {
  customerId?: string
  amount: number
  type: TransactionType
  description?: string
  category?: string
}

// ── Pay Salary input ─────────────────────────────────────────────────────────

export interface PaySalaryData {
  adminId?: string
  recipientAdminId?: string
  amount: number
}

// ── Buy Ingredients input ────────────────────────────────────────────────────

export interface BuyIngredientItem {
  name: string
  amount: number
  costPerUnit: number
  unit?: string
  kcalPerGram?: number
}

export interface BuyIngredientsData {
  items: BuyIngredientItem[]
}

// ── Transaction filters (for list queries) ───────────────────────────────────

export interface TransactionFilters {
  type?: 'company' | 'all' | 'client'
  category?: string
  limit?: number
}
