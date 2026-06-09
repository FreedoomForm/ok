import { NextRequest, NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-utils'
import { getGroupAdminIds, getOwnerAdminId } from '@/lib/admin-scope'

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'].includes(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { adminId, recipientAdminId, amount } = await request.json()
        const targetAdminId = recipientAdminId ?? adminId

        if (!targetAdminId || !amount || amount <= 0) {
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

        // Check current user's balance
        const currentUser = await prisma.admin.findUnique({
            where: { id: effectiveAdminId }
        })

        if (!currentUser) {
            return NextResponse.json({ error: 'Current user not found' }, { status: 404 })
        }

        // Deduct salary from company balance
        await prisma.admin.update({
            where: { id: currentUser.id },
            data: { companyBalance: { decrement: amount } }
        })

        // Create Transaction Record
        await prisma.transaction.create({
            data: {
                amount: amount,
                type: 'EXPENSE',
                category: 'SALARY',
                description: `Выплата зарплаты: ${staff.name} (${staff.role === 'COURIER' ? 'Курьер' : 'Админ'})`,
                adminId: effectiveAdminId,
                salaryRecipientAdminId: staff.id,
            }
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

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Error paying salary:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
