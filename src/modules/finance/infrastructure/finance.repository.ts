/**
 * Finance Repository — Data access layer for the Finance module.
 *
 * Encapsulates all Prisma queries for financial transactions, admin
 * balances, and customer balances, providing:
 * - **Select presets** — Avoid SELECT * by defining exactly which fields
 *   each use-case needs.
 * - **Transformation** — Map raw Prisma rows to clean DTOs that match
 *   the contracts defined in `../contracts/`.
 * - **Data isolation** — Accept scoped admin IDs so callers
 *   don't need to know about role-based filtering internals.
 */

import { db } from '@/modules/shared/db'
import { Prisma } from '@prisma/client'
import { encodeCursor, decodeCursor, type PaginatedResult } from '@/modules/shared/validation'
import type {
  TransactionListItem,
  TransactionDetail,
  TransactionType,
  TransactionFilters,
  FinanceClientSummary,
  AdminBalanceRow,
  CompanyBalance,
} from '../contracts'

// ── Prisma select presets ────────────────────────────────────────────────────

/** Customer fields included in transaction queries. */
const CUSTOMER_SELECT = {
  name: true,
  phone: true,
} as const

/** Admin fields included in transaction queries. */
const ADMIN_SELECT = {
  name: true,
} as const

/** Transaction select for list views — batch loads related data. */
const TRANSACTION_LIST_SELECT = {
  id: true,
  amount: true,
  type: true,
  description: true,
  category: true,
  createdAt: true,
  salaryRecipientAdminId: true,
  customer: { select: CUSTOMER_SELECT },
  admin: { select: ADMIN_SELECT },
} as const

/** Transaction select for detail views — includes all fields. */
const TRANSACTION_DETAIL_SELECT = {
  id: true,
  amount: true,
  type: true,
  description: true,
  category: true,
  createdAt: true,
  updatedAt: true,
  adminId: true,
  customerId: true,
  salaryRecipientAdminId: true,
  customer: { select: CUSTOMER_SELECT },
  admin: { select: ADMIN_SELECT },
} as const

/** Admin select for salary balance queries. */
const ADMIN_BALANCE_SELECT = {
  id: true,
  name: true,
  role: true,
  salary: true,
  createdAt: true,
  isActive: true,
} as const

/** Customer select for finance client summary. */
const CLIENT_FINANCE_SELECT = {
  id: true,
  name: true,
  phone: true,
  balance: true,
  dailyPrice: true,
  createdAt: true,
} as const

// ── Type helpers ─────────────────────────────────────────────────────────────

type TransactionListRow = Prisma.TransactionGetPayload<{ select: typeof TRANSACTION_LIST_SELECT }>
type TransactionDetailRow = Prisma.TransactionGetPayload<{ select: typeof TRANSACTION_DETAIL_SELECT }>

// ── Transformers ─────────────────────────────────────────────────────────────

function toTransactionListItem(row: TransactionListRow): TransactionListItem {
  return {
    id: row.id,
    amount: row.amount,
    type: row.type as TransactionType,
    description: row.description,
    category: row.category,
    createdAt: row.createdAt.toISOString(),
    customerName: row.customer?.name ?? null,
    customerPhone: row.customer?.phone ?? null,
    adminName: row.admin?.name ?? null,
    salaryRecipientAdminId: row.salaryRecipientAdminId,
  }
}

function toTransactionDetail(row: TransactionDetailRow): TransactionDetail {
  return {
    id: row.id,
    amount: row.amount,
    type: row.type as TransactionType,
    description: row.description,
    category: row.category,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    adminId: row.adminId,
    customerId: row.customerId,
    customerName: row.customer?.name ?? null,
    customerPhone: row.customer?.phone ?? null,
    adminName: row.admin?.name ?? null,
    salaryRecipientAdminId: row.salaryRecipientAdminId,
  }
}

// ── Repository functions ─────────────────────────────────────────────────────

export interface ListTransactionsInput {
  effectiveAdminId: string
  filters?: TransactionFilters
  cursor?: string
  limit?: number
}

/**
 * List transactions for a given admin with optional filters.
 * Uses Prisma `include` with select presets to batch-load related data.
 * Supports cursor-based pagination with stable sort (createdAt DESC, id DESC).
 */
