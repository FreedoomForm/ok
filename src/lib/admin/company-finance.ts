import { Prisma } from '@prisma/client'
import { z } from 'zod'

export const companyHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(50),
  type: z.enum(['all', 'company', 'client']).default('all'),
  category: z.string().trim().min(1).max(64).optional(),
  search: z.string().trim().max(120).optional(),
})

export function buildCompanyHistoryWhere(
  adminId: string,
  type: z.infer<typeof companyHistoryQuerySchema>['type'],
  category?: string,
  search?: string,
  showDeleted = false,
): Prisma.TransactionWhereInput {
  return {
    adminId,
    deletedAt: showDeleted ? { not: null } : null,
    ...(type === 'company' ? { customerId: null } : {}),
    ...(type === 'client' ? { customerId: { not: null } } : {}),
    ...(category && category !== 'all' ? { category } : {}),
    ...(search ? { OR: [{ description: { contains: search, mode: 'insensitive' } }, { category: { contains: search, mode: 'insensitive' } }] } : {}),
  }
}
