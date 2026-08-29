import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { getCustomerFromRequest } from '@/lib/customer-auth'
import { buildCustomerChatMessagePayload, CustomerThreadMessageView } from '@/lib/customers/chat'

const THREAD_PAGE_LIMIT = 100

// GET - bounded customer chat thread with the linked administrator identity.
export async function GET(request: NextRequest) {
    try {
        const customer = await getCustomerFromRequest(request)
        if (!customer) {
            return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
        }

        const ownerAdminId = customer.createdBy
        if (!ownerAdminId) {
            return NextResponse.json({ contact: null, messages: [] })
        }

        const owner = await db.admin.findFirst({
            where: { id: ownerAdminId, isActive: true, deletedAt: null },
            select: { id: true, name: true },
        })

        const rows = await db.customerMessage.findMany({
            where: { customerId: customer.id },
            orderBy: { createdAt: 'asc' },
            take: THREAD_PAGE_LIMIT,
            select: { id: true, content: true, createdAt: true, author: true },
        })

        await db.customerMessage.updateMany({
            where: { customerId: customer.id, author: 'ADMIN', isRead: false },
            data: { isRead: true },
        })

        const messages = rows.map((row) => CustomerThreadMessageView.fromRow({
            id: row.id,
            content: row.content,
            createdAt: row.createdAt,
            author: row.author === 'ADMIN' ? 'ADMIN' : 'CUSTOMER',
            senderName: row.author === 'ADMIN' ? owner?.name ?? null : null,
        }))

        return NextResponse.json({
            contact: owner ? { name: owner.name } : null,
            messages,
        })
    } catch (error) {
        console.error('Error fetching customer chat:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

// POST - a customer-authored message into its own administrator thread.
export async function POST(request: NextRequest) {
    try {
        const customer = await getCustomerFromRequest(request)
        if (!customer) {
            return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
        }

        const ownerAdminId = customer.createdBy
        if (!ownerAdminId) {
            return NextResponse.json({ error: 'Администратор не привязан' }, { status: 409 })
        }

        const owner = await db.admin.findFirst({
            where: { id: ownerAdminId, isActive: true, deletedAt: null },
            select: { id: true },
        })
        if (!owner) {
            return NextResponse.json({ error: 'Администратор не привязан' }, { status: 409 })
        }

        const body = await request.json().catch(() => null)
        let payload
        try {
            payload = buildCustomerChatMessagePayload({ content: body?.content })
        } catch (validationError) {
            const code = validationError instanceof Error ? validationError.message : 'INVALID_CUSTOMER_CHAT_CONTENT'
            return NextResponse.json({ error: code }, { status: 400 })
        }

        const created = await db.customerMessage.create({
            data: {
                customerId: customer.id,
                ownerAdminId: owner.id,
                author: 'CUSTOMER',
                content: payload.content,
            },
            select: { id: true, content: true, createdAt: true, author: true },
        })

        return NextResponse.json({
            message: CustomerThreadMessageView.fromRow({
                id: created.id,
                content: created.content,
                createdAt: created.createdAt,
                author: 'CUSTOMER',
                senderName: null,
            }),
        }, { status: 201 })
    } catch (error) {
        console.error('Error sending customer chat message:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