export async function listTransactions(
  input: ListTransactionsInput,
): Promise<CompanyBalance & { pagination?: { nextCursor: string | null; hasMore: boolean } }> {
  const { effectiveAdminId, filters, cursor, limit = 25 } = input

  // Fetch admin balance
  const adminWithBalance = await db.admin.findUnique({
    where: { id: effectiveAdminId },
    select: { companyBalance: true },
  })

  if (!adminWithBalance) {
    return { companyBalance: 0, history: [], pagination: { nextCursor: null, hasMore: false } }
  }

  // Build where clause
  const where: Prisma.TransactionWhereInput = {
    adminId: effectiveAdminId,
  }

  if (filters?.type === 'company') {
    where.customerId = null
  } else if (filters?.type === 'client') {
    where.customerId = { not: null }
  }

  if (filters?.category && filters.category !== 'all') {
    where.category = filters.category
  }

  // Apply cursor filter for keyset pagination
  if (cursor) {
    const decoded = decodeCursor(cursor)
    if (decoded) {
      const cursorCreatedAt = decoded.createdAt as string
      const cursorId = decoded.id as string
      if (cursorCreatedAt && cursorId) {
        where.OR = [
          { createdAt: { lt: new Date(cursorCreatedAt) } },
          { createdAt: { equals: new Date(cursorCreatedAt) }, id: { lt: cursorId } },
        ]
      }
    }
  }

  // Fetch limit + 1 to determine hasMore
  const rows = await db.transaction.findMany({
    where,
    select: TRANSACTION_LIST_SELECT,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  })

  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows

  const lastRow = items[items.length - 1]
  const nextCursor = hasMore && lastRow
    ? encodeCursor({ createdAt: lastRow.createdAt.toISOString(), id: lastRow.id })
    : null

  return {
    companyBalance: adminWithBalance.companyBalance,
    history: items.map(toTransactionListItem),
    pagination: { nextCursor, hasMore },
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export interface GetAdminBalancesInput {
  effectiveAdminId: string
  groupAdminIds: string[] | null
  isSuperAdmin: boolean
  asOf: Date
  from: Date | null
  to: Date | null
}

function startOfDayUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function diffDaysInclusiveUtc(from: Date, to: Date) {
  const fromDay = startOfDayUtc(from).getTime()
  const toDay = startOfDayUtc(to).getTime()
  const diff = Math.floor((toDay - fromDay) / (24 * 60 * 60 * 1000))
  return Math.max(0, diff + 1)
}

/**
 * Get admin salary balances for salary tracking.
 */
export async function getAdminBalances(
  input: GetAdminBalancesInput,
): Promise<{ asOf: string; admins: AdminBalanceRow[] }> {
  const { effectiveAdminId, groupAdminIds, isSuperAdmin, asOf, from, to } = input

  const where: Prisma.AdminWhereInput = {
    role: { in: ['LOW_ADMIN', 'COURIER', 'WORKER'] as const },
  }

  if (!isSuperAdmin) {
    where.createdBy = { in: groupAdminIds ?? [effectiveAdminId] }
  }

  const admins = await db.admin.findMany({
    where,
    select: ADMIN_BALANCE_SELECT,
    orderBy: { createdAt: 'desc' },
  })

  const adminIds = admins.map((a) => a.id)

  // Total salary payments per admin
  const salaryPayments = adminIds.length
    ? await db.transaction.groupBy({
        by: ['salaryRecipientAdminId'],
        where: {
          category: 'SALARY',
          salaryRecipientAdminId: { in: adminIds },
        },
        _sum: { amount: true },
      })
    : []

  // Withdrawals within the date range
  const withdrawalsInRange =
    adminIds.length && from && to
      ? await db.transaction.groupBy({
          by: ['salaryRecipientAdminId'],
          where: {
            category: 'SALARY',
            salaryRecipientAdminId: { in: adminIds },
            createdAt: { gte: from, lt: to },
          },
          _sum: { amount: true },
        })
      : []

  const paidById = new Map<string, number>()
  for (const row of salaryPayments) {
    if (row.salaryRecipientAdminId) {
      paidById.set(row.salaryRecipientAdminId, row._sum.amount ?? 0)
    }
  }

  const withdrawnById = new Map<string, number>()
  for (const row of withdrawalsInRange) {
    if (row.salaryRecipientAdminId) {
      withdrawnById.set(row.salaryRecipientAdminId, row._sum.amount ?? 0)
    }
  }

  const result: AdminBalanceRow[] = admins.map((admin) => {
    const days = diffDaysInclusiveUtc(admin.createdAt, asOf)
    const accrued = Number(admin.salary ?? 0) * days
    const paid = paidById.get(admin.id) ?? 0
    const balance = accrued - paid

    return {
      id: admin.id,
      name: admin.name,
      role: admin.role,
      isActive: admin.isActive,
      createdAt: admin.createdAt.toISOString(),
      salaryPerDay: admin.salary ?? 0,
      days,
      accrued,
      paid,
      balance,
      withdrawnInRange: withdrawnById.get(admin.id) ?? 0,
    }
  })

  return { asOf: asOf.toISOString(), admins: result }
}

// ─────────────────────────────────────────────────────────────────────────────

export interface GetFinanceClientsInput {
  groupAdminIds: string[] | null
  filter?: string
  search?: string
  asOf?: Date | null
}

/**
 * Get finance client summaries with balance filtering.
 * Supports "as of" date by rolling back transactions after the given date.
 */
export async function getFinanceClients(
  input: GetFinanceClientsInput,
): Promise<FinanceClientSummary[]> {
  const { groupAdminIds, filter, search, asOf } = input

  const where: Prisma.CustomerWhereInput = {
    deletedAt: null,
  }

  if (groupAdminIds && groupAdminIds.length > 0) {
    where.createdBy = { in: groupAdminIds }
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ]
  }

  // Apply balance filter only when no asOf date (otherwise apply after computation)
  if (!asOf) {
    if (filter === 'positive') {
      where.balance = { gt: 0 }
    } else if (filter === 'negative') {
      where.balance = { lt: 0 }
    } else if (filter === 'zero') {
      where.balance = { equals: 0 }
    }
  }

  const clients = await db.customer.findMany({
    where,
    select: CLIENT_FINANCE_SELECT,
    orderBy: { name: 'asc' },
  })

  if (!asOf) {
    return clients.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      balance: Number(c.balance ?? 0),
      dailyPrice: c.dailyPrice,
      createdAt: c.createdAt.toISOString(),
    }))
  }

  // Compute "balance as of" by rolling back transactions after the asOf timestamp
  const clientIds = clients.map((c) => c.id)
  const txAfter = await db.transaction.groupBy({
    by: ['customerId', 'type'],
    where: {
      customerId: { in: clientIds },
      createdAt: { gt: asOf },
    },
    _sum: { amount: true },
  })

  const deltaAfterByClient = new Map<string, { income: number; expense: number }>()
  txAfter.forEach((row) => {
    const customerId = row.customerId as string | null
    if (!customerId) return
    const current = deltaAfterByClient.get(customerId) ?? { income: 0, expense: 0 }
    const amount = Number(row._sum.amount ?? 0)
    if (row.type === 'INCOME') current.income += amount
    if (row.type === 'EXPENSE') current.expense += amount
    deltaAfterByClient.set(customerId, current)
  })

  const clientsAsOf = clients.map((client) => {
    const delta = deltaAfterByClient.get(client.id) ?? { income: 0, expense: 0 }
    const balanceAsOf = Number(client.balance ?? 0) - delta.income + delta.expense
    return {
      id: client.id,
      name: client.name,
      phone: client.phone,
      balance: balanceAsOf,
      dailyPrice: client.dailyPrice,
      createdAt: client.createdAt.toISOString(),
    }
  })

  // Apply filter after computing asOf balances
  if (filter === 'positive') {
    return clientsAsOf.filter((c) => c.balance > 0)
  } else if (filter === 'negative') {
    return clientsAsOf.filter((c) => c.balance < 0)
  } else if (filter === 'zero') {
    return clientsAsOf.filter((c) => c.balance === 0)
  }

  return clientsAsOf
}

