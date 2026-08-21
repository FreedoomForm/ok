import { NextRequest, NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds, getOwnerAdminId } from '@/lib/admin-scope'
import { transactionRequestSchema } from '@/lib/admin/transactions'

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN', 'LOW_ADMIN'])) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const validation = transactionRequestSchema.safeParse(await req.json().catch(() => null))

        if (!validation.success) {
            return new NextResponse('Invalid Request', { status: 400 })
        }

        const { customerId, amount, type, description, category } = validation.data

        const effectiveAdminId =
            user.role === 'LOW_ADMIN'
                ? (await getOwnerAdminId(user)) ?? user.id
                : user.id

        const groupAdminIds = await getGroupAdminIds(user)
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

            await tx.actionLog.create({
                data: {
                    adminId: user.id,
                    action: 'CREATE_TRANSACTION',
                    entityType: 'TRANSACTION',
                    entityId: transactionRecord.id,
                    description: `Created finance transaction${customerId ? ' for customer' : ''}`,
                },
            })

            return transactionRecord
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error('Error creating transaction:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
