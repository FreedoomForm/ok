const HEX_COLOR = /^#[0-9a-f]{6}$/i

export function normalizeWeekStart(input: string | Date): Date | null {
  const date = input instanceof Date ? new Date(input) : new Date(input)
  if (!Number.isFinite(date.getTime())) return null
  date.setHours(0, 0, 0, 0)
  const day = date.getDay()
  const daysFromMonday = day === 0 ? 6 : day - 1
  date.setDate(date.getDate() - daysFromMonday)
  return date
}

export function normalizeRouteColor(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const color = value.trim().toLowerCase()
  return HEX_COLOR.test(color) ? color : null
}

export function normalizeRouteName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const name = value.trim().replace(/\s+/g, ' ')
  return name.length >= 1 && name.length <= 80 ? name : null
}

export function normalizeOrderIds(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 100) return null
  const ids = value.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 64)
  return ids.length === value.length && new Set(ids).size === ids.length ? ids : null
}

export function nextRouteDate(date: Date, direction: 1 | -1): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  next.setDate(next.getDate() + direction)
  return next
}
