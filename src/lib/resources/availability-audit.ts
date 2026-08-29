export type ResourceDateAuditResult = 'APPLIED' | 'DELETED'

export interface ResourceDateAuditInput {
  result: ResourceDateAuditResult
  resourceType: string
  date: string
  correlationKey?: string | null
}

const RESOURCE_DATE_RESULTS: readonly ResourceDateAuditResult[] = ['APPLIED', 'DELETED']
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

/**
 * Serializes the ActionLog details payload for a day-level availability
 * override write or reset, carrying the command result, the resource kind,
 * the overridden date and an optional correlation idempotency key.
 */
export function buildResourceDateAuditDetails(input: ResourceDateAuditInput): string {
  if (!RESOURCE_DATE_RESULTS.includes(input.result)) {
    throw new Error('INVALID_RESOURCE_DATE_RESULT')
  }
  const resourceType = typeof input.resourceType === 'string' ? input.resourceType.trim() : ''
  if (!resourceType) {
    throw new Error('INVALID_RESOURCE_TYPE')
  }
  const date = typeof input.date === 'string' ? input.date : ''
  if (!isValidIsoDate(date)) {
    throw new Error('INVALID_RESOURCE_DATE')
  }
  let correlationKey: string | null = null
  if (input.correlationKey !== undefined && input.correlationKey !== null) {
    const key = input.correlationKey.trim()
    if (key.length === 0) {
      correlationKey = null
    } else if (key.length < 8 || key.length > 120) {
      throw new Error('INVALID_CORRELATION_KEY')
    } else {
      correlationKey = key
    }
  }
  return JSON.stringify({
    result: input.result,
    resourceType,
    date,
    correlationKey,
  })
}
