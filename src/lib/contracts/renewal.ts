import { db } from '@/lib/db'
import { renewOneContractPeriodWithRetry } from './renewal-transaction'

export async function ensureContractRenewedForDate(contractId: string, targetDate: Date) {
  let created = 0
  for (let attempt = 0; attempt < 52; attempt += 1) {
    const didCreate = await renewOneContractPeriodWithRetry(db, contractId, targetDate)
    if (!didCreate) return created
    created += 1
  }
  return created
}
