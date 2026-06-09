import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-utils'

// GET - Fetch messages for a conversation
export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const conversationId = searchParams.get('conversationId')
        const limit = parseInt(searchParams.get('limit') || '50')
        const before = searchParams.get('before') // For pagination

        if (!conversationId) {
            return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
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

        // Fetch messages
        const messages = await db.message.findMany({
            where: {
                conversationId,
                ...(before && {
                    createdAt: {
                        lt: new Date(before)
                    }
                })
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
            take: limit
        })

        return NextResponse.json({ messages: messages.reverse() }) // Reverse to show oldest first

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
        console.error('Error marking messages as read:', error)
        return NextResponse.json({
            error: 'Внутренняя ошибка сервера',
            ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
        }, { status: 500 })
    }
}
