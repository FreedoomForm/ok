import type { WarehouseClient, WarehouseOrder } from './warehouse-data'

export type EffectiveContractPeriod = {
  customerId: string
  startDate: string
  endDate: string
  isActive: boolean
  enabledWeekdays?: readonly string[]
  disabledDates?: readonly string[]
}

export const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

export function filterOrdersByEffectiveContractPeriods(
  orders: readonly WarehouseOrder[],
  periods: readonly EffectiveContractPeriod[],
): WarehouseOrder[] {
  const activePeriods = periods.filter((period) => period.isActive && period.startDate <= period.endDate)
  return orders.filter((order) => {
    const date = order.deliveryDate.slice(0, 10)
    return activePeriods.some((period) =>
      period.customerId === order.customerId &&
      period.startDate <= date &&
      date <= period.endDate &&
      (!(period.enabledWeekdays?.length) || period.enabledWeekdays.includes(WEEKDAYS[new Date(`${date}T00:00:00.000Z`).getUTCDay()])) &&
      !(period.disabledDates ?? []).includes(date),
    )
  })
}

export function resolveEffectiveOrdersForDate(
  orders: readonly WarehouseOrder[],
  clients: readonly Pick<WarehouseClient, 'id' | 'isActive' | 'contractPeriods'>[],
  date: string,
  disabledClientDates: ReadonlySet<string>,
  disabledOrderDates: ReadonlySet<string> = new Set(),
) {
  const activeClients = new Map(clients.filter((client) => client.isActive).map((client) => [client.id, client]))
  const periodsByCustomer = new Map(clients.flatMap((client) => client.contractPeriods ? [[client.id, client.contractPeriods] as const] : []))
  return orders.filter((order) => {
    const customerPeriods = periodsByCustomer.get(order.customerId)
    const contractEnabled = customerPeriods === undefined || filterOrdersByEffectiveContractPeriods([order], customerPeriods).length > 0
    return order.deliveryDate.slice(0, 10) === date && !disabledClientDates.has(`${order.customerId}:${date}`) && !disabledOrderDates.has(`${order.id}:${date}`) && activeClients.has(order.customerId) && contractEnabled
  })
}

export function getEffectiveCalorieDistribution(
  orders: readonly WarehouseOrder[],
  clients: readonly Pick<WarehouseClient, 'id' | 'isActive' | 'contractPeriods'>[],
  date: string,
  disabledClientDates: ReadonlySet<string>,
  disabledOrderDates: ReadonlySet<string> = new Set(),
) {
  const distribution: Record<number, number> = { 1200: 0, 1600: 0, 2000: 0, 2500: 0, 3000: 0 }
  for (const order of resolveEffectiveOrdersForDate(orders, clients, date, disabledClientDates, disabledOrderDates)) {
    const calories = order.calories || 2000
    const tier = calories <= 1400 ? 1200 : calories <= 1800 ? 1600 : calories <= 2200 ? 2000 : calories <= 2800 ? 2500 : 3000
    const quantity = Number(order.quantity)
    distribution[tier] += Number.isFinite(quantity) && quantity > 0 ? quantity : 1
  }
  return distribution
}
