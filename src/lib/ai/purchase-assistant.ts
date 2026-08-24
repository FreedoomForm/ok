import { z } from 'zod'

export type InventoryContextItem = {
  name: string
  unit: string
  pricePerUnit: number | null
}

export type GroundedPurchaseItem = {
  name: string
  amount: number
  unit: string
  costPerUnit: number
  totalCost: number
}

const suggestionSchema = z.object({
  items: z.array(z.object({
    name: z.string().trim().min(1).max(120),
    amount: z.number().finite().positive().max(1_000_000),
    unit: z.string().trim().min(1).max(32),
  })).max(200),
}).strict()

function canonical(value: string) {
  return value.trim().toLocaleLowerCase('ru-RU')
}

export function groundPurchaseSuggestion(input: unknown, inventory: readonly InventoryContextItem[]) {
  const parsed = suggestionSchema.safeParse(input)
  if (!parsed.success) return { items: [] as GroundedPurchaseItem[], rejected: ['invalid-json'] as string[] }
  const byName = new Map(inventory.map((item) => [canonical(item.name), item]))
  const rejected: string[] = []
  const items: GroundedPurchaseItem[] = []
  for (const item of parsed.data.items) {
    const known = byName.get(canonical(item.name))
    if (!known || known.pricePerUnit === null || !Number.isFinite(known.pricePerUnit) || known.pricePerUnit < 0) {
      rejected.push(item.name)
      continue
    }
    if (canonical(item.unit) !== canonical(known.unit)) {
      rejected.push(`${item.name}:unit`)
      continue
    }
    items.push({ name: known.name, amount: item.amount, unit: known.unit, costPerUnit: known.pricePerUnit, totalCost: item.amount * known.pricePerUnit })
  }
  return { items, rejected }
}
