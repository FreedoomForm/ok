export type CountedValue<T extends string | number | boolean | null> = {
  value: T
  count: number
}

export type DeliveryStatistics = {
  dailyCustomers: number
  evenDayCustomers: number
  oddDayCustomers: number
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
