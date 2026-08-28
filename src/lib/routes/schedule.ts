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

export function normalizeRouteBoundary(value: unknown): { x: number; y: number; width: number; height: number } | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const values = ['x', 'y', 'width', 'height'].map((key) => raw[key])
  if (values.some((entry) => typeof entry !== 'number' || !Number.isFinite(entry))) return null
  const [x, y, width, height] = values as [number, number, number, number]
  if (x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 1 || y + height > 1) return null
  return { x, y, width, height }
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
