import { parseCookingPlanResponse, type CookingPlanState } from '@/lib/warehouse/cooking-data'

export type WarehouseContractPeriod = {
  customerId: string
  startDate: string
  endDate: string
  isActive: boolean
  enabledWeekdays?: readonly string[]
  disabledDates?: readonly string[]
}

export type WarehouseClient = {
  id: string
  calories: number
  assignedSetId?: string | null
  isActive: boolean
  deliveryDays?: string | Record<string, boolean> | null
  contractPeriods?: readonly WarehouseContractPeriod[]
}

export type WarehouseOrder = {
  id?: string
  customerId: string
  quantity: number
  calories: number
  deliveryDate: string
}

export type WarehouseMenuSet = {
  id: string
  name: string
  menuNumber?: number
  calorieGroups: unknown
  isActive: boolean
}

export type CookingPlanAudit = Omit<CookingPlanState, 'color'> & {
  id?: string
  date: string
  menuNumber: number
  color?: string | null
  dishes: Record<string, number>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function parseContractPeriods(value: unknown, customerId: string): WarehouseContractPeriod[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((period) => {
    if (!isRecord(period) || typeof period.startDate !== 'string' || typeof period.endDate !== 'string') return []
    const startDate = period.startDate.slice(0, 10)
    const endDate = period.endDate.slice(0, 10)
    if (startDate.length !== 10 || endDate.length !== 10 || startDate > endDate) return []
    const enabledWeekdays = Array.isArray(period.enabledWeekdays)
      ? period.enabledWeekdays.filter((day): day is string => typeof day === 'string')
      : []
    const disabledDates = Array.isArray(period.disabledDates)
      ? period.disabledDates.filter((date): date is string => typeof date === 'string' && date.length >= 10).map((date) => date.slice(0, 10))
      : []
    return [{
      customerId: typeof period.customerId === 'string' ? period.customerId : customerId,
      startDate,
      endDate,
      isActive: period.isActive !== false,
      ...(enabledWeekdays.length > 0 ? { enabledWeekdays } : {}),
      ...(disabledDates.length > 0 ? { disabledDates } : {}),
    }]
  })
}

export function parseWarehouseClients(value: unknown): WarehouseClient[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((client) => {
    if (!isRecord(client) || typeof client.id !== 'string') return []
    const deliveryDays = client.deliveryDays
    const validDeliveryDays =
      typeof deliveryDays === 'string' || deliveryDays === null || isRecord(deliveryDays)
        ? deliveryDays
        : undefined
    const contractPeriods = parseContractPeriods(client.contractPeriods, client.id)
    return [{
      id: client.id,
      calories: finiteNumber(client.calories, 2000),
      ...(typeof client.assignedSetId === 'string' || client.assignedSetId === null
        ? { assignedSetId: client.assignedSetId }
        : {}),
      isActive: client.isActive !== false,
      ...(validDeliveryDays !== undefined ? { deliveryDays: validDeliveryDays as string | Record<string, boolean> | null } : {}),
      ...(contractPeriods.length > 0 ? { contractPeriods } : {}),
    }]
  })
}

export function parseWarehouseOrders(value: unknown): WarehouseOrder[] {
  const rows = isRecord(value) && Array.isArray(value.orders) ? value.orders : value
  if (!Array.isArray(rows)) return []
  return rows.flatMap((order) => {
    if (!isRecord(order) || typeof order.customerId !== 'string' || typeof order.deliveryDate !== 'string') return []
    return [{
      ...(typeof order.id === 'string' ? { id: order.id } : {}),
      customerId: order.customerId,
      quantity: Math.max(0, finiteNumber(order.quantity, 1)),
      calories: Math.max(0, finiteNumber(order.calories, 2000)),
      deliveryDate: order.deliveryDate,
    }]
  })
}

export function parseWarehouseSets(value: unknown): WarehouseMenuSet[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((set) => {
    if (!isRecord(set) || typeof set.id !== 'string' || typeof set.name !== 'string') return []
    return [{
      id: set.id,
      name: set.name,
      ...(typeof set.menuNumber === 'number' ? { menuNumber: set.menuNumber } : {}),
      calorieGroups: set.calorieGroups,
      isActive: set.isActive === true,
    }]
  })
}

export function parseCookingPlanAuditResponse(value: unknown): CookingPlanAudit[] {
  if (!isRecord(value) || !Array.isArray(value.plans)) return []
  return value.plans.flatMap((plan) => {
    if (!isRecord(plan) || typeof plan.date !== 'string' || typeof plan.menuNumber !== 'number') return []
    const parsedPlan = parseCookingPlanResponse(plan)
    return [{
      ...(typeof plan.id === 'string' ? { id: plan.id } : {}),
      date: plan.date,
      menuNumber: plan.menuNumber,
      ...(parsedPlan.color ? { color: parsedPlan.color } : {}),
      dishes: parsedPlan.dishes,
      cookedStats: parsedPlan.cookedStats,
      consumption: parsedPlan.consumption,
      provenanceLabels: parsedPlan.provenanceLabels,
    }]
  })
}
