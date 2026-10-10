// R14: universal enable/disable applies to a selected day OR the selected
// period. The range helpers stay pure so the bulk application is unit-tested.

export type AvailabilityState = 'ENABLED' | 'DISABLED'

export function toLocalIsoDateValue(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/** Inclusive day range [from..to] as local ISO dates (one entry per day). */
export function buildAvailabilityRangeDates(from: Date, to: Date): string[] {
  const start = new Date(from)
  start.setHours(0, 0, 0, 0)
  const end = new Date(to)
  end.setHours(0, 0, 0, 0)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return []
  if (end.getTime() < start.getTime()) return []

  const dates: string[] = []
  const cursor = new Date(start)
  while (cursor.getTime() <= end.getTime()) {
    dates.push(toLocalIsoDateValue(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

/** Fixed-size batches (≤ size) for bulk mutations, mirroring the reassign cap. */
export function chunkAvailabilityBatches<T>(items: readonly T[], size = 500): T[][] {
  const safeSize = Number.isInteger(size) && size > 0 ? size : 500
  const batches: T[][] = []
  for (let index = 0; index < items.length; index += safeSize) {
    batches.push(items.slice(index, index + safeSize))
  }
  return batches
}

export type AvailabilityItemState = 'ENABLED' | 'DISABLED'

/**
 * R15: enabled/disabled workspace modes narrow a resource list to the rows
 * whose current availability state matches the mode.
 */
export function filterResourcesByAvailabilityState<T>(
  items: readonly T[],
  mode: 'enabled' | 'disabled' | null,
  getState: (item: T) => AvailabilityItemState,
): T[] {
  if (mode !== 'enabled' && mode !== 'disabled') return [...items]
  const wanted = mode === 'enabled' ? 'ENABLED' : 'DISABLED'
  return items.filter((item) => getState(item) === wanted)
}
