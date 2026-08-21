export type SetGroupOption = {
  id: string
  name: string
  price: number | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toGroupArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (isRecord(value)) return Object.values(value)
  return []
}

function mapOptions(groups: unknown[]): SetGroupOption[] {
  const used = new Set<string>()
  return groups.map((group, index) => {
    const record = isRecord(group) ? group : {}
    const rawId = String(record.id ?? record.name ?? `group-${index + 1}`)
    const id = used.has(rawId) ? `${rawId}-${index + 1}` : rawId
    used.add(id)
    const rawPrice = record.price
    const numericPrice = typeof rawPrice === 'number' ? rawPrice : Number(rawPrice)
    return {
      id,
      name: String(record.name ?? '').trim() || String(index + 1),
      price: Number.isFinite(numericPrice) ? numericPrice : null,
    }
  })
}

export function getSetGroupOptions(value: unknown): SetGroupOption[] {
  if (Array.isArray(value)) return mapOptions(value)
  if (!isRecord(value)) return []

  const numericKeys = Object.keys(value)
    .filter((key) => /^\d+$/.test(key) && Number(key) > 0)
    .sort((left, right) => Number(left) - Number(right))
  const firstNumericKey = numericKeys.find((key) => toGroupArray(value[key]).length > 0)
  if (firstNumericKey) return mapOptions(toGroupArray(value[firstNumericKey]))

  const fallbackKey = Object.keys(value).find((key) => toGroupArray(value[key]).length > 0)
  return fallbackKey ? mapOptions(toGroupArray(value[fallbackKey])) : []
}
