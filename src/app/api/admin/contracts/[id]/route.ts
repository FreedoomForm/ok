import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'
import { buildContractAssignmentNotification, createCourierAssignmentNotification } from '@/lib/chat/notifications'

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
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
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
    const current = await db.contract.findFirst({
      where: { id, ...(scope.groupAdminIds ? { ownerAdminId: { in: scope.groupAdminIds } } : {}) },
      select: { id: true, status: true, paid: true, autoRenew: true, periods: { select: { id: true, status: true, paid: true, autoRenew: true, courierId: true, color: true, startDate: true, endDate: true, enabledWeekdays: true } } },
    })
    if (!current) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    const { period, ...contractData } = parsed.data
    const currentPeriod = period ? current.periods.find((candidate) => candidate.id === period.id) : null
    if (period && !currentPeriod) return NextResponse.json({ error: 'Contract period not found' }, { status: 404 })
    if (period?.courierId) {
      const courier = await db.admin.findFirst({ where: { id: period.courierId, role: 'COURIER', isActive: true, ...(scope.groupAdminIds ? { createdBy: { in: scope.groupAdminIds } } : {}) }, select: { id: true } })
      if (!courier) return NextResponse.json({ error: 'Courier not found or disabled' }, { status: 400 })
    }
    const updated = await db.$transaction(async (tx) => {
      if (Object.keys(contractData).length > 0) await tx.contract.update({ where: { id }, data: contractData })
      if (period) {
        await tx.contractPeriod.update({
          where: { id: period.id, contractId: id },
          data: {
            ...(period.status ? { status: period.status } : {}),
            ...(period.paid !== undefined ? { paid: period.paid } : {}),
            ...(period.autoRenew !== undefined ? { autoRenew: period.autoRenew } : {}),
            ...(period.courierId !== undefined ? { courierId: period.courierId } : {}),
            ...(period.color !== undefined ? { color: period.color } : {}),
            ...(period.enabledWeekdays ? { enabledWeekdays: period.enabledWeekdays } : {}),
            ...(period.disabledDates ? { disabledDates: period.disabledDates } : {}),
          },
        })
      }
      const updated = await tx.contract.findUnique({ where: { id }, include: { periods: { orderBy: { startDate: 'asc' } } } })
      const updatedPeriod = period ? updated?.periods.find((candidate) => candidate.id === period.id) : null
      if (period?.courierId && period.courierId !== currentPeriod?.courierId && updatedPeriod) {
        const courier = await tx.admin.findUnique({ where: { id: period.courierId }, select: { name: true } })
        const weekdays = Array.isArray(updatedPeriod.enabledWeekdays) ? updatedPeriod.enabledWeekdays.filter((value): value is string => typeof value === 'string') : []
        await createCourierAssignmentNotification(tx, {
          actorAdminId: scope.user.id,
          courierId: period.courierId,
          content: buildContractAssignmentNotification({ courierName: courier?.name ?? 'курьер', contractId: id, dateRange: `${updatedPeriod.startDate.toISOString().slice(0, 10)} — ${updatedPeriod.endDate.toISOString().slice(0, 10)}`, weekdays, orderNumbers: [], status: updatedPeriod.status }),
        })
      }
      return updated
    })
    try {
      await db.actionLog.create({
        data: {
          adminId: scope.user.id,
          action: 'UPDATE_CONTRACT',
          entityType: 'CONTRACT',
          entityId: id,
          oldValues: JSON.stringify({ status: current.status, paid: current.paid, autoRenew: current.autoRenew, period: currentPeriod }),
          newValues: JSON.stringify({ status: updated?.status, paid: updated?.paid, autoRenew: updated?.autoRenew, period: period ?? null }),
          description: `Updated contract ${id}`,
        },
      })
    } catch (logError) {
      console.error('Failed to log contract update:', logError)
    }
    return NextResponse.json({ contract: updated })
  } catch (error) {
    console.error('Error updating contract:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
