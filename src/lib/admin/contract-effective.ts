import { db } from '@/lib/db'
import { getDisabledResourceDates, getResourceAvailabilityStates } from '@/lib/resource-availability'
import { filterContractOverriddenOrderRows, resolveContractOverriddenDatesByCustomer } from '@/lib/admin/statistics'
import { isOrderSuppressedByContractCascade, type ContractDayOverride, type EffectiveContractInput, type EffectiveContractPeriodInput } from '@/lib/contracts/effective-period'
import { toAvailabilityDateKey } from '@/lib/resources/availability'

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

function isoDayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

/**
 * C5 / §3.3 (R18): the cascade layer of the contract availability engine.
 * Returns, per customer, the dates whose contract day is effectively disabled
 * — a DISABLED override inside a covering enabled period cascades onto every
 * later day until an explicit ENABLED override restarts the stretch. The
 * exact-day override map (pre-cascade) stays available through
 * loadContractOverriddenDatesByCustomer for surfaces that answer on stored
 * rows alone; this map answers on the spec's effective state.
 */
export async function loadContractCascadeDisabledDatesByCustomer(
  customerIds: readonly string[],
  from: Date,
  to: Date,
): Promise<Map<string, Set<string>>> {
  const ids = [...new Set(customerIds)]
  if (ids.length === 0) return new Map()
  const contracts = await db.contract.findMany({
    where: { customerId: { in: ids }, status: 'ENABLED' },
    select: {
      id: true,
      customerId: true,
      status: true,
      periods: {
        where: { status: 'ENABLED', startDate: { lte: to }, endDate: { gte: from } },
        select: { id: true, startDate: true, endDate: true, status: true, autoRenew: true, enabledWeekdays: true, disabledDates: true },
      },
    },
  })
  if (contracts.length === 0) return new Map()

  const contractIds = contracts.map((contract) => contract.id)
  const states = await getResourceAvailabilityStates('CONTRACT', contractIds, from, to)

  const contractsByCustomer = new Map<string, Array<{ contract: EffectiveContractInput; overrides: readonly ContractDayOverride[] }>>()
  for (const contract of contracts) {
    const overrideMap = states.get(contract.id)
    const overrides: ContractDayOverride[] = [...(overrideMap ?? new Map<string, 'ENABLED' | 'DISABLED'>()).entries()]
      .map(([date, state]) => ({ date, state }))
      .sort((left, right) => left.date.localeCompare(right.date))
    const effective: EffectiveContractInput = {
      status: contract.status === 'ENABLED' ? 'ENABLED' : 'DISABLED',
      periods: contract.periods.map((period): EffectiveContractPeriodInput => ({
        id: period.id,
        startDate: period.startDate.toISOString().slice(0, 10),
        endDate: period.endDate.toISOString().slice(0, 10),
        status: period.status === 'ENABLED' ? 'ENABLED' : period.status === 'DISABLED' ? 'DISABLED' : 'DELETED',
        autoRenew: period.autoRenew,
        enabledWeekdays: Array.isArray(period.enabledWeekdays) ? (period.enabledWeekdays as string[]) : [],
        disabledDates: Array.isArray(period.disabledDates) ? (period.disabledDates as string[]) : [],
      })),
    }
    const list = contractsByCustomer.get(contract.customerId) ?? []
    list.push({ contract: effective, overrides })
    contractsByCustomer.set(contract.customerId, list)
  }

  const result = new Map<string, Set<string>>()
  for (const [customerId, entries] of contractsByCustomer) {
    const disabled = new Set<string>()
    for (const cursor = isoDayBounds(from).start; cursor <= to; cursor.setDate(cursor.getDate() + 1)) {
      const dateKey = toAvailabilityDateKey(cursor)
      if (isOrderSuppressedByContractCascade(entries, dateKey)) disabled.add(dateKey)
    }
    if (disabled.size > 0) result.set(customerId, disabled)
  }
  return result
}

