import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-utils'
import { canStartConversation } from '@/lib/chat/participants'
import {
  CHAT_CONTACT_COLORS,
  CHAT_CONTACT_ICONS,
  normalizeContactPhone,
  selectContactStyle,
} from '@/lib/chat/contacts'
import { ensureSystemContactWithRetry } from '@/lib/chat/system-lifecycle'

type ContactState = 'ENABLED' | 'DISABLED' | 'DELETED'

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status })
}

async function getCurrentAdmin(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return null
  return db.admin.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, phone: true, role: true, createdBy: true, isActive: true },
  })
}

async function getConversationSummary(ownerAdminId: string) {
  const conversations = await db.conversation.findMany({
    where: {
      OR: [{ participant1Id: ownerAdminId }, { participant2Id: ownerAdminId }],
    },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
    orderBy: { lastMessageAt: 'desc' },
  })
  return new Map(conversations.map((conversation) => {
    const otherAdminId = conversation.participant1Id === ownerAdminId
      ? conversation.participant2Id
      : conversation.participant1Id
    const lastMessage = conversation.messages[0] ?? null
    return [conversation.isSystem ? 'system' : otherAdminId, {
      conversationId: conversation.id,
      lastMessage: lastMessage
        ? { content: lastMessage.content, createdAt: lastMessage.createdAt, isRead: lastMessage.isRead, senderId: lastMessage.senderId, messageType: lastMessage.messageType }
        : null,
      unreadCount: conversation.messages.filter((message) => message.senderId !== ownerAdminId && !message.isRead).length,
    }]
  }))
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin(request)
    if (!admin || !admin.isActive) return jsonError('Недействительный токен', 401)

    const system = await ensureSystemContactWithRetry(db, admin.id)
    const summaries = await getConversationSummary(admin.id)
    const contacts = await db.chatContact.findMany({
      where: { ownerAdminId: admin.id },
      include: { admin: { select: { id: true, name: true, email: true, phone: true, role: true, isActive: true } } },
      orderBy: [{ type: 'asc' }, { updatedAt: 'desc' }],
    })

    return NextResponse.json({
      contacts: contacts.map((contact) => {
        const summary = summaries.get(contact.type === 'SYSTEM' ? 'system' : contact.adminId ?? contact.id)
        return {
          id: contact.id,
          adminId: contact.adminId,
          type: contact.type,
          state: contact.state,
          name: contact.name,
          phone: contact.phone,
          color: contact.color,
          icon: contact.icon,
          conversationId: summary?.conversationId ?? (contact.type === 'SYSTEM' ? system.conversationId : null),
          lastMessage: summary?.lastMessage ?? null,
          unreadCount: summary?.unreadCount ?? 0,
          admin: contact.admin,
        }
      }),
    })
  } catch (error) {
    console.error('Error fetching chat contacts:', error)
    return jsonError('Внутренняя ошибка сервера', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const owner = await getCurrentAdmin(request)
    if (!owner || !owner.isActive) return jsonError('Недействительный токен', 401)

    const body = await request.json() as Record<string, unknown>
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const phone = typeof body.phone === 'string' ? normalizeContactPhone(body.phone) : ''
    const color = typeof body.color === 'string' ? body.color : ''
    const icon = typeof body.icon === 'string' ? body.icon : ''
    if (!name || !phone) return jsonError('Имя и номер обязательны', 400)
    if (color && !CHAT_CONTACT_COLORS.includes(color as (typeof CHAT_CONTACT_COLORS)[number])) return jsonError('Недопустимый цвет', 400)
    if (icon && !CHAT_CONTACT_ICONS.includes(icon as (typeof CHAT_CONTACT_ICONS)[number])) return jsonError('Недопустимая иконка', 400)

    const admins = await db.admin.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, phone: true, role: true, createdBy: true, isActive: true },
    })
    const target = admins.find((candidate) => candidate.phone && normalizeContactPhone(candidate.phone) === phone)
    if (!target) return jsonError('Пользователь с таким номером не найден', 404)
    if (target.id === owner.id || !canStartConversation(owner, target)) return jsonError('Нельзя создать такой контакт', 403)

    const existing = await db.chatContact.findFirst({ where: { ownerAdminId: owner.id, adminId: target.id } })
    if (existing) return jsonError('Контакт уже существует', 409)

    const used = await db.chatContact.findMany({ where: { ownerAdminId: owner.id }, select: { color: true, icon: true } })
    const style = selectContactStyle(used)
    const contact = await db.chatContact.create({
      data: {
        ownerAdminId: owner.id,
        adminId: target.id,
        type: 'ADMIN',
        state: 'ENABLED',
        name,
        phone,
        color: color || style.color,
        icon: icon || style.icon,
      },
    })
    try {
      await db.actionLog.create({
        data: {
          adminId: owner.id,
          action: 'CREATE_CHAT_CONTACT',
          entityType: 'CHAT_CONTACT',
          entityId: contact.id,
          newValues: JSON.stringify({ name: contact.name, state: contact.state, color: contact.color, icon: contact.icon }),
          description: `Created chat contact: ${contact.name}`,
        },
      })
    } catch (logError) {
      console.error('Failed to log chat contact creation:', logError)
    }

    return NextResponse.json({ contact }, { status: 201 })
  } catch (error) {
    console.error('Error creating chat contact:', error)
    return jsonError('Внутренняя ошибка сервера', 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const owner = await getCurrentAdmin(request)
    if (!owner || !owner.isActive) return jsonError('Недействительный токен', 401)

    const body = await request.json() as Record<string, unknown>
    const id = typeof body.id === 'string' ? body.id : ''
    if (!id) return jsonError('id is required', 400)
    const current = await db.chatContact.findFirst({ where: { id, ownerAdminId: owner.id } })
    if (!current) return jsonError('Контакт не найден', 404)
    if (current.type === 'SYSTEM') return jsonError('Системный контакт нельзя изменить', 403)

    const data: {
      name?: string
      phone?: string
      color?: string
      icon?: string
      state?: ContactState
    } = {}
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
    if (typeof body.phone === 'string' && body.phone.trim()) data.phone = normalizeContactPhone(body.phone)
    if (typeof body.color === 'string') {
      if (!CHAT_CONTACT_COLORS.includes(body.color as (typeof CHAT_CONTACT_COLORS)[number])) return jsonError('Недопустимый цвет', 400)
      data.color = body.color
    }
    if (typeof body.icon === 'string') {
      if (!CHAT_CONTACT_ICONS.includes(body.icon as (typeof CHAT_CONTACT_ICONS)[number])) return jsonError('Недопустимая иконка', 400)
      data.icon = body.icon
    }
    if (body.state === 'ENABLED' || body.state === 'DISABLED' || body.state === 'DELETED') data.state = body.state
    if (data.phone) {
      const duplicate = await db.chatContact.findFirst({ where: { ownerAdminId: owner.id, phone: data.phone, id: { not: id } } })
      if (duplicate) return jsonError('Контакт с таким номером уже существует', 409)
    }
    const contact = await db.chatContact.update({ where: { id }, data })
    try {
      await db.actionLog.create({
        data: {
          adminId: owner.id,
          action: 'UPDATE_CHAT_CONTACT',
          entityType: 'CHAT_CONTACT',
          entityId: contact.id,
          oldValues: JSON.stringify({ name: current.name, state: current.state, color: current.color, icon: current.icon }),
          newValues: JSON.stringify({ name: contact.name, state: contact.state, color: contact.color, icon: contact.icon }),
          description: `Updated chat contact: ${contact.name}`,
        },
      })
    } catch (logError) {
      console.error('Failed to log chat contact update:', logError)
    }
    return NextResponse.json({ contact })
  } catch (error) {
    console.error('Error updating chat contact:', error)
    return jsonError('Внутренняя ошибка сервера', 500)
  }
}
