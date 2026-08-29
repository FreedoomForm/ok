export type ContractPeriodAssignment = {
  courierId: string | null
  startDate: Date
  endDate: Date | null
  enabledWeekdays: readonly string[]
  status: string
}

export type EffectiveAssignmentOrder = {
  courierId: string | null
  customerId: string
  deliveryDate: Date | null
}

export type CustomerScopedAssignment = ContractPeriodAssignment & { contractCustomerId: string }

const WEEKDAY_KEYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const

function availabilityDateKey(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

function coveringDateKey(period: ContractPeriodAssignment, dateKey: string): boolean {
  const startKey = availabilityDateKey(period.startDate)
  if (dateKey < startKey) return false
  if (period.endDate && dateKey > availabilityDateKey(period.endDate)) return false
  return true
}

function weekdayEnabled(period: ContractPeriodAssignment, date: Date): boolean {
  const weekday = WEEKDAY_KEYS[date.getDay()]
  const list = Array.isArray(period.enabledWeekdays) ? period.enabledWeekdays : []
  return list.includes(weekday)
}

/**
 * §6: the courier order list and card are built from the effective contract
 * period assignment instead of the stored default courier. For a dated order,
 * the latest-starting covering ENABLED period of the order's customer decides
 * which courier (if any) owns the delivery that day; undated legacy rows and
 * days without a covering period keep the stored assignment.
 */
export function resolveEffectiveCourierId(
  order: EffectiveAssignmentOrder,
  assignments: readonly CustomerScopedAssignment[],
): string | null {
  const relevant = assignments.filter((assignment) => assignment.contractCustomerId === order.customerId)
  if (!order.deliveryDate) return order.courierId
  const dateKey = availabilityDateKey(order.deliveryDate)
  const covering = relevant
    .filter((assignment) => assignment.status === 'ENABLED')
    .filter((assignment) => coveringDateKey(assignment, dateKey))
    .filter((assignment) => weekdayEnabled(assignment, order.deliveryDate as Date))
    .sort((left, right) => right.startDate.getTime() - left.startDate.getTime())
  const winner = covering[0]
  return winner ? winner.courierId : order.courierId
}
