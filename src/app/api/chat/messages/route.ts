import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-utils'
import { parseBoundedPagination } from '@/lib/pagination'
import { buildMessageHistoryPage } from '@/lib/chat/message-history'

// GET - Fetch messages for a conversation
export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const conversationId = searchParams.get('conversationId')
        const pagination = parseBoundedPagination(searchParams.get('limit') ?? '50', null)
        const before = searchParams.get('before') // For cursor pagination
        const beforeDate = before ? new Date(before) : null

        if (!conversationId) {
            return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
        }
        if (before && (!beforeDate || Number.isNaN(beforeDate.getTime()))) {
            return NextResponse.json({ error: 'before must be a valid date' }, { status: 400 })
        }

        // Verify user is participant in this conversation
        const conversation = await db.conversation.findFirst({
            where: {
                id: conversationId,
                OR: [
                    { participant1Id: user.id },
                    { participant2Id: user.id }
                ]
            }
        })

        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 })
        }

        // Fetch one bounded page plus a look-ahead row for cursor metadata.
        const limit = pagination?.limit ?? 50
        const messages = await db.message.findMany({
            where: {
                conversationId,
                ...(beforeDate ? {
                    createdAt: {
                        lt: beforeDate
                    }
                } : {})
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        role: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: limit + 1
        })

        const page = buildMessageHistoryPage(messages, limit)
        return NextResponse.json(page)

    } catch (error) {
        console.error('Error fetching messages:', error)
        return NextResponse.json({
            error: 'Внутренняя ошибка сервера',
            ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
        }, { status: 500 })
    }
}

// PATCH - Mark messages as read
export async function PATCH(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
        }

        const { conversationId } = await request.json()

        if (!conversationId) {
            return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
        }

        // Verify user is participant
        const conversation = await db.conversation.findFirst({
            where: {
                id: conversationId,
                OR: [
                    { participant1Id: user.id },
                    { participant2Id: user.id }
                ]
            }
        })

        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 })
        }

        // Mark all unread messages as read
        await db.message.updateMany({
            where: {
                conversationId,
                senderId: {
                    not: user.id
                },
                isRead: false
            },
            data: {
                isRead: true
            }
        })

        return NextResponse.json({ success: true })

    } catch (error) {
        const code = typeof error === 'object' && error !== null && 'code' in error ? (error as { code?: unknown }).code : undefined
        const message = error instanceof Error ? error.message : ''
        if (code !== 'ECONNRESET' && message !== 'aborted') {
            console.error('Error marking messages as read:', error)
        }
        return NextResponse.json({
            error: 'Внутренняя ошибка сервера',
            ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
        }, { status: 500 })
    }
}
