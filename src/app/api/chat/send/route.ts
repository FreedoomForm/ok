import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-utils'
import { z } from 'zod'

const sendMessageSchema = z.object({
    conversationId: z.string().min(1),
    content: z.string().trim().min(1).max(5000),
})

// POST - Send a new message
export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
        }

        const parsedBody = sendMessageSchema.safeParse(await request.json())
        if (!parsedBody.success) {
            return NextResponse.json({ error: 'Invalid message payload' }, { status: 400 })
        }

        const { conversationId, content } = parsedBody.data

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

        const normalizedContent = content.trim()
        const message = await db.$transaction(async (tx) => {
            const createdMessage = await tx.message.create({
                data: {
                    conversationId,
                    senderId: user.id,
                    content: normalizedContent,
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

            await tx.conversation.update({
                where: { id: conversationId },
                data: {
                    lastMessage: normalizedContent,
                    lastMessageAt: createdMessage.createdAt,
                }
            })

            return createdMessage
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
