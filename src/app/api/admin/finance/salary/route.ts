import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { auth } from '@/auth'

export async function POST(request: Request) {
    try {
        const session = await auth()
        if (!session || (session.user.role !== 'MAIN_ADMIN' && session.user.role !== 'MIDDLE_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { adminId, amount } = await request.json()

        if (!adminId || !amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
        }

        // Get the admin/courier details
        const staff = await prisma.admin.findUnique({
            where: { id: adminId }
        })

        if (!staff) {
            return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
        }

        // Perform transaction
        /* 
          1. Deduct from Company Balance (Main/Middle Admin's balance? Or just record it?)
             - The schema has Admin.companyBalance.
             - Who is paying? Usually the Main Admin or Middle Admin user.
             - Let's deduct from the CURRENT USER's companyBalance who is performing the action.
        */

        // Check current user's balance
        const currentUser = await prisma.admin.findUnique({
            where: { id: session.user.id }
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
                adminId: currentUser.id,
                // We can optionally link to the staff member if there was a relation, 
                // but currently Transaction only links to Admin (creator) and Customer.
                // We'll store the staff name in description.
            }
        })

        // Optionally: Update staff's own balance? 
        // They don't have a "personal wallet" in the system, just "salary" field which is their rate.
        // So we just record the payment.

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Error paying salary:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
