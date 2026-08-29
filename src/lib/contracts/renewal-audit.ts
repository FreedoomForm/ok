export type ContractRenewalAuditResult = 'CREATED' | 'SKIPPED_EXISTING'
export type ContractRenewalAuditSource = 'MANUAL' | 'SCHEDULER'

export interface ContractRenewalAuditInput {
  result: ContractRenewalAuditResult
  source: ContractRenewalAuditSource
  startDate: string
  endDate: string
  correlationKey?: string | null
}

const RENEWAL_RESULTS: readonly ContractRenewalAuditResult[] = ['CREATED', 'SKIPPED_EXISTING']
const RENEWAL_SOURCES: readonly ContractRenewalAuditSource[] = ['MANUAL', 'SCHEDULER']
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function normalizeCorrelationKey(raw: string | null | undefined): string | null {
  if (raw === undefined || raw === null) return null
  const key = raw.trim()
  if (key.length === 0) return null
  if (key.length < 8 || key.length > 120) {
    throw new Error('INVALID_CORRELATION_KEY')
  }
  return key
}

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

/**
 * Serializes the ActionLog details payload for a contract-period renewal so
 * every renewal row carries its command result, origin (manual or scheduler),
 * the created/skipped date range and an optional correlation idempotency key.
 */
export function buildContractRenewalAuditDetails(input: ContractRenewalAuditInput): string {
  if (!RENEWAL_RESULTS.includes(input.result)) {
    throw new Error('INVALID_RENEWAL_RESULT')
  }
  if (!RENEWAL_SOURCES.includes(input.source)) {
    throw new Error('INVALID_RENEWAL_SOURCE')
  }
  const startDate = typeof input.startDate === 'string' ? input.startDate : ''
  const endDate = typeof input.endDate === 'string' ? input.endDate : ''
  if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate) || startDate > endDate) {
    throw new Error('INVALID_RENEWAL_DATE_RANGE')
  }
  const correlationKey = normalizeCorrelationKey(input.correlationKey)
  return JSON.stringify({
    result: input.result,
    source: input.source,
    dateRange: { start: startDate, end: endDate },
    correlationKey,
  })
}
