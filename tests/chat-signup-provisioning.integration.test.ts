import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { ensureSystemContactWithRetry } from '../src/lib/chat/system-lifecycle'

// C8 / R28: the account-creation flow provisions the System contact
// immediately — a new account opens the chat with «Система» and the welcome
// message already there. The signup route calls ensureSystemContactWithRetry
// (verified by the wiring guard below); this test executes the same call the
// route performs, because `server-only` modules cannot be imported under tsx.

const shouldRun = process.env.INTEGRATION_TESTS === 'true' && Boolean(process.env.DATABASE_URL)

test('signup route wires the immediate System-contact provisioning', () => {
  const source = readFileSync('src/app/api/auth/signup/route.ts', 'utf8')
  assert.match(source, /ensureSystemContactWithRetry\(db, admin\.id\)/)
  // Best-effort: a provisioning failure must not fail the signup itself.
  assert.match(source, /catch \(provisionError\)/)
})

test('provisioning right after account creation yields «Система» + welcome with the creation moment', { skip: !shouldRun }, async () => {
  const db = new PrismaClient()
  const nonce = `${process.pid}${Date.now()}`
  const email = `c8-signup-${nonce}@example.test`
  let createdAdminId: string | undefined

  try {
    // Exactly what the signup route does: create the admin, then provision.
    const admin = await db.admin.create({
      data: { email, password: 'unused', name: 'C8 Signup Provisioning', role: 'MIDDLE_ADMIN', isActive: true, hasPassword: true },
      select: { id: true, createdAt: true },
    })
    createdAdminId = admin.id
    await ensureSystemContactWithRetry(db, admin.id)

    const contact = await db.chatContact.findFirst({ where: { ownerAdminId: admin.id, type: 'SYSTEM' } })
    assert.ok(contact, 'system contact provisioned')
    assert.equal(contact.name, 'Система')
    assert.equal(contact.state, 'ENABLED')

    const conversation = await db.conversation.findFirst({ where: { participant1Id: admin.id, participant2Id: admin.id, isSystem: true } })
    assert.ok(conversation, 'system conversation provisioned')

    const welcome = await db.message.findFirst({ where: { conversationId: conversation.id, messageType: 'SYSTEM', systemCode: 'SYSTEM_WELCOME' } })
    assert.ok(welcome, 'welcome message present immediately')
    assert.match(welcome.content, /Добро пожаловать в чат AutoFood/)
    // R31: the provisioning message carries the account-creation moment.
    assert.match(welcome.content, /Аккаунт создан/)
  } finally {
    if (createdAdminId) {
      await db.message.deleteMany({ where: { conversation: { participant1Id: createdAdminId, participant2Id: createdAdminId } } }).catch(() => undefined)
      await db.conversation.deleteMany({ where: { participant1Id: createdAdminId, participant2Id: createdAdminId } }).catch(() => undefined)
      await db.chatContact.deleteMany({ where: { ownerAdminId: createdAdminId } }).catch(() => undefined)
      await db.admin.delete({ where: { id: createdAdminId } }).catch(() => undefined)
    }
    await db.$disconnect()
  }
})
