import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'
import { nextRenewalPeriod, type ContractPeriodDraft } from '@/lib/contracts/periods'

async function getScope(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) return null
  return { groupAdminIds: await getGroupAdminIds(user) }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const scope = await getScope(request)
    if (!scope) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await context.params
    const contract = await db.contract.findFirst({
      where: { id, ...(scope.groupAdminIds ? { ownerAdminId: { in: scope.groupAdminIds } } : {}) },
      include: { periods: { orderBy: { endDate: 'desc' }, take: 1 } },
    })
    if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    const previous = contract.periods[0]
    if (!previous) return NextResponse.json({ error: 'Contract has no period' }, { status: 409 })
    const draft: ContractPeriodDraft = {
      id: previous.id,
      startDate: previous.startDate.toISOString().slice(0, 10),
      endDate: previous.endDate.toISOString().slice(0, 10),
      autoRenew: contract.autoRenew && previous.autoRenew && previous.status === 'ENABLED',
      enabledWeekdays: Array.isArray(previous.enabledWeekdays) ? previous.enabledWeekdays.filter((value): value is ContractPeriodDraft['enabledWeekdays'][number] => typeof value === 'string') : [],
      disabledDates: Array.isArray(previous.disabledDates) ? previous.disabledDates.filter((value): value is string => typeof value === 'string') : [],
    }
    const next = nextRenewalPeriod(draft)
    if (!next) return NextResponse.json({ error: 'Auto-renew is disabled' }, { status: 409 })
    const existing = await db.contractPeriod.findFirst({ where: { contractId: id, startDate: new Date(`${next.startDate}T00:00:00.000Z`), endDate: new Date(`${next.endDate}T00:00:00.000Z`) } })
    if (existing) return NextResponse.json({ period: existing, created: false })
    try {
      const period = await db.contractPeriod.create({
        data: {
          contractId: id,
          courierId: previous.courierId,
          startDate: new Date(`${next.startDate}T00:00:00.000Z`),
          endDate: new Date(`${next.endDate}T00:00:00.000Z`),
          status: 'ENABLED',
          paid: false,
          autoRenew: true,
          enabledWeekdays: next.enabledWeekdays,
          disabledDates: next.disabledDates,
        },
      })
      return NextResponse.json({ period, created: true }, { status: 201 })
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error
      const period = await db.contractPeriod.findUnique({ where: { contractId_startDate_endDate: { contractId: id, startDate: new Date(`${next.startDate}T00:00:00.000Z`), endDate: new Date(`${next.endDate}T00:00:00.000Z`) } } })
      if (!period) throw error
      return NextResponse.json({ period, created: false })
    }
  } catch (error) {
    console.error('Error renewing contract:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
