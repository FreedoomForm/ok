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

export function calorieDistributionForOrders(resolved: readonly WarehouseOrder[]): Record<number, number> {
  const distribution: Record<number, number> = { 1200: 0, 1600: 0, 2000: 0, 2500: 0, 3000: 0 }
  for (const order of resolved) {
    const calories = order.calories || 2000
    const tier = calories <= 1400 ? 1200 : calories <= 1800 ? 1600 : calories <= 2200 ? 2000 : calories <= 2800 ? 2500 : 3000
    const quantity = Number(order.quantity)
    distribution[tier] += Number.isFinite(quantity) && quantity > 0 ? quantity : 1
  }
  return distribution
}

export function getEffectiveCalorieDistribution(
  orders: readonly WarehouseOrder[],
  clients: readonly Pick<WarehouseClient, 'id' | 'isActive' | 'contractPeriods'>[],
  date: string,
  disabledClientDates: ReadonlySet<string>,
  disabledOrderDates: ReadonlySet<string> = new Set(),
) {
  return calorieDistributionForOrders(resolveEffectiveOrdersForDate(orders, clients, date, disabledClientDates, disabledOrderDates))
}

export type EffectiveOrderResolver = {
  /** Effective orders for a date, cached per input identity (stable reference on repeated calls). */
  ordersForDate: (date: string) => WarehouseOrder[]
  /** Calorie tier distribution over the effective orders for a date. */
  calorieDistribution: (date: string) => Record<number, number>
}

// §16 performance row: stable memoized effective resolver. The workspace
// demand path resolves effective orders per date inside per-render date
// loops; rebuilding the client/period indexes on every call made each render
// O(dates × orders × clients). The resolver caches the per-date results
// keyed by the identity of its inputs: while the orders/clients/disabled-date
// references stay stable, repeated resolutions return the SAME cached array
// (stable identity) without recomputation; any input change rebuilds the cache.
export function createEffectiveOrderResolver(
  orders: readonly WarehouseOrder[],
  clients: readonly Pick<WarehouseClient, 'id' | 'isActive' | 'contractPeriods'>[],
  disabledClientDates: ReadonlySet<string> = new Set(),
  disabledOrderDates: ReadonlySet<string> = new Set(),
): EffectiveOrderResolver {
  let activeOrders = orders
  let activeClients = clients
  let activeDisabledClients = disabledClientDates
  let activeDisabledOrders = disabledOrderDates
  let cacheByDate = new Map<string, WarehouseOrder[]>()
  let distributionByDate = new Map<string, Record<number, number>>()

  function ensureInputsFresh(
    ordersInput: readonly WarehouseOrder[],
    clientsInput: readonly Pick<WarehouseClient, 'id' | 'isActive' | 'contractPeriods'>[],
    disabledClientsInput: ReadonlySet<string>,
    disabledOrdersInput: ReadonlySet<string>,
  ) {
    if (ordersInput !== activeOrders || clientsInput !== activeClients || disabledClientsInput !== activeDisabledClients || disabledOrdersInput !== activeDisabledOrders) {
      activeOrders = ordersInput
      activeClients = clientsInput
      activeDisabledClients = disabledClientsInput
      activeDisabledOrders = disabledOrdersInput
      cacheByDate = new Map()
      distributionByDate = new Map()
    }
  }

  function resolveFor(date: string): WarehouseOrder[] {
    ensureInputsFresh(orders, clients, disabledClientDates, disabledOrderDates)
    const cached = cacheByDate.get(date)
    if (cached) return cached
    const resolved = resolveEffectiveOrdersForDate(orders, clients, date, disabledClientDates, disabledOrderDates)
    cacheByDate.set(date, resolved)
    return resolved
  }

  return {
    ordersForDate(date) {
      return resolveFor(date)
    },
    calorieDistribution(date) {
      ensureInputsFresh(orders, clients, disabledClientDates, disabledOrderDates)
      const cachedDistribution = distributionByDate.get(date)
      if (cachedDistribution) return cachedDistribution
      const distribution = calorieDistributionForOrders(resolveFor(date))
      distributionByDate.set(date, distribution)
      return distribution
    },
  }
}
