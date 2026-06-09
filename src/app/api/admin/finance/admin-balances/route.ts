import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { auth } from '@/auth'
import { getGroupAdminIds, getOwnerAdminId } from '@/lib/admin-scope'

function startOfDayUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function diffDaysInclusiveUtc(from: Date, to: Date) {
  const fromDay = startOfDayUtc(from).getTime()
  const toDay = startOfDayUtc(to).getTime()
  const diff = Math.floor((toDay - fromDay) / (24 * 60 * 60 * 1000))
  return Math.max(0, diff + 1)
}

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (
      !session ||
      !session.user ||
      !['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'].includes(session.user.role)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const asOfRaw = searchParams.get('asOf')
    const fromRaw = searchParams.get('from')
    const toRaw = searchParams.get('to')
    const asOf =
      asOfRaw && !Number.isNaN(new Date(asOfRaw).getTime()) ? new Date(asOfRaw) : new Date()
    const from =
      fromRaw && !Number.isNaN(new Date(fromRaw).getTime()) ? startOfDayUtc(new Date(fromRaw)) : null
    const to =
      toRaw && !Number.isNaN(new Date(toRaw).getTime())
        ? new Date(startOfDayUtc(new Date(toRaw)).getTime() + 24 * 60 * 60 * 1000)
        : from
          ? new Date(from.getTime() + 24 * 60 * 60 * 1000)
          : null

    const effectiveAdminId =
      session.user.role === 'LOW_ADMIN'
        ? (await getOwnerAdminId(session.user)) ?? session.user.id
        : session.user.id

    const groupAdminIds = await getGroupAdminIds(session.user)

    const where: any = {
      role: { in: ['LOW_ADMIN', 'COURIER', 'WORKER'] as const },
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      where.createdBy = { in: groupAdminIds ?? [effectiveAdminId] }
    }

    const admins = await prisma.admin.findMany({
      where,
      select: {
        id: true,
        name: true,
        role: true,
        salary: true,
        createdAt: true,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const adminIds = admins.map((a) => a.id)

    const salaryPayments = adminIds.length
      ? await prisma.transaction.groupBy({
          by: ['salaryRecipientAdminId'],
          where: {
            category: 'SALARY',
            salaryRecipientAdminId: { in: adminIds },
          },
          _sum: { amount: true },
        })
      : []

    const withdrawalsInRange = adminIds.length && from && to
      ? await prisma.transaction.groupBy({
          by: ['salaryRecipientAdminId'],
          where: {
            category: 'SALARY',
            salaryRecipientAdminId: { in: adminIds },
            createdAt: {
              gte: from,
              lt: to,
            },
          },
          _sum: { amount: true },
        })
      : []

    const paidById = new Map<string, number>()
    for (const row of salaryPayments) {
      if (row.salaryRecipientAdminId) {
        paidById.set(row.salaryRecipientAdminId, row._sum.amount ?? 0)
      }
    }
    const withdrawnById = new Map<string, number>()
    for (const row of withdrawalsInRange) {
      if (row.salaryRecipientAdminId) {
        withdrawnById.set(row.salaryRecipientAdminId, row._sum.amount ?? 0)
      }
    }

    const payload = admins.map((admin) => {
      const days = diffDaysInclusiveUtc(admin.createdAt, asOf)
      const accrued = Number(admin.salary ?? 0) * days
      const paid = paidById.get(admin.id) ?? 0
      const balance = accrued - paid

      return {
        id: admin.id,
        name: admin.name,
        role: admin.role,
        isActive: admin.isActive,
        createdAt: admin.createdAt,
        salaryPerDay: admin.salary ?? 0,
        days,
        accrued,
        paid,
        balance,
        withdrawnInRange: withdrawnById.get(admin.id) ?? 0,
      }
    })

    return NextResponse.json({ asOf, admins: payload })
  } catch (error) {
    console.error('Error fetching admin salary balances:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

