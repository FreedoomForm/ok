import assert from 'node:assert/strict'
import test from 'node:test'
import { PrismaClient } from '@prisma/client'
import { CustomerThreadMessageView } from '../src/lib/customers/chat'

const shouldRun = process.env.INTEGRATION_TESTS === 'true' && Boolean(process.env.DATABASE_URL)

test('customer chat thread stores, orders and read-marks messages against PostgreSQL', { skip: !shouldRun }, async () => {
  const db = new PrismaClient()
  const suffix = `${process.pid}-${Date.now()}`
  const adminId = `integration-customer-chat-${suffix}`
  const phone = `+1999${String(Date.now()).slice(-7)}`
  let customerId: string | undefined

  try {
    const owner = await db.admin.create({ data: { id: adminId, email: `${adminId}@example.test`, name: 'Customer Chat Admin', role: 'SUPER_ADMIN' } })
    const customer = await db.customer.create({ data: { name: 'Customer Chat Customer', phone, address: 'Customer Chat Address', createdBy: owner.id, autoOrdersEnabled: false } })
    customerId = customer.id

    await db.customerMessage.create({ data: { customerId: customer.id, ownerAdminId: owner.id, author: 'ADMIN', content: 'Здравствуйте! Ваш заказ подтверждён.' } })
    await db.customerMessage.create({ data: { customerId: customer.id, ownerAdminId: owner.id, author: 'CUSTOMER', content: 'Спасибо! А адрес можно изменить?' } })
    await db.customerMessage.create({ data: { customerId: customer.id, ownerAdminId: owner.id, author: 'CUSTOMER', content: 'И на завтра, пожалуйста.' } })

    const rows = await db.customerMessage.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: { id: true, content: true, createdAt: true, author: true },
    })
    const view = rows.map((row) => CustomerThreadMessageView.fromRow({
      id: row.id,
      content: row.content,
      createdAt: row.createdAt,
      author: row.author === 'ADMIN' ? 'ADMIN' : 'CUSTOMER',
      senderName: row.author === 'ADMIN' ? owner.name : null,
    }))

    assert.equal(view.length, 3)
    assert.equal(view[0].author, 'ADMIN')
    assert.equal(view[0].senderName, 'Customer Chat Admin')
    assert.equal(view[1].author, 'CUSTOMER')
    assert.equal(view[1].senderName, null)
    assert.equal(view[2].author, 'CUSTOMER')

    await db.customerMessage.updateMany({
      where: { customerId: customer.id, author: 'ADMIN', isRead: false },
      data: { isRead: true },
    })
    const afterRead = await db.customerMessage.findMany({ where: { customerId: customer.id }, select: { author: true, isRead: true } })
    assert.equal(afterRead.filter((row) => row.author === 'ADMIN').every((row) => row.isRead), true)
    assert.equal(afterRead.filter((row) => row.author === 'CUSTOMER').every((row) => row.isRead), false)
  } finally {
    await Promise.allSettled([
      ...(customerId ? [db.customerMessage.deleteMany({ where: { customerId } }), db.customer.delete({ where: { id: customerId } })] : []),
      db.actionLog.deleteMany({ where: { adminId } }),
      db.admin.delete({ where: { id: adminId } }).catch(() => undefined),
    ])
    await db.$disconnect()
  }
})
