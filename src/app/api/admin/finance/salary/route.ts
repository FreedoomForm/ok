import { NextRequest, NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds, getOwnerAdminId } from '@/lib/admin-scope'
import { salaryPaymentSchema } from '@/lib/admin/salary'

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const validation = salaryPaymentSchema.safeParse(await request.json().catch(() => null))
        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
        }

        const { adminId, recipientAdminId, amount } = validation.data
        const targetAdminId = recipientAdminId ?? adminId
        if (!targetAdminId) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
        }

        const effectiveAdminId =
            user.role === 'LOW_ADMIN'
                ? (await getOwnerAdminId(user)) ?? user.id
                : user.id

        const groupAdminIds = await getGroupAdminIds(user)

        // Get the admin/courier details
        const staff = await prisma.admin.findUnique({
            where: { id: targetAdminId }
        })

        if (!staff) {
            return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
        }

        if (user.role !== 'SUPER_ADMIN') {
            if (!staff.createdBy || !groupAdminIds || !groupAdminIds.includes(staff.createdBy)) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }
        }

        // Perform transaction
        /* 
          1. Deduct from Company Balance (Main/Middle Admin's balance? Or just record it?)
             - The schema has Admin.companyBalance.
             - Who is paying? Usually the Main Admin or Middle Admin user.
             - Let's deduct from the CURRENT USER's companyBalance who is performing the action.
        */

        await prisma.$transaction(async (tx) => {
            const debited = await tx.admin.updateMany({
                where: { id: effectiveAdminId, companyBalance: { gte: amount } },
                data: { companyBalance: { decrement: amount } },
            })
            if (debited.count !== 1) {
                throw new Error('INSUFFICIENT_BALANCE')
            }

            return tx.transaction.create({
                data: {
                    amount,
                    type: 'EXPENSE',
                    category: 'SALARY',
                    description: `Выплата зарплаты: ${staff.name} (${staff.role === 'COURIER' ? 'Курьер' : 'Админ'})`,
                    adminId: effectiveAdminId,
                    salaryRecipientAdminId: staff.id,
                },
            })
        })

        try {
            await prisma.actionLog.create({
                data: {
                    adminId: user.id,
                    action: 'PAY_SALARY',
                    entityType: 'ADMIN',
                    entityId: staff.id,
                    description: `Paid salary ${amount}`
                }
            })
        } catch {
            // ignore logging failures
        }

        // Optionally: Update staff's own balance? 
        // They don't have a "personal wallet" in the system, just "salary" field which is their rate.
        // So we just record the payment.

        return NextResponse.json({ success: true })

    } catch (error) {
        if (error instanceof Error && error.message === 'INSUFFICIENT_BALANCE') {
            return NextResponse.json({ error: 'Insufficient company balance' }, { status: 400 })
        }
        console.error('Error paying salary:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