// ── Write operations ────────────────────────────────────────────────────────

export interface CreateTransactionInput {
  customerId?: string
  amount: number
  type: TransactionType
  description?: string
  category?: string
  effectiveAdminId: string
  actingUserId: string
}

/**
 * Create a financial transaction.
 * - Client transactions: update customer balance
 * - Company transactions: update admin companyBalance
 * Returns the TransactionDetail DTO.
 */
export async function createTransaction(
  input: CreateTransactionInput,
): Promise<TransactionDetail> {
  const { customerId, amount, type, description, category, effectiveAdminId, actingUserId } = input

  const balanceChange = type === 'INCOME' ? amount : -amount

  const result = await db.$transaction(async (tx) => {
    let transactionRecord

    if (customerId) {
      // CLIENT TRANSACTION — update customer balance
      await tx.customer.update({
        where: { id: customerId },
        data: { balance: { increment: balanceChange } },
      })

      transactionRecord = await tx.transaction.create({
        data: {
          amount,
          type: type as any,
          description,
          category: category || 'MANUAL_ADJUSTMENT',
          adminId: effectiveAdminId,
          customerId,
        },
        select: TRANSACTION_DETAIL_SELECT,
      })
    } else {
      // COMPANY TRANSACTION — update admin companyBalance
      await tx.admin.update({
        where: { id: effectiveAdminId },
        data: { companyBalance: { increment: balanceChange } },
      })

      transactionRecord = await tx.transaction.create({
        data: {
          amount,
          type: type as any,
          description,
          category: category || 'COMPANY_FUNDS',
          adminId: effectiveAdminId,
        },
        select: TRANSACTION_DETAIL_SELECT,
      })
    }

    return transactionRecord
  })

  // Audit log (best-effort, ignore failures)
  try {
    await db.actionLog.create({
      data: {
        adminId: actingUserId,
        action: 'CREATE_TRANSACTION',
        entityType: 'TRANSACTION',
        entityId: result.id,
        description: `Created finance transaction${customerId ? ' for customer' : ''}`,
      },
    })
  } catch {
    // ignore logging failures
  }

  return toTransactionDetail(result)
}

