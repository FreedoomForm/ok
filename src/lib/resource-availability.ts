import type { ResourceKind } from '@prisma/client'
import { db } from '@/lib/db'
import { toAvailabilityDateKey } from '@/lib/resources/availability'

export async function getDisabledResourceDates(
  resourceType: ResourceKind,
  resourceIds: readonly string[],
  from: Date,
  to: Date,
): Promise<ReadonlyMap<string, ReadonlySet<string>>> {
  if (resourceIds.length === 0) return new Map()
  const rows = await db.resourceAvailability.findMany({
    where: {
      resourceType,
      resourceId: { in: [...new Set(resourceIds)] },
      date: { gte: from, lte: to },
      state: 'DISABLED',
    },
    select: { resourceId: true, date: true },
  })
  const result = new Map<string, Set<string>>()
  for (const row of rows) {
    const dates = result.get(row.resourceId) ?? new Set<string>()
    dates.add(toAvailabilityDateKey(row.date))
    result.set(row.resourceId, dates)
  }
  return result
}
