import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { auth } from '@/auth'

export async function GET(req: Request) {
    try {
        const session = await auth()
        if (!session || !session.user || (session.user.role !== 'MIDDLE_ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        // Parse query params for filtering
        const { searchParams } = new URL(req.url)
        const filter = searchParams.get('filter') // 'all', 'positive', 'negative', 'zero'
        const search = searchParams.get('search') || ''

        let whereClause: any = {
            deletedAt: null // Only active clients
        }

        // Data isolation: Different isolation rules for each role
        // For Middle Admin: see clients created by self or own low admins
        if (session.user.role === 'MIDDLE_ADMIN') {
            const lowAdmins = await prisma.admin.findMany({
                where: { createdBy: session.user.id, role: 'LOW_ADMIN' },
                select: { id: true }
            })
            const lowAdminIds = lowAdmins.map(a => a.id)
            whereClause.createdBy = { in: [session.user.id, ...lowAdminIds] }
        } else if (session.user.role === 'LOW_ADMIN') {
            whereClause.createdBy = session.user.id
        }
        // Super Admin sees all

        // Add search filter
        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
            ]
        }

        // Add balance filter
        if (filter === 'positive') {
            whereClause.balance = { gt: 0 }
        } else if (filter === 'negative') {
            whereClause.balance = { lt: 0 }
        } else if (filter === 'zero') {
            whereClause.balance = { equals: 0 }
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

        return NextResponse.json(clients)
    } catch (error) {
        console.error('Error fetching finance clients:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
