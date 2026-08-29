import { NextRequest, NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { buildMutationAuditDetails } from '@/lib/audit/mutation-audit'
import { getOwnerAdminId } from '@/lib/admin-scope'
import { buildCompanyHistoryWhere, companyHistoryQuerySchema } from '@/lib/admin/company-finance'
import { transactionLifecycleSchema } from '@/lib/admin/transactions'

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN', 'LOW_ADMIN'])) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const effectiveAdminId =
            user.role === 'LOW_ADMIN'
                ? (await getOwnerAdminId(user)) ?? user.id
                : user.id

        const { searchParams } = new URL(req.url)
        const query = companyHistoryQuerySchema.safeParse({
            limit: searchParams.get('limit') ?? undefined,
            type: searchParams.get('type') ?? undefined,
            category: searchParams.get('category') ?? undefined,
            search: searchParams.get('search') ?? undefined,
        })
        if (!query.success) {
            return new NextResponse('Invalid query parameters', { status: 400 })
        }
        const { limit, type, category, search } = query.data
        const showDeleted = searchParams.get('showDeleted') === 'true'

        // Fetch the admin to get current company balance
        const adminWithBalance = await prisma.admin.findUnique({
            where: { id: effectiveAdminId },
            select: { companyBalance: true }
        })

        if (!adminWithBalance) {
            return new NextResponse('Admin not found', { status: 404 })
        }

        const whereClause = buildCompanyHistoryWhere(effectiveAdminId, type, category, search, showDeleted)

        const history = await prisma.transaction.findMany({
            where: whereClause,
            include: {
                customer: {
                    select: { id: true, name: true, phone: true }
                },
                admin: {
                    select: { name: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: limit
        })

        return NextResponse.json({
            companyBalance: adminWithBalance.companyBalance,
            history
        })

    } catch (error) {
        console.error('Error fetching company finance:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const user = await getAuthUser(req)
        if (!user || !hasRole(user, ['MIDDLE_ADMIN', 'SUPER_ADMIN', 'LOW_ADMIN'])) return new NextResponse('Unauthorized', { status: 401 })
        const parsed = transactionLifecycleSchema.safeParse(await req.json().catch(() => null))
        if (!parsed.success) return new NextResponse('Invalid transaction lifecycle payload', { status: 400 })
        const effectiveAdminId = user.role === 'LOW_ADMIN' ? (await getOwnerAdminId(user)) ?? user.id : user.id
        const current = await prisma.transaction.findFirst({
            where: { id: parsed.data.id, adminId: effectiveAdminId },
            select: { id: true, deletedAt: true, isActive: true, purchase: { select: { id: true } } },
        })
        if (!current) return new NextResponse('Transaction not found', { status: 404 })
        if (parsed.data.deletedAt && current.purchase) return new NextResponse('Purchase transactions cannot be trashed', { status: 409 })
        const updated = await prisma.transaction.update({ where: { id: current.id }, data: { ...(parsed.data.deletedAt === undefined ? {} : { deletedAt: parsed.data.deletedAt ? new Date() : null }), ...(parsed.data.isActive === undefined ? {} : { isActive: parsed.data.isActive }) } })
        await prisma.actionLog.create({
            data: {
                adminId: user.id,
                action: parsed.data.deletedAt === true ? 'DELETE_TRANSACTION' : parsed.data.deletedAt === false ? 'RESTORE_TRANSACTION' : parsed.data.isActive === false ? 'DISABLE_TRANSACTION' : 'ENABLE_TRANSACTION',
                entityType: 'TRANSACTION',
                entityId: updated.id,
                details: buildMutationAuditDetails({ result: 'APPLIED', extra: { mutation: 'TRANSACTION_LIFECYCLE', entity: 'TRANSACTION' } }),
                oldValues: JSON.stringify({ deletedAt: current.deletedAt, isActive: current.isActive }),
                newValues: JSON.stringify({ deletedAt: updated.deletedAt, isActive: updated.isActive }),
            },
        })
        return NextResponse.json({ transaction: updated })
    } catch (error) {
        console.error('Error updating transaction lifecycle:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
