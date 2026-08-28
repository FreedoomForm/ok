import type { CookingConsumptionRecord } from './cooking-consumption'

type CookingDraftRecords = readonly CookingConsumptionRecord[]

function findRecordIndex(records: CookingDraftRecords, dishId: string, calorie: number): number {
  return records.findIndex((record) => record.dishId === dishId && record.calorie === calorie)
}

export function setCookingDraftIngredientAmount(
  records: CookingDraftRecords,
  dishId: string,
  calorie: number,
  ingredientIndex: number,
  amount: number,
): CookingConsumptionRecord[] {
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Cooking ingredient amount must be a finite non-negative number')
  const recordIndex = findRecordIndex(records, dishId, calorie)
  const record = recordIndex >= 0 ? records[recordIndex] : undefined
  if (!record || !Number.isInteger(ingredientIndex) || ingredientIndex < 0 || ingredientIndex >= record.ingredients.length) {
    return records.map((entry) => ({ ...entry, ingredients: entry.ingredients.map((ingredient) => ({ ...ingredient })) }))
  }

  return records.map((entry, index) => index !== recordIndex
    ? { ...entry, ingredients: entry.ingredients.map((ingredient) => ({ ...ingredient })) }
    : {
        ...entry,
        ingredients: entry.ingredients.map((ingredient, currentIndex) => currentIndex === ingredientIndex ? { ...ingredient, amount } : { ...ingredient }),
      })
}

export function adjustCookingDraftIngredient(
  records: CookingDraftRecords,
  dishId: string,
  calorie: number,
  ingredientIndex: number,
  delta: number,
): CookingConsumptionRecord[] {
  if (!Number.isFinite(delta)) throw new Error('Cooking ingredient delta must be finite')
  const record = records.find((entry) => entry.dishId === dishId && entry.calorie === calorie)
  const ingredient = record?.ingredients[ingredientIndex]
  if (!ingredient) return records.map((entry) => ({ ...entry, ingredients: entry.ingredients.map((item) => ({ ...item })) }))
  return setCookingDraftIngredientAmount(records, dishId, calorie, ingredientIndex, Math.max(0, ingredient.amount + delta))
}
