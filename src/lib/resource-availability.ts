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

/**
 * C5 / R18: full override states per resource for the window. The cascade
 * engine needs both directions — a DISABLED row cascades forward, but a later
 * ENABLED row restarts the enabled stretch — so callers resolve the latest
 * decision per date instead of just the disabled set.
 */
export async function getResourceAvailabilityStates(
  resourceType: ResourceKind,
  resourceIds: readonly string[],
  from: Date,
  to: Date,
): Promise<ReadonlyMap<string, ReadonlyMap<string, 'ENABLED' | 'DISABLED'>>> {
  if (resourceIds.length === 0) return new Map()
  const rows = await db.resourceAvailability.findMany({
    where: {
      resourceType,
      resourceId: { in: [...new Set(resourceIds)] },
      date: { gte: from, lte: to },
    },
    select: { resourceId: true, date: true, state: true },
  })
  const result = new Map<string, Map<string, 'ENABLED' | 'DISABLED'>>()
  for (const row of rows) {
    if (row.state !== 'ENABLED' && row.state !== 'DISABLED') continue
    const dates = result.get(row.resourceId) ?? new Map<string, 'ENABLED' | 'DISABLED'>()
    dates.set(toAvailabilityDateKey(row.date), row.state)
    result.set(row.resourceId, dates)
  }
  return result
}
