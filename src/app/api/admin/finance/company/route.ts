import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { auth } from '@/auth'
import { getOwnerAdminId } from '@/lib/admin-scope'

export async function GET(req: Request) {
    try {
        const session = await auth()
        if (!session || !session.user || (session.user.role !== 'MIDDLE_ADMIN' && session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'LOW_ADMIN')) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const effectiveAdminId =
            session.user.role === 'LOW_ADMIN'
                ? (await getOwnerAdminId(session.user)) ?? session.user.id
                : session.user.id

        const { searchParams } = new URL(req.url)
        const limit = parseInt(searchParams.get('limit') || '50')
        const type = searchParams.get('type') // 'company' or 'all' or 'client'

        // Fetch the admin to get current company balance
        const adminWithBalance = await prisma.admin.findUnique({
            where: { id: effectiveAdminId },
            select: { companyBalance: true }
        })

        if (!adminWithBalance) {
            return new NextResponse('Admin not found', { status: 404 })
        }

        const whereClause: any = {
            adminId: effectiveAdminId
        }

        // If type is specifically 'company', show only company fund transactions (no client associated)
        if (type === 'company') {
            whereClause.customerId = null
        }
        // If type is 'client', show only client transactions performed by this admin
        else if (type === 'client') {
            whereClause.customerId = { not: null }
        }

        const category = searchParams.get('category')
        if (category && category !== 'all') {
            whereClause.category = category
        }

        const history = await prisma.transaction.findMany({
            where: whereClause,
            include: {
                customer: {
                    select: { name: true, phone: true }
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
