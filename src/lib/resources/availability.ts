export const RESOURCE_STATES = ['ENABLED', 'DISABLED'] as const
export type ResourceState = (typeof RESOURCE_STATES)[number]

export type ResourceAvailabilityOverride = {
  date: string
  state: ResourceState
}

export function normalizeIsoDate(value: string): string {
  const match = /^\d{4}-\d{2}-\d{2}/.exec(value)
  if (match) return match[0]
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) throw new Error('Invalid calendar date')
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateRange(start: string, end: string): string[] {
  const from = new Date(`${normalizeIsoDate(start)}T00:00:00`)
  const to = new Date(`${normalizeIsoDate(end)}T00:00:00`)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    throw new Error('Invalid calendar range')
  }
  const dates: string[] = []
  for (const cursor = new Date(from); cursor <= to; cursor.setDate(cursor.getDate() + 1)) {
    dates.push(normalizeIsoDate(cursor.toISOString()))
  }
  return dates
}

export function availabilityForDate(
  overrides: readonly ResourceAvailabilityOverride[],
  date: string,
): ResourceState {
  const normalizedDate = normalizeIsoDate(date)
  return overrides.find((override) => normalizeIsoDate(override.date) === normalizedDate)?.state ?? 'ENABLED'
}

export function buildAvailabilityCalendar(
  overrides: readonly ResourceAvailabilityOverride[],
  start: string,
  end: string,
): Array<{ date: string; state: ResourceState }> {
  return dateRange(start, end).map((date) => ({ date, state: availabilityForDate(overrides, date) }))
}
