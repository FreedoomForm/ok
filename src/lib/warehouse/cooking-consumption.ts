import type { CookIngredient } from './cook-json'

export type CookingProvenance = {
  clientIds?: string[]
  contractIds?: string[]
  orderIds?: string[]
  setId?: string | null
  groupCalories?: number | null
}

export type CookingConsumptionInput = {
  dishId: string
  calorie: number
  amount: number
  actualIngredients?: CookIngredient[]
  provenance?: CookingProvenance
}

export type CookingConsumptionRecord = CookingConsumptionInput & {
  ingredients: CookIngredient[]
}

function key(value: string): string {
  return value.trim().toLocaleLowerCase()
}

export function buildCookingConsumptionRecord(
  update: CookingConsumptionInput,
  recipeIngredients: CookIngredient[],
): CookingConsumptionRecord {
  const expected = new Map(recipeIngredients.map((ingredient) => [key(ingredient.name), ingredient]))
  const ingredients = update.actualIngredients?.map((ingredient) => {
    const recipe = expected.get(key(ingredient.name))
    if (!recipe || key(recipe.unit) !== key(ingredient.unit)) throw new Error(`Actual ingredient does not match recipe: ${ingredient.name}`)
    return { name: recipe.name, unit: recipe.unit, amount: ingredient.amount }
  }) ?? recipeIngredients.map((ingredient) => ({ ...ingredient, amount: ingredient.amount * update.amount }))

  if (ingredients.some((ingredient) => !Number.isFinite(ingredient.amount) || ingredient.amount < 0)) throw new Error('Actual ingredient amount is invalid')

  const provenance = update.provenance ? {
    ...(update.provenance.clientIds ? { clientIds: [...new Set(update.provenance.clientIds)] } : {}),
    ...(update.provenance.contractIds ? { contractIds: [...new Set(update.provenance.contractIds)] } : {}),
    ...(update.provenance.orderIds ? { orderIds: [...new Set(update.provenance.orderIds)] } : {}),
    ...(update.provenance.setId !== undefined ? { setId: update.provenance.setId } : {}),
    ...(update.provenance.groupCalories !== undefined ? { groupCalories: update.provenance.groupCalories } : {}),
  } : undefined

  return { ...update, ingredients, provenance }
}
