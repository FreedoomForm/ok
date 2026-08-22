const REDACTED_VALUE = '[REDACTED]'
const SENSITIVE_KEYS = new Set(['password', 'refresh_token', 'access_token', 'id_token', 'session_state'])

type SnapshotRecord = Record<string, unknown>

function serializeValue(value: unknown, key: string): string {
  if (SENSITIVE_KEYS.has(key)) return REDACTED_VALUE
  if (value == null) return ''
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function toSnapshotRows<T extends SnapshotRecord>(records: T[]): Record<string, string>[] {
  return records.map((record) => {
    const row: Record<string, string> = {}
    for (const [key, value] of Object.entries(record)) {
      row[key] = serializeValue(value, key)
    }
    return row
  })
}
