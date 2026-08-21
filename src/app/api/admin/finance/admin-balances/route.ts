import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db as prisma } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'
import { buildSalaryAdminWhere, diffDaysInclusiveUtc, parseBalanceDates } from '@/lib/admin/balances'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const parsedDates = parseBalanceDates(
      searchParams.get('asOf'),
      searchParams.get('from'),
      searchParams.get('to'),
    )
    if ('error' in parsedDates) {
      return NextResponse.json({ error: parsedDates.error }, { status: 400 })
    }
    const { asOf, from, to } = parsedDates
    const groupAdminIds = await getGroupAdminIds(user)
    const where: Prisma.AdminWhereInput = buildSalaryAdminWhere(groupAdminIds)

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

