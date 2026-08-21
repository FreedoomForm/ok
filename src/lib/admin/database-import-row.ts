export function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function coerceImportValue(value: string): unknown {
  const trimmed = value.trim()
  if (trimmed === '') return undefined

  if (trimmed.toLowerCase() === 'true') return true
  if (trimmed.toLowerCase() === 'false') return false

  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed)
    } catch {
      // Keep the original cell when snapshot JSON is malformed.
    }
  }

  const asNumber = Number(trimmed)
  if (!Number.isNaN(asNumber)) return asNumber

  const asDate = new Date(trimmed)
  if (!Number.isNaN(asDate.getTime()) && trimmed.includes('-') && trimmed.length >= 10) return asDate

  return value
}

export function toStringCell(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function buildRowData(row: Record<string, string>): Record<string, unknown> {
  const parsed: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue
    parsed[key] = coerceImportValue(value)
  }
  return parsed
}