// ─────────────────────────────────────────────────────────────────────────────

export interface PaySalaryInput {
  targetAdminId: string
  amount: number
  effectiveAdminId: string
  actingUserId: string
}

/**
 * Pay salary to an admin/courier.
 * Deducts from company balance and creates an EXPENSE transaction.
 */
export async function paySalary(
  input: PaySalaryInput,
): Promise<{ success: boolean }> {
  const { targetAdminId, amount, effectiveAdminId, actingUserId } = input

  // Get staff details for the description
  const staff = await db.admin.findUnique({
    where: { id: targetAdminId },
    select: { id: true, name: true, role: true },
  })

  if (!staff) {
    throw new Error('STAFF_NOT_FOUND')
  }

  // Deduct salary from company balance
  await db.admin.update({
    where: { id: effectiveAdminId },
    data: { companyBalance: { decrement: amount } },
  })

  // Create transaction record
  const transaction = await db.transaction.create({
    data: {
      amount,
      type: 'EXPENSE',
      category: 'SALARY',
      description: `Выплата зарплаты: ${staff.name} (${staff.role === 'COURIER' ? 'Курьер' : 'Админ'})`,
      adminId: effectiveAdminId,
      salaryRecipientAdminId: staff.id,
    },
  })

  // Audit log (best-effort)
  try {
    await db.actionLog.create({
      data: {
        adminId: actingUserId,
        action: 'PAY_SALARY',
        entityType: 'ADMIN',
        entityId: staff.id,
        description: `Paid salary ${amount}`,
      },
    })
  } catch {
    // ignore logging failures
  }

  return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────

export interface BuyIngredientsInput {
  items: Array<{
    name: string
    amount: number
    costPerUnit: number
    unit: string
    kcalPerGram?: number
  }>
  effectiveAdminId: string
  actingUserId: string
}

const normalizeUnit = (unit: string): string => {
  const value = unit.trim().toLowerCase()
  if (value === 'g') return 'gr'
  if (value === 'pc' || value === 'sht' || value === 'don' || value === "bo'lak") return 'pcs'
  return value
}

const massUnits: Record<string, number> = { mg: 0.001, gr: 1, kg: 1000 }
const volumeUnits: Record<string, number> = { ml: 1, l: 1000 }
const countUnits: Record<string, number> = { pcs: 1, dona: 1 }

const convertAmount = (amount: number, fromUnit: string, toUnit: string): number | null => {
  const from = normalizeUnit(fromUnit)
  const to = normalizeUnit(toUnit)
  if (from === to) return amount
  if (massUnits[from] && massUnits[to]) return (amount * massUnits[from]) / massUnits[to]
  if (volumeUnits[from] && volumeUnits[to]) return (amount * volumeUnits[from]) / volumeUnits[to]
  if (countUnits[from] && countUnits[to]) return amount
  return null
}

/**
 * Buy ingredients — deducts from company balance, updates warehouse stock.
 * All operations happen within a Prisma transaction.
 */
export async function buyIngredients(
  input: BuyIngredientsInput,
): Promise<{ transactionId: string; totalCost: number }> {
  const { items, effectiveAdminId, actingUserId } = input

  const totalCost = items.reduce((sum, item) => sum + item.amount * item.costPerUnit, 0)

  const result = await db.$transaction(async (tx) => {
    const admin = await tx.admin.findUnique({
      where: { id: effectiveAdminId },
      select: { companyBalance: true },
    })
    if (!admin) {
      throw new Error('ADMIN_NOT_FOUND')
    }
    if (admin.companyBalance < totalCost) {
      throw new Error('INSUFFICIENT_BALANCE')
    }

    // Create transaction (Expense)
    const transaction = await tx.transaction.create({
      data: {
        amount: totalCost,
        type: 'EXPENSE',
        category: 'INGREDIENT_PURCHASE',
        description: `Ingredient purchase: ${items.map((i) => `${i.name} (${i.amount}${i.unit})`).join(', ')}`,
        adminId: effectiveAdminId,
      },
    })

    // Update company balance
    await tx.admin.update({
      where: { id: effectiveAdminId },
      data: { companyBalance: { decrement: totalCost } },
    })

    // Update warehouse stock
    for (const purchased of items) {
      const existing = await tx.warehouseItem.findUnique({
        where: { name: purchased.name },
      })

      if (!existing) {
        await tx.warehouseItem.create({
          data: {
            name: purchased.name,
            amount: purchased.amount,
            unit: normalizeUnit(purchased.unit),
            kcalPerGram:
              typeof purchased.kcalPerGram === 'number' && Number.isFinite(purchased.kcalPerGram)
                ? purchased.kcalPerGram
                : null,
            pricePerUnit: purchased.costPerUnit,
            priceUnit: normalizeUnit(purchased.unit),
          },
        })
        continue
      }

      const convertedAmount = convertAmount(purchased.amount, purchased.unit, existing.unit)
      if (convertedAmount === null) {
        throw new Error(`UNIT_MISMATCH:${purchased.name}:${existing.unit}:${purchased.unit}`)
      }

      await tx.warehouseItem.update({
        where: { name: purchased.name },
        data: {
          amount: { increment: convertedAmount },
          ...(typeof purchased.kcalPerGram === 'number' && Number.isFinite(purchased.kcalPerGram)
            ? { kcalPerGram: purchased.kcalPerGram }
            : {}),
          pricePerUnit: purchased.costPerUnit,
          priceUnit: normalizeUnit(purchased.unit),
          updatedAt: new Date(),
        },
      })
    }

    return transaction
  })

  // Audit log (best-effort)
  try {
    await db.actionLog.create({
      data: {
        adminId: actingUserId,
        action: 'BUY_INGREDIENTS',
        entityType: 'TRANSACTION',
        entityId: result.id,
        description: 'Bought ingredients',
      },
    })
  } catch {
    // ignore logging failures
  }

  return { transactionId: result.id, totalCost }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify a customer is within the user's scope.
 * Returns true if the customer exists and is accessible.
 */
export async function verifyCustomerInScope(
  customerId: string,
  groupAdminIds: string[] | null,
): Promise<boolean> {
  if (!groupAdminIds) return true // SUPER_ADMIN sees all

  const customer = await db.customer.findFirst({
    where: {
      id: customerId,
      createdBy: { in: groupAdminIds },
    },
    select: { id: true },
  })

  return !!customer
}

/**
 * Verify a staff member is within the user's scope.
 * Returns the staff member if found and accessible, null otherwise.
 */
export async function verifyStaffInScope(
  staffId: string,
  groupAdminIds: string[] | null,
  isSuperAdmin: boolean,
): Promise<{ id: string; name: string; role: string; createdBy: string | null } | null> {
  const staff = await db.admin.findUnique({
    where: { id: staffId },
    select: { id: true, name: true, role: true, createdBy: true },
  })

  if (!staff) return null

  if (isSuperAdmin) return staff

  if (!staff.createdBy || !groupAdminIds || !groupAdminIds.includes(staff.createdBy)) {
    return null
  }

  return staff
}
