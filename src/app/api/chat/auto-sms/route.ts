import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-utils'

const schema = z.object({
  contactIds: z.array(z.string().min(1)).min(1).max(100),
  content: z.string().trim().min(1).max(5000),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })
    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid auto-SMS payload' }, { status: 400 })

    const contacts = await db.chatContact.findMany({
      where: { id: { in: parsed.data.contactIds }, ownerAdminId: user.id, type: 'ADMIN', adminId: { not: null } },
      select: { id: true, adminId: true },
    })
    if (contacts.length === 0) return NextResponse.json({ error: 'No valid contacts selected' }, { status: 400 })

    const result = await db.$transaction(async (tx) => {
      let sent = 0
      let skipped = 0
      for (const contact of contacts) {
        if (!contact.adminId) { skipped += 1; continue }
        const recipientContact = await tx.chatContact.findFirst({
          where: { ownerAdminId: contact.adminId, adminId: user.id },
          select: { state: true },
        })
        if (recipientContact?.state === 'DISABLED') { skipped += 1; continue }
        const conversation = await tx.conversation.findFirst({
          where: { isSystem: false, OR: [
            { participant1Id: user.id, participant2Id: contact.adminId },
            { participant1Id: contact.adminId, participant2Id: user.id },
          ] },
          select: { id: true },
        })
        const currentConversation = conversation ?? await tx.conversation.create({
          data: { participant1Id: user.id, participant2Id: contact.adminId, isSystem: false, lastMessageAt: new Date() },
          select: { id: true },
        })
        const message = await tx.message.create({
          data: { conversationId: currentConversation.id, senderId: user.id, content: parsed.data.content, isRead: false },
        })
        await tx.conversation.update({
          where: { id: currentConversation.id },
          data: { lastMessage: message.content, lastMessageAt: message.createdAt },
        })
        sent += 1
      }
      return { sent, skipped }
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Error sending internal auto-SMS:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
