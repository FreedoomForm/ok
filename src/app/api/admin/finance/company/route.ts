import { NextRequest, NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { getOwnerAdminId } from '@/lib/admin-scope'
import { buildCompanyHistoryWhere, companyHistoryQuerySchema } from '@/lib/admin/company-finance'

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
        })
        if (!query.success) {
            return new NextResponse('Invalid query parameters', { status: 400 })
        }
        const { limit, type, category } = query.data

        // Fetch the admin to get current company balance
        const adminWithBalance = await prisma.admin.findUnique({
            where: { id: effectiveAdminId },
            select: { companyBalance: true }
        })

        if (!adminWithBalance) {
            return new NextResponse('Admin not found', { status: 404 })
        }

        const whereClause = buildCompanyHistoryWhere(effectiveAdminId, type, category)

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
