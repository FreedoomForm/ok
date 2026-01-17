import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-utils'

// POST - Send a new message
export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
        }

        const { conversationId, content } = await request.json()

        if (!conversationId || !content) {
            return NextResponse.json({ error: 'conversationId and content are required' }, { status: 400 })
        }

        if (content.trim().length === 0) {
            return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
        }

        if (content.length > 5000) {
            return NextResponse.json({ error: 'Message too long (max 5000 characters)' }, { status: 400 })
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

        // Create message
        const message = await db.message.create({
            data: {
                conversationId,
                senderId: user.id,
                content: content.trim(),
                isRead: false
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        role: true
                    }
                }
            }
        })

        // Update conversation's lastMessageAt
        await db.conversation.update({
            where: { id: conversationId },
            data: {
                lastMessageAt: new Date()
            }
        })

        return NextResponse.json({ message })

    } catch (error) {
        console.error('Error sending message:', error)
        return NextResponse.json({
            error: 'Внутренняя ошибка сервера',
            ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
        }, { status: 500 })
    }
}
