import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-utils'
import { selectContactStyle } from '@/lib/chat/contacts'
import { canSendToChatContact } from '@/lib/chat/contact-lifecycle'
import { sendMessageSchema } from '@/lib/chat/messages'

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

        const { conversationId, content, replyToMessageId } = parsedBody.data

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
        if (replyToMessageId) {
            const replyTarget = await db.message.findFirst({ where: { id: replyToMessageId, conversationId }, select: { id: true } })
            if (!replyTarget) return NextResponse.json({ error: 'Reply target not found in conversation' }, { status: 400 })
        }
        if (conversation.isSystem) {
            return NextResponse.json({ error: 'System contact does not accept messages' }, { status: 403 })
        }

        const otherAdminId = conversation.participant1Id === user.id
            ? conversation.participant2Id
            : conversation.participant1Id
        const recipientContact = await db.chatContact.findFirst({
            where: { ownerAdminId: otherAdminId, adminId: user.id },
            select: { state: true },
        })
        if (!canSendToChatContact({ type: 'ADMIN', state: recipientContact?.state ?? 'ENABLED' })) {
            return NextResponse.json({ error: 'Contact is disabled' }, { status: 403 })
        }

        const normalizedContent = content.trim()
        const message = await db.$transaction(async (tx) => {
            const liveRecipientContact = await tx.chatContact.findFirst({
                where: { ownerAdminId: otherAdminId, adminId: user.id },
                select: { state: true },
            })
            if (!canSendToChatContact({ type: 'ADMIN', state: liveRecipientContact?.state ?? 'ENABLED' })) throw new Error('CONTACT_DISABLED')
            if (!liveRecipientContact) {
                const sender = await tx.admin.findUnique({
                    where: { id: user.id },
                    select: { name: true, phone: true },
                })
                const usedStyles = await tx.chatContact.findMany({
                    where: { ownerAdminId: otherAdminId },
                    select: { color: true, icon: true },
                })
                const style = selectContactStyle(usedStyles)
                await tx.chatContact.create({
                    data: {
                        ownerAdminId: otherAdminId,
                        adminId: user.id,
                        type: 'ADMIN',
                        state: 'ENABLED',
                        name: sender?.name || 'Admin',
                        phone: sender?.phone || '',
                        color: style.color,
                        icon: style.icon,
                    },
                })
            }

            const createdMessage = await tx.message.create({
                data: {
                    conversationId,
                    senderId: user.id,
                    content: normalizedContent,
                    replyToMessageId: replyToMessageId ?? null,
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
        if (error instanceof Error && error.message === 'CONTACT_DISABLED') {
            return NextResponse.json({ error: 'Contact is disabled' }, { status: 403 })
        }
        console.error('Error sending message:', error)
        return NextResponse.json({
            error: 'Внутренняя ошибка сервера',
            ...(process.env.NODE_ENV === 'development' && { details: error instanceof Error ? error.message : 'Unknown error' })
        }, { status: 500 })
    }
}
