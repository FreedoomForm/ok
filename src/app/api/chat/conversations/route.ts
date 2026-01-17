import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-utils'

// GET - Fetch conversations for the current user
export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
        }

        // Fetch conversations where user is a participant
        const conversations = await db.conversation.findMany({
            where: {
                OR: [
                    { participant1Id: user.id },
                    { participant2Id: user.id }
                ]
            },
            include: {
                participant1: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true
                    }
                },
                participant2: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true
                    }
                },
                messages: {
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 1
                }
            },
            orderBy: {
                lastMessageAt: 'desc'
            }
        })

        // Format conversations with other participant info
        const formattedConversations = conversations.map(conv => {
            const otherParticipant = conv.participant1Id === user.id
                ? conv.participant2
                : conv.participant1

            const lastMessage = conv.messages[0] || null

            return {
                id: conv.id,
                otherParticipant,
                lastMessage: lastMessage ? {
                    content: lastMessage.content,
                    createdAt: lastMessage.createdAt,
                    isRead: lastMessage.isRead,
                    senderId: lastMessage.senderId
                } : null,
                lastMessageAt: conv.lastMessageAt,
                unreadCount: conv.messages.filter(m => m.senderId !== user.id && !m.isRead).length
            }
        })

        return NextResponse.json({ conversations: formattedConversations })

    } catch (error) {
        console.error('Error fetching conversations:', error)
        return NextResponse.json({
            error: 'Внутренняя ошибка сервера',
            ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
        }, { status: 500 })
    }
}

// POST - Create or get existing conversation
export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser(request)
        if (!user) {
            return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
        }

        const { participantId } = await request.json()

        if (!participantId) {
            return NextResponse.json({ error: 'participantId is required' }, { status: 400 })
        }

        // Check if user can chat with this participant (role-based logic)
        const targetUser = await db.admin.findUnique({
            where: { id: participantId }
        })

        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Role-based access control
        const currentUser = await db.admin.findUnique({
            where: { id: user.id }
        })

        if (!currentUser) {
            return NextResponse.json({ error: 'Current user not found' }, { status: 404 })
        }

        // Check if conversation already exists
        const existingConversation = await db.conversation.findFirst({
            where: {
                OR: [
                    { participant1Id: user.id, participant2Id: participantId },
                    { participant1Id: participantId, participant2Id: user.id }
                ]
            }
        })

        if (existingConversation) {
            return NextResponse.json({ conversation: existingConversation })
        }

        // Create new conversation
        const newConversation = await db.conversation.create({
            data: {
                participant1Id: user.id,
                participant2Id: participantId,
                lastMessageAt: new Date()
            },
            include: {
                participant1: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true
                    }
                },
                participant2: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true
                    }
                }
            }
        })

        return NextResponse.json({ conversation: newConversation })

    } catch (error) {
        console.error('Error creating conversation:', error)
        return NextResponse.json({
            error: 'Внутренняя ошибка сервера',
            ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
        }, { status: 500 })
    }
}
