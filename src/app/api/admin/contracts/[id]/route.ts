import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'

const patchSchema = z.object({
  status: z.enum(['ENABLED', 'DISABLED', 'DELETED']).optional(),
  paid: z.boolean().optional(),
  autoRenew: z.boolean().optional(),
  period: z.object({
    id: z.string().min(1),
    status: z.enum(['ENABLED', 'DISABLED', 'DELETED']).optional(),
    paid: z.boolean().optional(),
    autoRenew: z.boolean().optional(),
    courierId: z.string().min(1).nullable().optional(),
    enabledWeekdays: z.array(z.string()).optional(),
    disabledDates: z.array(z.string()).optional(),
  }).optional(),
})

async function getScope(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) return null
  return { user, groupAdminIds: await getGroupAdminIds(user) }
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const scope = await getScope(request)
    if (!scope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await context.params
    const contract = await db.contract.findFirst({
      where: { id, ...(scope.groupAdminIds ? { ownerAdminId: { in: scope.groupAdminIds } } : {}) },
      include: { customer: true, courier: true, periods: { orderBy: { startDate: 'asc' }, include: { courier: true } } },
    })
    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    return NextResponse.json({ contract })
  } catch (error) {
    console.error('Error reading contract:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const scope = await getScope(request)
    if (!scope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await context.params
    const parsed = patchSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid contract payload' }, { status: 400 })
    const current = await db.contract.findFirst({ where: { id, ...(scope.groupAdminIds ? { ownerAdminId: { in: scope.groupAdminIds } } : {}) }, select: { id: true } })
    if (!current) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    const { period, ...contractData } = parsed.data
    const updated = await db.$transaction(async (tx) => {
      if (Object.keys(contractData).length > 0) await tx.contract.update({ where: { id }, data: contractData })
      if (period) {
        await tx.contractPeriod.update({
          where: { id: period.id },
          data: {
            ...(period.status ? { status: period.status } : {}),
            ...(period.paid !== undefined ? { paid: period.paid } : {}),
            ...(period.autoRenew !== undefined ? { autoRenew: period.autoRenew } : {}),
            ...(period.courierId !== undefined ? { courierId: period.courierId } : {}),
            ...(period.enabledWeekdays ? { enabledWeekdays: period.enabledWeekdays } : {}),
            ...(period.disabledDates ? { disabledDates: period.disabledDates } : {}),
          },
        })
      }
      return tx.contract.findUnique({ where: { id }, include: { periods: { orderBy: { startDate: 'asc' } } } })
    })
    return NextResponse.json({ contract: updated })
  } catch (error) {
    console.error('Error updating contract:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