/**
 * R18 (write side): enabling an individual order writes the ORDER-level
 * ENABLED override for its date and pins the CONTRACT disabled state on the
 * neighbouring dates (previous and next, inside the covering enabled period),
 * so the single enabled order renders as a boundary-marked island instead of
 * silently re-enabling the whole stretch.
 */
export async function pinContractNeighborsForOrderEnable(orderId: string, dateKey: string): Promise<string[]> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, customerId: true, deliveryDate: true },
  })
  if (!order || !order.deliveryDate) return []
  const deliveryKey = toAvailabilityDateKey(order.deliveryDate)
  const day = new Date(`${deliveryKey}T00:00:00.000Z`)
  if (Number.isNaN(day.getTime())) return []

  const contracts = await db.contract.findMany({
    where: { customerId: order.customerId, status: 'ENABLED' },
    select: {
      id: true,
      periods: {
        where: { status: 'ENABLED' },
        select: { id: true, startDate: true, endDate: true },
      },
    },
  })
  const covering = contracts.find((contract) =>
    contract.periods.some((period) =>
      period.startDate.toISOString().slice(0, 10) <= deliveryKey &&
      deliveryKey <= period.endDate.toISOString().slice(0, 10),
    ),
  )
  if (!covering) return []
  const period = covering.periods.find(
    (candidate) =>
      candidate.startDate.toISOString().slice(0, 10) <= deliveryKey &&
      deliveryKey <= candidate.endDate.toISOString().slice(0, 10),
  )
  if (!period) return []

  const periodStart = period.startDate.toISOString().slice(0, 10)
  const periodEnd = period.endDate.toISOString().slice(0, 10)
  const neighbors: string[] = []
  const previous = new Date(day)
  previous.setUTCDate(previous.getUTCDate() - 1)
  const next = new Date(day)
  next.setUTCDate(next.getUTCDate() + 1)
  for (const neighbor of [previous, next]) {
    const key = neighbor.toISOString().slice(0, 10)
    if (key >= periodStart && key <= periodEnd) neighbors.push(key)
  }
  if (neighbors.length === 0) return []

  await db.$transaction(neighbors.map((neighborKey) => db.resourceAvailability.upsert({
    where: { resourceType_resourceId_date: { resourceType: 'CONTRACT', resourceId: covering.id, date: new Date(`${neighborKey}T00:00:00.000Z`) } },
    update: { state: 'DISABLED', reason: 'ORDER enable neighbor pin' },
    create: { resourceType: 'CONTRACT', resourceId: covering.id, date: new Date(`${neighborKey}T00:00:00.000Z`), state: 'DISABLED', reason: 'ORDER enable neighbor pin' },
  })))
  return neighbors
}

/**
 * R18: drops rows whose delivery date is effectively disabled by the contract
 * cascade, unless an ORDER-level ENABLED override re-includes the row's date.
 */
export async function filterRowsOnContractCascade<T extends { id: string; customerId: string; deliveryDate: Date | null }>(
  rows: readonly T[],
  from: Date,
  to: Date,
  orderEnabledDates: ReadonlyMap<string, ReadonlySet<string>> = new Map(),
): Promise<T[]> {
  const dated = rows.filter((row) => row.deliveryDate instanceof Date)
  if (dated.length === 0) return [...rows]
  const cascadeDisabled = await loadContractCascadeDisabledDatesByCustomer([...new Set(dated.map((row) => row.customerId))], from, to)
  if (cascadeDisabled.size === 0) return [...rows]
  return rows.filter((row) => {
    if (!(row.deliveryDate instanceof Date)) return true
    const dateKey = toAvailabilityDateKey(row.deliveryDate)
    const disabledForCustomer = cascadeDisabled.get(row.customerId)
    if (!disabledForCustomer?.has(dateKey)) return true
    return orderEnabledDates.get(row.id)?.has(dateKey) ?? false
  })
}
