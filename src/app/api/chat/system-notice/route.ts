import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-utils'
import { ensureSystemContactWithRetry } from '@/lib/chat/system-lifecycle'

const schema = z.object({
  content: z.string().trim().min(1).max(500),
  systemCode: z.string().trim().min(3).max(60).optional(),
})

// R6: workspace lifecycle events (e.g. auto-SMS disabled) surface as SYSTEM
// messages inside the owner's internal «Система» conversation.
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Недействительный токен' }, { status: 401 })

    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Invalid system notice payload' }, { status: 400 })

    const { conversationId } = await ensureSystemContactWithRetry(db, user.id)
    const message = await db.message.create({
      data: {
        conversationId,
        senderId: user.id,
        content: parsed.data.content,
        messageType: 'SYSTEM',
        systemCode: parsed.data.systemCode ?? 'WORKSPACE_NOTICE',
        isRead: false,
      },
      select: { id: true, createdAt: true },
    })
    await db.conversation.update({
      where: { id: conversationId },
      data: { lastMessage: parsed.data.content, lastMessageAt: message.createdAt },
    })

    return NextResponse.json({ success: true, messageId: message.id, conversationId }, { status: 201 })
  } catch (error) {
    console.error('Error creating workspace system notice:', error)
    return NextResponse.json({ error: 'Не удалось создать системное сообщение' }, { status: 500 })
  }
}
