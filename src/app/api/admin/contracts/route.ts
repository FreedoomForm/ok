import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds, getOwnerAdminId } from '@/lib/admin-scope'
import { buildMutationAuditDetails } from '@/lib/audit/mutation-audit'
import { buildContractAssignmentNotification, createCourierAssignmentNotification } from '@/lib/chat/notifications'

const weekdays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const
const periodSchema = z.object({
  startDate: z.string().min(10),
  endDate: z.string().min(10),
  courierId: z.string().min(1).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  status: z.enum(['ENABLED', 'DISABLED', 'DELETED']).default('ENABLED'),
  paid: z.boolean().default(false),
  autoRenew: z.boolean().default(false),
  enabledWeekdays: z.array(z.enum(weekdays)).default([]),
  disabledDates: z.array(z.string().min(10)).default([]),
})
const createSchema = z.object({
  customerId: z.string().min(1),
  courierId: z.string().min(1).optional().nullable(),
  status: z.enum(['ENABLED', 'DISABLED', 'DELETED']).default('ENABLED'),
  paid: z.boolean().default(false),
  autoRenew: z.boolean().default(false),
  period: periodSchema,
  correlationKey: z.string().trim().min(8).max(120).optional(),
})

async function getScope(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) return null
  return { user, ownerAdminId: (await getOwnerAdminId(user)) ?? user.id, groupAdminIds: await getGroupAdminIds(user) }
}

export async function GET(request: NextRequest) {
  try {
    const scope = await getScope(request)
    if (!scope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const url = new URL(request.url)
    const showDeleted = url.searchParams.get('showDeleted') === 'true'
    const search = url.searchParams.get('search')?.trim().slice(0, 120) ?? ''
    const contracts = await db.contract.findMany({
      where: {
        ...(scope.groupAdminIds ? { ownerAdminId: { in: scope.groupAdminIds } } : {}),
        status: showDeleted ? 'DELETED' : { not: 'DELETED' },
        ...(search ? { customer: { OR: [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search, mode: 'insensitive' } }] } } : {}),
      },
      include: {
        customer: { select: { id: true, name: true, phone: true, isActive: true } },
        courier: { select: { id: true, name: true, phone: true, isActive: true } },
        periods: { orderBy: { startDate: 'asc' }, include: { courier: { select: { id: true, name: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json({ contracts })
  } catch (error) {
    console.error('Error listing contracts:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const scope = await getScope(request)
    if (!scope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const parsed = createSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid contract payload' }, { status: 400 })
    const { customerId, courierId, period, status, paid, autoRenew } = parsed.data
    const customer = await db.customer.findFirst({ where: { id: customerId, ...(scope.groupAdminIds ? { createdBy: { in: scope.groupAdminIds } } : {}) }, select: { id: true } })
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    const startDate = new Date(`${period.startDate.slice(0, 10)}T00:00:00.000Z`)
    const endDate = new Date(`${period.endDate.slice(0, 10)}T00:00:00.000Z`)
    if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || endDate <= startDate) {
      return NextResponse.json({ error: 'Invalid period dates' }, { status: 400 })
    }
    const periodCourierId = period.courierId ?? courierId ?? null
    const courierIds = [...new Set([courierId, periodCourierId].filter((id): id is string => Boolean(id)))]
    if (courierIds.length) {
      const couriers = await db.admin.findMany({
        where: {
          id: { in: courierIds },
          role: 'COURIER',
          isActive: true,
          ...(scope.groupAdminIds ? { createdBy: { in: scope.groupAdminIds } } : {}),
        },
        select: { id: true },
      })
      if (couriers.length !== courierIds.length) return NextResponse.json({ error: 'Courier not found or disabled' }, { status: 400 })
    }
    const contract = await db.$transaction(async (tx) => {
      const created = await tx.contract.create({
        data: {
          customerId,
          ownerAdminId: scope.ownerAdminId,
          courierId: courierId ?? null,
          status,
          paid,
          autoRenew,
          periods: {
            create: {
              courierId: periodCourierId,
              color: period.color ?? null,
              startDate,
              endDate,
              status: period.status,
              paid: period.paid,
              autoRenew: period.autoRenew || autoRenew,
              enabledWeekdays: period.enabledWeekdays,
              disabledDates: period.disabledDates,
            },
          },
        },
        include: { periods: true },
      })
      if (periodCourierId && created.periods[0]) {
        const courier = await tx.admin.findUnique({ where: { id: periodCourierId }, select: { name: true } })
        await createCourierAssignmentNotification(tx, {
          actorAdminId: scope.user.id,
          courierId: periodCourierId,
          content: buildContractAssignmentNotification({ courierName: courier?.name ?? 'курьер', contractId: created.id, dateRange: `${period.startDate.slice(0, 10)} — ${period.endDate.slice(0, 10)}`, weekdays: period.enabledWeekdays, orderNumbers: [], status: period.status }),
        })
      }
      await tx.actionLog.create({
        data: {
          adminId: scope.user.id,
          action: 'CREATE_CONTRACT',
          entityType: 'CONTRACT',
          entityId: created.id,
          newValues: JSON.stringify({ customerId: created.customerId, courierId: created.courierId, status: created.status, paid: created.paid, autoRenew: created.autoRenew, periodId: created.periods[0]?.id ?? null }),
          details: buildMutationAuditDetails({ result: 'APPLIED', correlationKey: parsed.data.correlationKey ?? null, extra: { mutation: 'CREATE_CONTRACT', entity: 'CONTRACT' } }),
        },
      })
      return created
    })
    return NextResponse.json({ contract }, { status: 201 })
  } catch (error) {
    console.error('Error creating contract:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
