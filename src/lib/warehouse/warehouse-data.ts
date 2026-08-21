import { parseCookingPlanResponse, type CookingPlanState } from '@/lib/warehouse/cooking-data'

export type WarehouseClient = {
  id: string
  calories: number
  assignedSetId?: string | null
  isActive: boolean
  deliveryDays?: string | Record<string, boolean> | null
}

export type WarehouseOrder = {
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

export type CookingPlanAudit = CookingPlanState & {
  date: string
  menuNumber: number
  dishes: Record<string, number>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
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
    return [{
      id: client.id,
      calories: finiteNumber(client.calories, 2000),
      ...(typeof client.assignedSetId === 'string' || client.assignedSetId === null
        ? { assignedSetId: client.assignedSetId }
        : {}),
      isActive: client.isActive !== false,
      ...(validDeliveryDays !== undefined ? { deliveryDays: validDeliveryDays as string | Record<string, boolean> | null } : {}),
    }]
  })
}

export function parseWarehouseOrders(value: unknown): WarehouseOrder[] {
  const rows = isRecord(value) && Array.isArray(value.orders) ? value.orders : value
  if (!Array.isArray(rows)) return []
  return rows.flatMap((order) => {
    if (!isRecord(order) || typeof order.customerId !== 'string' || typeof order.deliveryDate !== 'string') return []
    return [{
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

function parsePlanDishes(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {}
  return Object.fromEntries(
    Object.entries(value).flatMap(([dishId, quantity]) =>
      typeof quantity === 'number' && Number.isFinite(quantity) && quantity >= 0
        ? [[dishId, quantity]]
        : [],
    ),
  )
}

export function parseCookingPlanAuditResponse(value: unknown): CookingPlanAudit[] {
  if (!isRecord(value) || !Array.isArray(value.plans)) return []
  return value.plans.flatMap((plan) => {
    if (!isRecord(plan) || typeof plan.date !== 'string' || typeof plan.menuNumber !== 'number') return []
    const parsedPlan = parseCookingPlanResponse(plan)
    return [{
      date: plan.date,
      menuNumber: plan.menuNumber,
      dishes: parsePlanDishes(plan.dishes),
      cookedStats: parsedPlan.cookedStats,
    }]
  })
}
