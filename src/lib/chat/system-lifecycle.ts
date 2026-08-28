import { Prisma, PrismaClient } from '@prisma/client'

const SYSTEM_CONTACT_NAME = 'System'
const SYSTEM_CONTACT_PHONE = 'system'
const SYSTEM_CONTACT_ICON = 'shield'
const SYSTEM_CONTACT_COLOR = '#64748b'
const WELCOME_SYSTEM_CODE = 'SYSTEM_WELCOME'

const contactSelect = {
  id: true,
  ownerAdminId: true,
  adminId: true,
  type: true,
  state: true,
  name: true,
  phone: true,
  color: true,
  icon: true,
  systemKey: true,
  createdAt: true,
  updatedAt: true,
} as const

function isRetryableSerializationFailure(error: unknown) {
  const candidate = error as { code?: unknown; message?: unknown }
  if (candidate.code === 'P2034') return true
  if (candidate.code === 'P2010' && typeof candidate.message === 'string' && candidate.message.includes('40001')) return true
  return typeof candidate.message === 'string' && (candidate.message.includes('write conflict') || candidate.message.includes('deadlock'))
}

export async function ensureSystemContactInTransaction(tx: Prisma.TransactionClient, ownerAdminId: string) {
  await tx.$queryRaw(Prisma.sql`
    SELECT "id"
    FROM "admins"
    WHERE "id" = ${ownerAdminId}
    FOR UPDATE
  `)
  const contact = await tx.chatContact.upsert({
    where: { systemKey: `system:${ownerAdminId}` },
    update: { state: 'ENABLED', name: SYSTEM_CONTACT_NAME },
    create: { ownerAdminId, type: 'SYSTEM', state: 'ENABLED', name: SYSTEM_CONTACT_NAME, phone: SYSTEM_CONTACT_PHONE, color: SYSTEM_CONTACT_COLOR, icon: SYSTEM_CONTACT_ICON, systemKey: `system:${ownerAdminId}` },
    select: contactSelect,
  })
  const conversation = await tx.conversation.upsert({
    where: { participant1Id_participant2Id: { participant1Id: ownerAdminId, participant2Id: ownerAdminId } },
    update: { isSystem: true },
    create: { participant1Id: ownerAdminId, participant2Id: ownerAdminId, isSystem: true, lastMessageAt: new Date() },
    select: { id: true },
  })
  const welcome = await tx.message.findFirst({ where: { conversationId: conversation.id, messageType: 'SYSTEM', systemCode: WELCOME_SYSTEM_CODE }, select: { id: true } })
  if (!welcome) {
    await tx.message.create({ data: { conversationId: conversation.id, senderId: ownerAdminId, messageType: 'SYSTEM', systemCode: WELCOME_SYSTEM_CODE, content: 'Добро пожаловать в чат AutoFood.', isRead: false } })
  }
  return { contact, conversationId: conversation.id }
}

export async function ensureSystemContactWithRetry(db: PrismaClient, ownerAdminId: string, maxAttempts = 5) {
  let lastError: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await db.$transaction((tx) => ensureSystemContactInTransaction(tx, ownerAdminId), { isolationLevel: 'Serializable' })
    } catch (error) {
      lastError = error
      if (!isRetryableSerializationFailure(error) || attempt === maxAttempts - 1) throw error
      await new Promise((resolve) => setTimeout(resolve, 15 * (attempt + 1)))
    }
  }
  throw lastError
}
