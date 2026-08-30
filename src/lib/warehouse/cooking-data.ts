import type { CookingConsumptionRecord, CookingProvenance } from './cooking-consumption'
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
  id?: string
  dishes: Record<string, number>
  color: string | null
  cookedStats: Record<string, Record<string, number>>
  consumption: CookingConsumptionRecord[]
  provenanceLabels: Record<string, string>
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

function parsePlanDishes(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {}
  return Object.fromEntries(Object.entries(value).flatMap(([dishId, amount]) =>
    typeof amount === 'number' && Number.isFinite(amount) && amount >= 0 ? [[dishId, amount]] : [],
  ))
}

function parsePlanColor(value: unknown): string | null {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : null
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

function parseProvenance(value: unknown): CookingProvenance | undefined {
  if (!isRecord(value)) return undefined
  const parseIds = (candidate: unknown) => Array.isArray(candidate) ? candidate.filter((id): id is string => typeof id === 'string').slice(0, 200) : undefined
  const clientIds = parseIds(value.clientIds)
  const contractIds = parseIds(value.contractIds)
  const orderIds = parseIds(value.orderIds)
  const setId = typeof value.setId === 'string' || value.setId === null ? value.setId : undefined
  const groupCalories = typeof value.groupCalories === 'number' && Number.isInteger(value.groupCalories) && value.groupCalories >= 0 ? value.groupCalories : undefined
  if (!clientIds && !contractIds && !orderIds && setId === undefined && groupCalories === undefined) return undefined
  return { ...(clientIds ? { clientIds } : {}), ...(contractIds ? { contractIds } : {}), ...(orderIds ? { orderIds } : {}), ...(setId !== undefined ? { setId } : {}), ...(groupCalories !== undefined ? { groupCalories } : {}) }
}

function parseConsumption(value: unknown): CookingConsumptionRecord[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.dishId !== 'string' || typeof entry.calorie !== 'number' || !Number.isInteger(entry.calorie) || typeof entry.amount !== 'number' || !Number.isInteger(entry.amount) || !Array.isArray(entry.ingredients)) return []
    const ingredients = entry.ingredients.flatMap((ingredient) => {
      if (!isRecord(ingredient) || typeof ingredient.name !== 'string' || typeof ingredient.unit !== 'string' || typeof ingredient.amount !== 'number' || !Number.isFinite(ingredient.amount) || ingredient.amount < 0) return []
      return [{ name: ingredient.name, unit: ingredient.unit, amount: ingredient.amount }]
    })
    if (ingredients.length === 0 || entry.calorie < 0 || entry.amount < 1) return []
    const provenance = parseProvenance(entry.provenance)
    return [{ dishId: entry.dishId, calorie: entry.calorie, amount: entry.amount, ingredients, ...(provenance ? { provenance } : {}) }]
  })
}

function parseProvenanceLabels(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {}
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, label]) =>
      typeof label === 'string' && label.length > 0 && key.length > 0 && key.length <= 160 ? [[key, label]] : [],
    ),
  )
}

export function parseCookingPlanResponse(value: unknown): CookingPlanState {
  return {
    ...(isRecord(value) && typeof value.id === 'string' ? { id: value.id } : {}),
    dishes: isRecord(value) ? parsePlanDishes(value.dishes) : {},
    color: isRecord(value) ? parsePlanColor(value.color) : null,
    cookedStats: isRecord(value) ? parseCookedStats(value.cookedStats) : {},
    consumption: isRecord(value) ? parseConsumption(value.consumption) : [],
    provenanceLabels: isRecord(value) ? parseProvenanceLabels(value.provenanceLabels) : {},
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
