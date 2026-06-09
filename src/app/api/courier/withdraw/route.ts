import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'

function startOfDayUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function diffDaysInclusiveUtc(from: Date, to: Date) {
  const fromDay = startOfDayUtc(from).getTime()
  const toDay = startOfDayUtc(to).getTime()
  const diff = Math.floor((toDay - fromDay) / (24 * 60 * 60 * 1000))
  return Math.max(0, diff + 1)
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !hasRole(user, ['COURIER'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const amount = Number((body as any)?.amount ?? 0)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const courier = await db.admin.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        salary: true,
        createdBy: true,
      },
    })

    if (!courier || courier.salary <= 0) {
      return NextResponse.json({ error: 'Courier not found' }, { status: 404 })
    }

    const payerAdminId = courier.createdBy || user.id

    const payer = await db.admin.findUnique({
      where: { id: payerAdminId },
      select: { id: true, companyBalance: true },
    })

    if (!payer) {
      return NextResponse.json({ error: 'Payer not found' }, { status: 404 })
    }

    const paidSalary = await db.transaction.aggregate({
      where: {
        category: 'SALARY',
        salaryRecipientAdminId: courier.id,
      },
      _sum: { amount: true },
    })

    const days = diffDaysInclusiveUtc(courier.createdAt, new Date())
    const accrued = Number(courier.salary ?? 0) * days
    const paid = Number(paidSalary._sum.amount ?? 0)
    const available = accrued - paid

    if (amount > available) {
      return NextResponse.json({ error: 'Amount exceeds available balance', available }, { status: 400 })
    }

    if (Number(payer.companyBalance ?? 0) < amount) {
      return NextResponse.json({ error: 'Insufficient company balance' }, { status: 400 })
    }

    const result = await db.$transaction(async (tx) => {
      await tx.admin.update({
        where: { id: payer.id },
        data: {
          companyBalance: { decrement: amount },
        },
      })

      const transaction = await tx.transaction.create({
        data: {
          amount,
          type: 'EXPENSE',
          category: 'SALARY',
          description: `Courier withdrawal: ${courier.name}`,
          adminId: payer.id,
          salaryRecipientAdminId: courier.id,
        },
      })

      return transaction
    })

    try {
      await db.actionLog.create({
        data: {
          adminId: user.id,
          action: 'COURIER_WITHDRAW',
          entityType: 'TRANSACTION',
          entityId: result.id,
          description: `Courier withdrew ${amount}`,
        },
      })
    } catch {
      // ignore logging failures
    }

    return NextResponse.json({
      success: true,
      transactionId: result.id,
      withdrawn: amount,
      balance: available - amount,
    })
  } catch (error) {
    console.error('Error processing courier withdrawal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

