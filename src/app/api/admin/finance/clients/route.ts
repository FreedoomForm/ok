import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { auth } from '@/auth'
import { getGroupAdminIds } from '@/lib/admin-scope'

export async function GET(req: Request) {
    try {
        const session = await auth()
        if (!session || !session.user || (session.user.role !== 'MIDDLE_ADMIN' && session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'LOW_ADMIN')) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        // Parse query params for filtering
        const { searchParams } = new URL(req.url)
        const filter = searchParams.get('filter') // 'all', 'positive', 'negative', 'zero'
        const search = searchParams.get('search') || ''
        const asOfRaw = searchParams.get('asOf')
        const asOf = asOfRaw ? new Date(asOfRaw) : null
        const hasAsOf = Boolean(asOfRaw) && asOf instanceof Date && !Number.isNaN(asOf.getTime())

        const whereClause: any = {
            deletedAt: null // Only active clients
        }

        // Data isolation: non-super admins see clients within their group
        const groupAdminIds = await getGroupAdminIds(session.user)
        if (groupAdminIds) {
            whereClause.createdBy = { in: groupAdminIds }
        }

        // Add search filter
        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
            ]
        }

        // Add balance filter (only when no asOf; otherwise apply after we compute the asOf balance).
        if (!hasAsOf) {
            if (filter === 'positive') {
                whereClause.balance = { gt: 0 }
            } else if (filter === 'negative') {
                whereClause.balance = { lt: 0 }
            } else if (filter === 'zero') {
                whereClause.balance = { equals: 0 }
            }
        }

        const clients = await prisma.customer.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                phone: true,
                balance: true,
                dailyPrice: true,
                createdAt: true,
            },
            orderBy: {
                name: 'asc'
            }
        })

        if (!hasAsOf) {
            return NextResponse.json(clients)
        }

        // Compute "balance as of" by rolling back client transactions that happened AFTER the asOf timestamp.
        // This keeps current Customer.balance as the source of truth while making the finance widgets period-aware.
        const clientIds = clients.map((c) => c.id)
        const txAfter = await prisma.transaction.groupBy({
            by: ['customerId', 'type'],
            where: {
                customerId: { in: clientIds },
                createdAt: { gt: asOf! },
            },
            _sum: { amount: true },
        })

        const deltaAfterByClient = new Map<string, { income: number; expense: number }>()
        txAfter.forEach((row) => {
            const customerId = row.customerId as string | null
            if (!customerId) return
            const current = deltaAfterByClient.get(customerId) ?? { income: 0, expense: 0 }
            const amount = Number(row._sum.amount ?? 0)
            if (row.type === 'INCOME') current.income += amount
            if (row.type === 'EXPENSE') current.expense += amount
            deltaAfterByClient.set(customerId, current)
        })

        const clientsAsOf = clients.map((client) => {
            const delta = deltaAfterByClient.get(client.id) ?? { income: 0, expense: 0 }
            // Roll back net change after asOf: balanceAsOf = currentBalance - (incomeAfter - expenseAfter)
            const balanceAsOf = Number(client.balance ?? 0) - delta.income + delta.expense
            return { ...client, balance: balanceAsOf }
        })

        const filtered =
            filter === 'positive'
                ? clientsAsOf.filter((c) => c.balance > 0)
                : filter === 'negative'
                    ? clientsAsOf.filter((c) => c.balance < 0)
                    : filter === 'zero'
                        ? clientsAsOf.filter((c) => c.balance === 0)
                        : clientsAsOf

        return NextResponse.json(filtered)
    } catch (error) {
        console.error('Error fetching finance clients:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
