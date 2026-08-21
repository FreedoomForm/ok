import { z } from 'zod'

const withdrawalAmountSchema = z.preprocess(
  (value) => {
    if (typeof value === 'string' && value.trim() !== '') return Number(value)
    return value
  },
  z.number().finite().positive().max(1_000_000_000_000)
)

export const courierWithdrawalSchema = z.object({ amount: withdrawalAmountSchema })

export function parseCourierWithdrawalRequest(value: unknown): { amount: number } | null {
  const parsed = courierWithdrawalSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}
