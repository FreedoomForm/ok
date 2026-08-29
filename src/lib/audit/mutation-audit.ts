export type MutationAuditResult = 'APPLIED' | 'SKIPPED_EXISTING' | 'DELETED'

export interface MutationAuditInput {
  result: MutationAuditResult
  correlationKey?: string | null
  extra?: Record<string, unknown> | null
}

const MUTATION_RESULTS: readonly MutationAuditResult[] = ['APPLIED', 'SKIPPED_EXISTING', 'DELETED']
const RESERVED_EXTRA_KEYS: readonly string[] = ['result', 'correlationKey']

/**
 * Universal ActionLog details serializer for lifecycle mutations. Every audit
 * row carries the command result, an optional correlation idempotency key and
 * verbatim domain extras that may not shadow the reserved contract keys.
 */
export function buildMutationAuditDetails(input: MutationAuditInput): string {
  if (!MUTATION_RESULTS.includes(input.result)) {
    throw new Error('INVALID_MUTATION_RESULT')
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
  const extra = input.extra ?? undefined
  if (extra !== undefined && extra !== null) {
    if (typeof extra !== 'object' || Array.isArray(extra)) {
      throw new Error('INVALID_MUTATION_EXTRA')
    }
    for (const reserved of RESERVED_EXTRA_KEYS) {
      if (Object.prototype.hasOwnProperty.call(extra, reserved)) {
        throw new Error('INVALID_MUTATION_EXTRA')
      }
    }
  }
  return JSON.stringify({ result: input.result, correlationKey, ...(extra ?? {}) })
}
