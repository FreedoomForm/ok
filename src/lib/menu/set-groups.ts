import type { Prisma } from '@prisma/client'

export type SetDish = {
  dishId: string | number
  dishName?: string
  mealType?: string
  customIngredients?: unknown
}

export type SetGroup = {
  id?: string
  name?: string
  calories?: number
  price?: number | null
  dishes?: SetDish[]
}

export type SetGroupDocument = Record<string, SetGroup[]>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseDish(value: unknown): SetDish | null {
  if (!isRecord(value) || (typeof value.dishId !== 'string' && typeof value.dishId !== 'number')) return null
  return {
    dishId: value.dishId,
    ...(typeof value.dishName === 'string' ? { dishName: value.dishName } : {}),
    ...(typeof value.mealType === 'string' ? { mealType: value.mealType } : {}),
    ...(value.customIngredients !== undefined ? { customIngredients: value.customIngredients } : {}),
  }
}

function parseGroup(value: unknown): SetGroup | null {
  if (!isRecord(value)) return null
  const dishes = Array.isArray(value.dishes)
    ? value.dishes.flatMap((dish) => {
        const parsed = parseDish(dish)
        return parsed ? [parsed] : []
      })
    : undefined
  return {
    ...(typeof value.id === 'string' ? { id: value.id } : {}),
    ...(typeof value.name === 'string' ? { name: value.name } : {}),
    ...(typeof value.calories === 'number' && Number.isFinite(value.calories) ? { calories: value.calories } : {}),
    ...(typeof value.price === 'number' && Number.isFinite(value.price) ? { price: value.price } : value.price === null ? { price: null } : {}),
    ...(dishes ? { dishes } : {}),
  }
}

export function parseSetGroupDocument(value: Prisma.JsonValue | unknown): SetGroupDocument {
  if (!isRecord(value)) return {}
  return Object.fromEntries(
    Object.entries(value).flatMap(([day, groups]) => {
      if (!/^\d+$/.test(day) || !Array.isArray(groups)) return []
      const parsedGroups = groups.flatMap((group) => {
        const parsed = parseGroup(group)
        return parsed ? [parsed] : []
      })
      return parsedGroups.length > 0 ? [[day, parsedGroups]] : []
    }),
  )
}

export function getSetDayGroups(value: Prisma.JsonValue | unknown, menuNumber: number): SetGroup[] {
  return parseSetGroupDocument(value)[String(menuNumber)] ?? []
}

export function getSetDayDishes(value: Prisma.JsonValue | unknown, menuNumber: number): SetDish[] {
  return getSetDayGroups(value, menuNumber).flatMap((group) => group.dishes ?? [])
}
