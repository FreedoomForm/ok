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
