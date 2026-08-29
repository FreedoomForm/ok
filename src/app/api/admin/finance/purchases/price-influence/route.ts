import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-utils'
import { buildMutationAuditDetails } from '@/lib/audit/mutation-audit'
import { canManageGlobalOperationalResource } from '@/lib/resources/global-policy'

const itemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  unit: z.string().trim().min(1).max(32),
  costPerUnit: z.number().finite().min(0).max(1_000_000_000),
  enabled: z.boolean(),
}).strict()

const requestSchema = z.object({ items: z.array(itemSchema).min(1).max(200) }).strict()

function canonical(value: string) {
  return value.trim().toLocaleLowerCase('ru-RU')
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !canManageGlobalOperationalResource(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const parsed = requestSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid price influence payload' }, { status: 400 })

    const result = await db.$transaction(async (tx) => {
      const inventory = await tx.warehouseItem.findMany({
        where: { isActive: true, deletedAt: null },
        select: { id: true, name: true, unit: true, pricePerUnit: true, priceUnit: true },
        orderBy: { name: 'asc' },
        take: 1000,
      })
      const updated: string[] = []
      const skipped: string[] = []
      const rejected: string[] = []
      for (const item of parsed.data.items) {
        if (!item.enabled) {
          skipped.push(item.name)
          continue
        }
        const match = inventory.find((candidate) => canonical(candidate.name) === canonical(item.name) && canonical(candidate.unit) === canonical(item.unit))
        if (!match) {
          rejected.push(item.name)
          continue
        }
        const changed = await tx.warehouseItem.update({ where: { id: match.id }, data: { pricePerUnit: item.costPerUnit, priceUnit: match.priceUnit || match.unit } })
        updated.push(changed.id)
        await tx.actionLog.create({
          data: {
            adminId: user.id,
            action: 'AI_PRICE_INFLUENCE',
            entityType: 'INGREDIENT',
            entityId: changed.id,
            details: buildMutationAuditDetails({ result: 'APPLIED', extra: { mutation: 'AI_PRICE_INFLUENCE', entity: 'INGREDIENT' } }),
            oldValues: JSON.stringify({ pricePerUnit: match.pricePerUnit, priceUnit: match.priceUnit || match.unit }),
            newValues: JSON.stringify({ pricePerUnit: changed.pricePerUnit, priceUnit: changed.priceUnit }),
            description: 'Explicitly confirmed AI price influence',
          },
        })
      }
      return { updated, skipped, rejected }
    })
    return NextResponse.json({ updated: result.updated.length, skipped: result.skipped.length, rejected: result.rejected })
  } catch (error) {
    console.error('Error applying AI price influence:', error)
    return NextResponse.json({ error: 'AI price influence failed' }, { status: 500 })
  }
}
