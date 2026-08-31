import { toAvailabilityDateKey } from '@/lib/resources/availability'
import { filterOrdersByEffectiveContractPeriods, type EffectiveContractPeriod } from '@/lib/warehouse/effective-demand'

export type RouteAvailabilityStop = {
  id?: string
  order: {
    customerId: string
    deliveryDate?: Date | string | null
    contractPeriods?: readonly EffectiveContractPeriod[]
  }
}

export function filterEffectiveRouteStops<T extends RouteAvailabilityStop>(
  stops: readonly T[],
  disabledDates: ReadonlyMap<string, ReadonlySet<string>>,
  disabledRouteDates: ReadonlySet<string> = new Set(),
  disabledStopDates: ReadonlyMap<string, ReadonlySet<string>> = new Map(),
  contractOverriddenDates: ReadonlyMap<string, ReadonlySet<string>> = new Map(),
): T[] {
  return stops.filter((stop) => {
    if (!stop.order.deliveryDate) return true
    const dateKey = toAvailabilityDateKey(stop.order.deliveryDate)
    const contractPeriods = stop.order.contractPeriods
    const contractEnabled = contractPeriods === undefined || contractPeriods.length === 0 || filterOrdersByEffectiveContractPeriods([{
      customerId: stop.order.customerId,
      quantity: 1,
      calories: 0,
      deliveryDate: dateKey,
    }], contractPeriods).length > 0
    // §16 availability-graph CONTRACT-level day overrides: when every enabled
    // contract of the customer carries the override, the contract-derived
    // demand is suppressed for that day exactly like the scheduler paths honor.
    const contractOverridden = contractOverriddenDates.get(stop.order.customerId)?.has(dateKey) ?? false
    return !disabledRouteDates.has(dateKey) && !disabledDates.get(stop.order.customerId)?.has(dateKey) && !disabledStopDates.get(stop.id ?? '')?.has(dateKey) && contractEnabled && !contractOverridden
  })
}
