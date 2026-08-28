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
