import assert from 'node:assert/strict'
import test from 'node:test'
import { PrismaClient } from '@prisma/client'
import { ensureSystemContactWithRetry } from '../src/lib/chat/system-lifecycle'

const shouldRun = process.env.INTEGRATION_TESTS === 'true' && Boolean(process.env.DATABASE_URL)

test('System contact and welcome message are idempotent under concurrent initialization', { skip: !shouldRun }, async () => {
  const db = new PrismaClient()
  const adminId = `integration-chat-system-${process.pid}-${Date.now()}`
  let contactId: string | undefined

  try {
    await db.admin.create({ data: { id: adminId, email: `${adminId}@example.test`, name: 'Chat System Integration Admin', role: 'SUPER_ADMIN' } })
    const results = await Promise.all([
      ensureSystemContactWithRetry(db, adminId),
      ensureSystemContactWithRetry(db, adminId),
    ])
    contactId = results[0].contact.id

    const [contacts, conversations, welcomeCount] = await Promise.all([
      db.chatContact.count({ where: { ownerAdminId: adminId, type: 'SYSTEM' } }),
      db.conversation.count({ where: { participant1Id: adminId, participant2Id: adminId, isSystem: true } }),
      db.message.count({ where: { senderId: adminId, messageType: 'SYSTEM', systemCode: 'SYSTEM_WELCOME' } }),
    ])

    assert.equal(results[0].conversationId, results[1].conversationId)
    assert.equal(contacts, 1)
    assert.equal(conversations, 1)
    assert.equal(welcomeCount, 1)
  } finally {
    await Promise.allSettled([
      ...(contactId ? [db.chatContact.delete({ where: { id: contactId } })] : []),
      db.admin.delete({ where: { id: adminId } }),
    ])
    await db.$disconnect()
  }
})
