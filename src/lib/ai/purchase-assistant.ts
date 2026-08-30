import { z } from 'zod'

export type InventoryContextItem = {
  name: string
  unit: string
  pricePerUnit: number | null
  id?: string
}

export type GroundedPurchaseConfidence = 'exact' | 'fuzzy'

export type GroundedPurchaseItem = {
  name: string
  amount: number
  unit: string
  costPerUnit: number
  totalCost: number
  // §12: every editable block names the matched inventory item and how
  // confidently the suggestion grounded to it, so human confirmation is
  // informed. Unresolvable ids keep null.
  matchedInventoryId: string | null
  confidence: GroundedPurchaseConfidence
  warning?: string
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
    if (!known) {
      // §12: grounding is case-insensitive but never guesses — a partial name
      // may match exactly one inventory item (fuzzy, warned); several
      // candidates stay rejected because the choice belongs to the human.
      const candidates = inventory.filter((candidate) => {
        const candidateName = canonical(candidate.name)
        const requested = canonical(item.name)
        return candidateName.includes(requested) || requested.includes(candidateName)
      })
      if (candidates.length === 1) {
        const fuzzy = candidates[0]
        if (fuzzy.pricePerUnit === null || !Number.isFinite(fuzzy.pricePerUnit) || fuzzy.pricePerUnit < 0) {
          rejected.push(item.name)
          continue
        }
        if (canonical(item.unit) !== canonical(fuzzy.unit)) {
          rejected.push(`${item.name}:unit`)
          continue
        }
        items.push({
          name: fuzzy.name, amount: item.amount, unit: fuzzy.unit, costPerUnit: fuzzy.pricePerUnit, totalCost: item.amount * fuzzy.pricePerUnit,
          matchedInventoryId: fuzzy.id ?? null, confidence: 'fuzzy', warning: 'fuzzy-match',
        })
        continue
      }
      rejected.push(candidates.length > 1 ? `${item.name}:ambiguous` : item.name)
      continue
    }
    if (known.pricePerUnit === null || !Number.isFinite(known.pricePerUnit) || known.pricePerUnit < 0) {
      rejected.push(item.name)
      continue
    }
    if (canonical(item.unit) !== canonical(known.unit)) {
      rejected.push(`${item.name}:unit`)
      continue
    }
    items.push({
      name: known.name, amount: item.amount, unit: known.unit, costPerUnit: known.pricePerUnit, totalCost: item.amount * known.pricePerUnit,
      matchedInventoryId: known.id ?? null, confidence: 'exact',
    })
  }
  return { items, rejected }
}
