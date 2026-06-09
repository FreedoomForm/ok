import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { auth } from '@/auth'
import { z } from 'zod'
import { getGroupAdminIds, getOwnerAdminId } from '@/lib/admin-scope'

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
        if (!session || !session.user || (session.user.role !== 'MIDDLE_ADMIN' && session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'LOW_ADMIN')) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const body = await req.json()
        const validation = TransactionSchema.safeParse(body)

        if (!validation.success) {
            return new NextResponse('Invalid Request', { status: 400 })
        }

        const { customerId, amount, type, description, category } = validation.data

        const effectiveAdminId =
            session.user.role === 'LOW_ADMIN'
                ? (await getOwnerAdminId(session.user)) ?? session.user.id
                : session.user.id

        const groupAdminIds = await getGroupAdminIds(session.user)
        if (customerId && groupAdminIds) {
            const customer = await prisma.customer.findFirst({
                where: {
                    id: customerId,
                    createdBy: { in: groupAdminIds }
                },
                select: { id: true }
            })
            if (!customer) {
                return new NextResponse('Not Found', { status: 404 })
            }
        }

        // Use a transaction to ensure balance update and log creation happen together
        const result = await prisma.$transaction(async (tx) => {
            // 1. Determine the effective amount change
            // INCOME adds to balance, EXPENSE subtracts
            const balanceChange = type === 'INCOME' ? amount : -amount

            let transactionRecord

            if (customerId) {
                // CLIENT TRANSACTION
                // Update Client Balance
                await tx.customer.update({
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
                        adminId: effectiveAdminId, // The admin whose finance scope is affected
                        customerId: customerId,
                    }
                })
            } else {
                // COMPANY TRANSACTION
                // Update Admin (Company) Balance
                await tx.admin.update({
                    where: { id: effectiveAdminId },
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
                        adminId: effectiveAdminId, // The admin whose company funds are updated
                    }
                })
            }

            return transactionRecord
        })

        try {
            await prisma.actionLog.create({
                data: {
                    adminId: session.user.id,
                    action: 'CREATE_TRANSACTION',
                    entityType: 'TRANSACTION',
                    entityId: result.id,
                    description: `Created finance transaction${customerId ? ' for customer' : ''}`
                }
            })
        } catch {
            // ignore logging failures
        }

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error creating transaction:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
