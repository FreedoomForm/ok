import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { auth } from '@/auth'
import { z } from 'zod'

const TransactionSchema = z.object({
    customerId: z.string().optional(),
    amount: z.number().positive(),
    type: z.enum(['INCOME', 'EXPENSE']),
    description: z.string().optional(),
    category: z.string().optional(), // 'MANUAL_ADJUSTMENT', 'COMPANY_FUNDS'
})

export async function POST(req: Request) {
    try {
        const session = await auth()
        if (!session || !session.user || (session.user.role !== 'MIDDLE_ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const body = await req.json()
        const validation = TransactionSchema.safeParse(body)

        if (!validation.success) {
            return new NextResponse('Invalid Request', { status: 400 })
        }

        const { customerId, amount, type, description, category } = validation.data
        const adminId = session.user.id

        // Use a transaction to ensure balance update and log creation happen together
        const result = await prisma.$transaction(async (tx) => {
            // 1. Determine the effective amount change
            // INCOME adds to balance, EXPENSE subtracts
            const balanceChange = type === 'INCOME' ? amount : -amount

            let transactionRecord

            if (customerId) {
                // CLIENT TRANSACTION
                // Update Client Balance
                const updatedClient = await tx.customer.update({
                    where: { id: customerId },
                    data: {
                        balance: { increment: balanceChange }
                    }
                })

                // Create Transaction Record
                transactionRecord = await tx.transaction.create({
                    data: {
                        amount,
                        type,
                        description,
                        category: category || 'MANUAL_ADJUSTMENT',
                        adminId: adminId, // The admin who performed the action
                        customerId: customerId,
                    }
                })
            } else {
                // COMPANY TRANSACTION
                // Update Admin (Company) Balance
                const updatedAdmin = await tx.admin.update({
                    where: { id: adminId },
                    data: {
                        companyBalance: { increment: balanceChange }
                    }
                })

                // Create Transaction Record
                transactionRecord = await tx.transaction.create({
                    data: {
                        amount,
                        type,
                        description,
                        category: category || 'COMPANY_FUNDS',
                        adminId: adminId, // The admin whose company funds are updated
                    }
                })
            }

            return transactionRecord
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error creating transaction:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
