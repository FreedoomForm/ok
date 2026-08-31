import { db } from '@/lib/db'
import { getDisabledResourceDates } from '@/lib/resource-availability'
import { filterContractOverriddenOrderRows, resolveContractOverriddenDatesByCustomer } from '@/lib/admin/statistics'

/**
 * Availability-graph contract-level day overrides, resolved per customer: a
 * date suppresses a customer's contract-derived demand only when EVERY enabled
 * contract of that customer carries the override (disabled contracts are moot).
 * Shared by every demand surface so the scheduler paths, statistics, live map,
 * courier views and client views answer identically.
 */
export async function loadContractOverriddenDatesByCustomer(customerIds: readonly string[], from: Date, to: Date): Promise<Map<string, Set<string>>> {
  const ids = [...new Set(customerIds)]
  if (ids.length === 0) return new Map()
  const contracts = await db.contract.findMany({
    where: { customerId: { in: ids } },
    select: { id: true, customerId: true, status: true },
  })
  if (contracts.length === 0) return new Map()
  const disabledContractDates = await getDisabledResourceDates('CONTRACT', contracts.map((contract) => contract.id), from, to)
  return resolveContractOverriddenDatesByCustomer(
    contracts.map((contract) => ({ id: contract.id, customerId: contract.customerId, isEnabled: contract.status === 'ENABLED' })),
    disabledContractDates,
  )
}

/** Chains the contract-level suppression filter onto already client-filtered rows. */
export async function filterRowsOnContractOverrides<T extends { customerId: string; deliveryDate: Date | null }>(rows: readonly T[], from: Date, to: Date): Promise<T[]> {
  if (rows.length === 0) return [...rows]
  const overriddenDatesByCustomer = await loadContractOverriddenDatesByCustomer(rows.map((row) => row.customerId), from, to)
  if (overriddenDatesByCustomer.size === 0) return [...rows]
  return filterContractOverriddenOrderRows(rows, overriddenDatesByCustomer)
}
