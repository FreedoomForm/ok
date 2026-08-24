import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds, getOwnerAdminId } from '@/lib/admin-scope'

const weekdays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const
const periodSchema = z.object({
  startDate: z.string().min(10),
  endDate: z.string().min(10),
  courierId: z.string().min(1).optional().nullable(),
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
    const contracts = await db.contract.findMany({
      where: scope.groupAdminIds ? { ownerAdminId: { in: scope.groupAdminIds } } : {},
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
    if (courierId) {
      const courier = await db.admin.findFirst({ where: { id: courierId, role: 'COURIER', isActive: true, ...(scope.groupAdminIds ? { id: { in: scope.groupAdminIds } } : {}) }, select: { id: true } })
      if (!courier) return NextResponse.json({ error: 'Courier not found or disabled' }, { status: 400 })
    }
    const contract = await db.contract.create({
      data: {
        customerId,
        ownerAdminId: scope.ownerAdminId,
        courierId: courierId ?? null,
        status,
        paid,
        autoRenew,
        periods: {
          create: {
            courierId: period.courierId ?? courierId ?? null,
            startDate: new Date(`${period.startDate.slice(0, 10)}T00:00:00.000Z`),
            endDate: new Date(`${period.endDate.slice(0, 10)}T00:00:00.000Z`),
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
    return NextResponse.json({ contract }, { status: 201 })
  } catch (error) {
    console.error('Error creating contract:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
