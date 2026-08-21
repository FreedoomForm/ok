export type DishDraft = {
  id: string | number
  name?: string
  mealType?: string
  ingredients?: unknown
  mealIndex?: number | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseDishDraft(value: unknown): DishDraft | null {
  if (!isRecord(value) || (typeof value.id !== 'string' && typeof value.id !== 'number')) return null
  return {
    id: value.id,
    ...(typeof value.name === 'string' ? { name: value.name } : {}),
    ...(typeof value.mealType === 'string' ? { mealType: value.mealType } : {}),
    ...(typeof value.ingredients !== 'undefined' ? { ingredients: value.ingredients } : {}),
    ...(typeof value.mealIndex === 'number' || value.mealIndex === null ? { mealIndex: value.mealIndex } : {}),
  }
}
