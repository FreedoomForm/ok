import { toAvailabilityDateKey } from '@/lib/resources/availability'
import { safeJsonParse } from '@/lib/safe-json'

export type CountedValue<T extends string | number | boolean | null> = {
  value: T
  count: number
}

export type DeliveryStatistics = {
  dailyCustomers: number
  evenDayCustomers: number
  oddDayCustomers: number
}
export type DeliveryCadenceRow = {
  customer?: { deliveryDays?: string | null } | null
}
export function buildDeliveryStatistics(rows: readonly DeliveryCadenceRow[]): DeliveryStatistics {
  return rows.reduce((counts, row) => {
    const deliveryDays = row.customer?.deliveryDays ?? null
    if (!deliveryDays) return counts
    const days = safeJsonParse<Record<string, boolean>>(deliveryDays, {})
    const selectedDays = Object.values(days).filter(Boolean).length
    if (selectedDays === 7) counts.dailyCustomers += 1
    else if (selectedDays >= 3 && selectedDays <= 4) counts.evenDayCustomers += 1
    return counts
  }, { dailyCustomers: 0, evenDayCustomers: 0, oddDayCustomers: 0 })
}

export type OrderStatisticsInput = {
  statusCounts: CountedValue<string>[]
  prepaidCounts: CountedValue<boolean>[]
  paymentMethodCounts: CountedValue<string | null>[]
  calorieCounts: CountedValue<number>[]
  quantityCounts: CountedValue<number>[]
  specialPreferenceCustomers: number
  delivery: DeliveryStatistics
}

export function filterEffectiveOrderRows<T extends { customerId: string; deliveryDate: Date | null }>(rows: readonly T[], disabledDates: ReadonlyMap<string, ReadonlySet<string>>): T[] {
  return rows.filter((row) => !row.deliveryDate || !disabledDates.get(row.customerId)?.has(toAvailabilityDateKey(row.deliveryDate)))
}

export type StatisticsContractRow = {
  id: string
  customerId: string
  isEnabled: boolean
}

/**
 * Resolves the dates on which a customer's contract-derived demand is fully suppressed:
 * for each customer with at least one enabled contract, a date is suppressed only when
 * EVERY enabled contract of that customer carries a CONTRACT-level day override on it.
 * Disabled or deleted contracts never contribute suppression — their overrides are moot.
 */
export function resolveContractOverriddenDatesByCustomer(
  contracts: readonly StatisticsContractRow[],
  disabledDatesByContractId: ReadonlyMap<string, ReadonlySet<string>>,
): Map<string, Set<string>> {
  const enabledContractsByCustomer = new Map<string, string[]>()
  for (const contract of contracts) {
    if (!contract.isEnabled) continue
    const ids = enabledContractsByCustomer.get(contract.customerId) ?? []
    ids.push(contract.id)
    enabledContractsByCustomer.set(contract.customerId, ids)
  }

  const result = new Map<string, Set<string>>()
  for (const [customerId, contractIds] of enabledContractsByCustomer) {
    let intersection: Set<string> | null = null
    for (const contractId of contractIds) {
      const overrides = disabledDatesByContractId.get(contractId)
      if (!overrides || overrides.size === 0) {
        intersection = null
        break
      }
      if (intersection === null) {
        intersection = new Set(overrides)
        continue
      }
      intersection = new Set([...intersection].filter((dateKey) => overrides.has(dateKey)))
      if (intersection.size === 0) break
    }
    if (intersection && intersection.size > 0) {
      result.set(customerId, intersection)
    }
  }
  return result
}

export function filterContractOverriddenOrderRows<T extends { customerId: string; deliveryDate: Date | null }>(rows: readonly T[], overriddenDatesByCustomer: ReadonlyMap<string, ReadonlySet<string>>): T[] {
  return rows.filter((row) => !row.deliveryDate || !overriddenDatesByCustomer.get(row.customerId)?.has(toAvailabilityDateKey(row.deliveryDate)))
}

export const STATISTICS_MAX_RANGE_DAYS = 62

export type StatisticsRange =
  | { kind: 'all' }
  | { kind: 'range'; start: Date; end: Date }

export type StatisticsRangeParams = {
  date?: string | null
  from?: string | null
  to?: string | null
}

function parseUtcCalendarDay(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null
  return date
}

export function resolveStatisticsRange(params: StatisticsRangeParams): StatisticsRange | 'invalid' {
  const hasDate = typeof params.date === 'string' && params.date.trim() !== ''
  const hasFrom = typeof params.from === 'string' && params.from.trim() !== ''
  const hasTo = typeof params.to === 'string' && params.to.trim() !== ''

  if (!hasDate && !hasFrom && !hasTo) return { kind: 'all' }

  let from: Date | null = null
  let to: Date | null = null

  if (hasDate) {
    if (hasFrom || hasTo) return 'invalid'
    from = parseUtcCalendarDay(params.date as string)
    to = from
  } else {
    if (!hasFrom) return 'invalid'
    from = parseUtcCalendarDay(params.from as string)
    to = hasTo ? parseUtcCalendarDay(params.to as string) : from
  }

  if (!from || !to) return 'invalid'
  if (to.getTime() < from.getTime()) return 'invalid'

  const daySpan = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1
  if (daySpan > STATISTICS_MAX_RANGE_DAYS) return 'invalid'

  return {
    kind: 'range',
    start: new Date(from.getTime()),
    end: new Date(to.getTime() + 86_400_000 - 1),
  }
}

function countValue<T extends string | number | boolean | null>(rows: CountedValue<T>[], value: T): number {
  return rows.find((row) => row.value === value)?.count ?? 0
}

export function buildOrderStatistics(input: OrderStatisticsInput) {
  return {
    successfulOrders: countValue(input.statusCounts, 'DELIVERED'),
    failedOrders: countValue(input.statusCounts, 'FAILED'),
    pendingOrders: countValue(input.statusCounts, 'PENDING'),
    inDeliveryOrders: countValue(input.statusCounts, 'IN_DELIVERY'),
    pausedOrders: countValue(input.statusCounts, 'PAUSED'),
    prepaidOrders: countValue(input.prepaidCounts, true),
    unpaidOrders: countValue(input.prepaidCounts, false),
    cardOrders: countValue(input.paymentMethodCounts, 'CARD'),
    cashOrders: countValue(input.paymentMethodCounts, 'CASH'),
    dailyCustomers: input.delivery.dailyCustomers,
    evenDayCustomers: input.delivery.evenDayCustomers,
    oddDayCustomers: input.delivery.oddDayCustomers,
    specialPreferenceCustomers: input.specialPreferenceCustomers,
    orders1200: countValue(input.calorieCounts, 1200),
    orders1600: countValue(input.calorieCounts, 1600),
    orders2000: countValue(input.calorieCounts, 2000),
    orders2500: countValue(input.calorieCounts, 2500),
    orders3000: countValue(input.calorieCounts, 3000),
    singleItemOrders: countValue(input.quantityCounts, 1),
    multiItemOrders: input.quantityCounts
      .filter((row) => row.value >= 2)
      .reduce((total, row) => total + row.count, 0),
  }
}
