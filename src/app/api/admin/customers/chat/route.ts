import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/lib/db'
import { getAuthUser, hasRole } from '@/lib/auth-utils'
import { buildCustomerChatMessagePayload, CustomerThreadMessageView } from '@/lib/customers/chat'
import { resolveScopedCustomerThread } from '@/lib/customers/chat-scope'

const THREAD_PAGE_LIMIT = 100

const postSchema = z.object({
  customerId: z.string().min(1),
  content: z.string().max(2000),
})



// GET - bounded customer thread for the scoped administrator.
export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const customerId = new URL(request.url).searchParams.get('customerId')
        if (!customerId) {
            return NextResponse.json({ error: 'customerId is required' }, { status: 400 })
        }

        const customer = await resolveScopedCustomerThread(db, customerId, user.id, user.role)
        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
        }

        const rows = await db.customerMessage.findMany({
            where: { customerId: customer.id },
            orderBy: { createdAt: 'asc' },
            take: THREAD_PAGE_LIMIT,
            select: { id: true, content: true, createdAt: true, author: true },
        })

        const messages = rows.map((row) => CustomerThreadMessageView.fromRow({
            id: row.id,
            content: row.content,
            createdAt: row.createdAt,
            author: row.author === 'ADMIN' ? 'ADMIN' : 'CUSTOMER',
            senderName: row.author === 'ADMIN' ? user.name ?? null : null,
        }))

        const unreadCount = await db.customerMessage.count({
            where: { customerId: customer.id, author: 'CUSTOMER', isRead: false },
        })

        await db.customerMessage.updateMany({
            where: { customerId: customer.id, author: 'CUSTOMER', isRead: false },
            data: { isRead: true },
        })

        return NextResponse.json({ customer: { id: customer.id, name: customer.name }, messages, unreadCount })
    } catch (error) {
        console.error('Error fetching customer thread:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// POST - an administrator reply into the scoped customer thread.
export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const parsed = postSchema.safeParse(await request.json().catch(() => null))
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid customer chat payload' }, { status: 400 })
        }

        const customer = await resolveScopedCustomerThread(db, parsed.data.customerId, user.id, user.role)
        if (!customer) {
            return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
        }

        let payload
        try {
            payload = buildCustomerChatMessagePayload({ content: parsed.data.content })
        } catch (validationError) {
            const code = validationError instanceof Error ? validationError.message : 'INVALID_CUSTOMER_CHAT_CONTENT'
            return NextResponse.json({ error: code }, { status: 400 })
        }

        const created = await db.customerMessage.create({
            data: {
                customerId: customer.id,
                ownerAdminId: user.id,
                author: 'ADMIN',
                content: payload.content,
            },
            select: { id: true, content: true, createdAt: true, author: true },
        })

        return NextResponse.json({
            message: CustomerThreadMessageView.fromRow({
                id: created.id,
                content: created.content,
                createdAt: created.createdAt,
                author: 'ADMIN',
                senderName: user.name ?? null,
            }),
        }, { status: 201 })
    } catch (error) {
        console.error('Error sending customer thread reply:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
