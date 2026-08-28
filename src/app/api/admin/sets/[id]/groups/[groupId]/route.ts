import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'

type JsonGroup = {
  id?: unknown
  name?: unknown
  price?: unknown
  isActive?: unknown
  deletedAt?: unknown
  [key: string]: unknown
}

const updateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  price: z.number().finite().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
  deletedAt: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one group field is required')

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isGroup(value: unknown, groupId: string): value is JsonGroup {
  return isJsonRecord(value) && String(value.id ?? '') === groupId
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; groupId: string }> },
) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN'])) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id: setId, groupId } = await context.params
    const existingSet = await db.menuSet.findUnique({ where: { id: setId }, select: { id: true, adminId: true, calorieGroups: true } })
    if (!existingSet) return NextResponse.json({ error: 'Set not found' }, { status: 404 })
    if (user.role === 'MIDDLE_ADMIN' && existingSet.adminId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const parsed = updateSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid group update data' }, { status: 400 })
    if (!isJsonRecord(existingSet.calorieGroups)) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

    let previousGroup: JsonGroup | null = null
    let found = false
    const nextGroups: Record<string, unknown> = {}
    for (const [dayKey, dayValue] of Object.entries(existingSet.calorieGroups)) {
      if (!Array.isArray(dayValue)) {
        nextGroups[dayKey] = dayValue
        continue
      }
      nextGroups[dayKey] = dayValue.map((candidate) => {
        if (!isGroup(candidate, groupId)) return candidate
        found = true
        const currentGroup = candidate as JsonGroup
        previousGroup = { ...currentGroup }
        return {
          ...currentGroup,
          ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
          ...(parsed.data.price !== undefined ? { price: parsed.data.price } : {}),
          ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
          ...(parsed.data.deletedAt !== undefined ? { deletedAt: parsed.data.deletedAt ? new Date().toISOString() : null } : {}),
        }
      })
    }
    if (!found || !previousGroup) return NextResponse.json({ error: 'Group not found' }, { status: 404 })

    const updatedSet = await db.menuSet.update({
      where: { id: setId },
      data: { calorieGroups: nextGroups as Prisma.InputJsonValue },
      select: { id: true, calorieGroups: true },
    })
    const updatedGroup = Object.values(updatedSet.calorieGroups as Record<string, unknown>).flatMap((value) => Array.isArray(value) ? value : []).find((candidate) => isGroup(candidate, groupId))

    await db.actionLog.create({
      data: {
        adminId: user.id,
        action: parsed.data.deletedAt === true ? 'DELETE_GROUP' : parsed.data.deletedAt === false ? 'RESTORE_GROUP' : parsed.data.isActive === false ? 'DISABLE_GROUP' : parsed.data.isActive === true ? 'ENABLE_GROUP' : 'UPDATE_GROUP',
        entityType: 'GROUP',
        entityId: `${setId}:${groupId}`,
        oldValues: JSON.stringify(previousGroup),
        newValues: JSON.stringify(updatedGroup ?? null),
        details: JSON.stringify({ setId, groupId }),
      },
    })

    return NextResponse.json({ setId, groupId, group: updatedGroup ?? null })
  } catch (error) {
    console.error('Error updating group:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
