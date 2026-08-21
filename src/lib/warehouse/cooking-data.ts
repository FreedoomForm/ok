import {
  DEFAULT_DELIVERY_DAY_SCHEDULE,
  DELIVERY_DAY_KEYS,
  parseDeliveryDaySchedule,
  type DeliveryDaySchedule,
} from '@/lib/admin/auto-orders'

export type CookingDish = {
  id: string | number
  name: string
  mealType: string
  calorieMappings?: Record<string, string[]>
}

export type CookingPlanState = {
  cookedStats: Record<string, Record<string, number>>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseDish(value: unknown): CookingDish | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string' && typeof value.id !== 'number') return null
  if (typeof value.name !== 'string' || typeof value.mealType !== 'string') return null

  const calorieMappings = isRecord(value.calorieMappings)
    ? Object.fromEntries(
        Object.entries(value.calorieMappings).flatMap(([key, groups]) =>
          Array.isArray(groups) && groups.every((group) => typeof group === 'string')
            ? [[key, groups]]
            : [],
        ),
      )
    : undefined

  return {
    id: value.id,
    name: value.name,
    mealType: value.mealType,
    ...(calorieMappings && Object.keys(calorieMappings).length > 0 ? { calorieMappings } : {}),
  }
}

export function parseCookingMenuResponse(value: unknown): CookingDish[] {
  if (!isRecord(value) || !Array.isArray(value.dishes)) return []
  return value.dishes.flatMap((dish) => {
    const parsed = parseDish(dish)
    return parsed ? [parsed] : []
  })
}

function parseCookedStats(value: unknown): Record<string, Record<string, number>> {
  if (!isRecord(value)) return {}

  return Object.fromEntries(
    Object.entries(value).flatMap(([dishId, amounts]) => {
      if (!isRecord(amounts)) return []
      const parsedAmounts = Object.fromEntries(
        Object.entries(amounts).flatMap(([calorie, amount]) =>
          typeof amount === 'number' && Number.isFinite(amount) && amount >= 0
            ? [[calorie, amount]]
            : [],
        ),
      )
      return Object.keys(parsedAmounts).length > 0 ? [[dishId, parsedAmounts]] : []
    }),
  )
}

export function parseCookingPlanResponse(value: unknown): CookingPlanState {
  return {
    cookedStats: isRecord(value) ? parseCookedStats(value.cookedStats) : {},
  }
}

export function parseCookingDeliveryDays(value: unknown): DeliveryDaySchedule {
  if (typeof value === 'string' || value === null || value === undefined) {
    return parseDeliveryDaySchedule(value)
  }
  if (!isRecord(value)) return { ...DEFAULT_DELIVERY_DAY_SCHEDULE }

  return Object.fromEntries(
    DELIVERY_DAY_KEYS.map((key) => [key, value[key] === true]),
  ) as DeliveryDaySchedule
}
