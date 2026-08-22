import type { Prisma } from '@prisma/client'

export const customerAccessSelect = {
  id: true,
  isActive: true,
  calories: true,
  createdBy: true,
} satisfies Prisma.CustomerSelect

export type CustomerAccess = Prisma.CustomerGetPayload<{ select: typeof customerAccessSelect }>
