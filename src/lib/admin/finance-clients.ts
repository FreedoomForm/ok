import { Prisma } from '@prisma/client'
import { z } from 'zod'

export const financeClientFilterSchema = z.enum(['all', 'positive', 'negative', 'zero']).default('all')

export function buildFinanceClientWhere(
  groupAdminIds: readonly string[] | null,
  filter: z.infer<typeof financeClientFilterSchema>,
  search: string,
  hasAsOf: boolean,
): Prisma.CustomerWhereInput {
  return {
    deletedAt: null,
    ...(groupAdminIds ? { createdBy: { in: [...groupAdminIds] } } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(!hasAsOf && filter !== 'all'
      ? { balance: filter === 'positive' ? { gt: 0 } : filter === 'negative' ? { lt: 0 } : { equals: 0 } }
      : {}),
  }
}

export function parseFinanceClientAsOf(raw: string | null) {
  if (!raw) return { asOf: null, hasAsOf: false as const }
  const asOf = new Date(raw)
  if (Number.isNaN(asOf.getTime())) return { error: 'Invalid asOf date' as const }
  return { asOf, hasAsOf: true as const }
}
