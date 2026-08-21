import { NextRequest, NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getGroupAdminIds } from '@/lib/admin-scope'
import { parseBoundedPagination } from '@/lib/pagination'
import { buildFinanceClientWhere, financeClientFilterSchema, parseFinanceClientAsOf } from '@/lib/admin/finance-clients'

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN', 'LOW_ADMIN'])) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        // Parse query params for filtering
        const { searchParams } = new URL(req.url)
        const filterResult = financeClientFilterSchema.safeParse(searchParams.get('filter') ?? 'all')
        if (!filterResult.success) {
            return new NextResponse('Invalid filter', { status: 400 })
        }
        const filter = filterResult.data
        const search = (searchParams.get('search') || '').trim()
        if (search.length > 100) {
            return new NextResponse('Search is too long', { status: 400 })
        }
        const asOfResult = parseFinanceClientAsOf(searchParams.get('asOf'))
        if ('error' in asOfResult) {
            return new NextResponse(asOfResult.error, { status: 400 })
        }
        const { asOf, hasAsOf } = asOfResult
        const groupAdminIds = await getGroupAdminIds(user)
        const whereClause = buildFinanceClientWhere(groupAdminIds, filter, search, hasAsOf)
        const pagination = parseBoundedPagination(
            searchParams.get('limit'),
            searchParams.get('offset'),
        )
        const query = pagination
            ? prisma.customer.findMany({
                where: whereClause,
                skip: pagination.offset,
                take: pagination.limit,
                select: {
                    id: true,
                    name: true,
                    phone: true,
                    balance: true,
                    dailyPrice: true,
                    createdAt: true,
                },
                orderBy: { name: 'asc' },
            })
            : prisma.customer.findMany({
                where: whereClause,
                select: {
                    id: true,
                    name: true,
                    phone: true,
                    balance: true,
                    dailyPrice: true,
                    createdAt: true,
                },
                orderBy: { name: 'asc' },
            })
        const clients = await query

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
