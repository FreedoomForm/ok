/**
 * Admin dashboard — pure helper functions (no React dependencies).
 */

/**
 * Convert a `Date` to a local ISO date string (`YYYY-MM-DD`).
 *
 * Uses local (calendar) date parts so that the result matches how
 * `deliveryDate` is stored on the server.  Do **not** use
 * `Date.prototype.toISOString()` — the UTC conversion can shift the
 * day when the timezone offset is negative.
 */
export function toLocalIsoDate(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Parse a `YYYY-MM-DD` string back into a `Date` using local time.
 *
 * Returns `null` if the string is malformed or represents an invalid
 * date (e.g. "2025-02-30").
 */
export function parseLocalIsoDate(iso: string): Date | null {
  const parts = iso.split('-')
  if (parts.length !== 3) return null
  const yyyy = Number(parts[0])
  const mm = Number(parts[1])
  const dd = Number(parts[2])
  if (!Number.isFinite(yyyy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return null
  const dt = new Date(yyyy, mm - 1, dd)
  dt.setHours(0, 0, 0, 0)
  return Number.isNaN(dt.getTime()) ? null : dt
}

/**
 * Get the BCP-47 locale tag for date formatting based on the app language.
 */
export function getDateLocale(language: string): string {
  if (language === 'ru') return 'ru-RU'
  if (language === 'uz') return 'uz-UZ'
  return 'en-US'
}

/**
 * Extract calorie group options from a set's `calorieGroups` or `groups` field.
 *
 * Handles both array and day-keyed object formats. Returns an array of
 * `{ id, name, price }` objects suitable for a select dropdown.
 */
export type GroupOption = { id: string; name: string; price: number | null }

export function getClientGroupOptions(clientAssignedSet: any): GroupOption[] {
  const groupsByDay = clientAssignedSet?.calorieGroups ?? clientAssignedSet?.groups
  if (!groupsByDay) return []

  const toGroupsArray = (value: any): any[] => {
    if (Array.isArray(value)) return value
    if (value && typeof value === 'object') return Object.values(value)
    return []
  }

  const parsePrice = (value: any): number | null => {
    const num = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(num) ? num : null
  }

  const mapOptions = (groups: any[]): GroupOption[] => {
    const used = new Set<string>()
    return groups.map((g: any, index: number) => {
      const rawId = String(g?.id ?? g?.name ?? `group-${index + 1}`)
      const id = used.has(rawId) ? `${rawId}-${index + 1}` : rawId
      used.add(id)
      return {
        id,
        name: String(g?.name ?? '').trim() || String(index + 1),
        price: parsePrice(g?.price),
      }
    })
  }

  if (Array.isArray(groupsByDay)) {
    return mapOptions(groupsByDay)
  }

  if (typeof groupsByDay !== 'object') return []

  const dayKeys = Object.keys(groupsByDay)
    .filter((k) => /^\d+$/.test(k) && Number(k) > 0)
    .sort((a, b) => Number(a) - Number(b))
  const firstDayWithGroups = dayKeys.find((k) => toGroupsArray((groupsByDay as any)[k]).length > 0)

  if (firstDayWithGroups) {
    return mapOptions(toGroupsArray((groupsByDay as any)[firstDayWithGroups]))
  }

  const fallbackKey = Object.keys(groupsByDay).find((k) => toGroupsArray((groupsByDay as any)[k]).length > 0)
  return fallbackKey ? mapOptions(toGroupsArray((groupsByDay as any)[fallbackKey])) : []
}
