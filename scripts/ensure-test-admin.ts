import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { buildDefaultSiteContent, buildThemePayload } from '../src/lib/site-builder'

const db = new PrismaClient()

async function main() {
  try {
    await db.admin.upsert({
      where: { id: 'test-admin' },
      update: {
        email: 'test@example.com',
        name: 'Test Admin',
        role: 'SUPER_ADMIN',
        isActive: true,
      },
      create: {
        id: 'test-admin',
        email: 'test@example.com',
        name: 'Test Admin',
        role: 'SUPER_ADMIN',
        isActive: true,
        password: await hash('test-password', 4),
      },
    })

    await db.website.upsert({
      where: { adminId: 'test-admin' },
      update: {
        subdomain: 'example-healthy-food',
        theme: JSON.stringify(buildThemePayload('organic-warm')),
        content: JSON.stringify(buildDefaultSiteContent('Healthy Food')),
        chatEnabled: true,
      },
      create: {
        adminId: 'test-admin',
        subdomain: 'example-healthy-food',
        theme: JSON.stringify(buildThemePayload('organic-warm')),
        content: JSON.stringify(buildDefaultSiteContent('Healthy Food')),
        chatEnabled: true,
      },
    })

    const password = await hash('test-password', 4)
    for (const roleFixture of [
      { id: 'test-middle-admin', email: 'middle@example.com', name: 'Test Middle Admin', role: 'MIDDLE_ADMIN' as const },
      { id: 'test-low-admin', email: 'low@example.com', name: 'Test Low Admin', role: 'LOW_ADMIN' as const },
      { id: 'test-courier', email: 'courier@example.com', name: 'Test Courier', role: 'COURIER' as const },
    ]) {
      await db.admin.upsert({
        where: { id: roleFixture.id },
        update: {
          email: roleFixture.email,
          name: roleFixture.name,
          role: roleFixture.role,
          createdBy: 'test-admin',
          isActive: true,
          password,
          hasPassword: true,
        },
        create: {
          id: roleFixture.id,
          email: roleFixture.email,
          name: roleFixture.name,
          role: roleFixture.role,
          createdBy: 'test-admin',
          isActive: true,
          password,
          hasPassword: true,
        },
      })
    }

    const customer = await db.customer.findFirst({
      where: { phone: '+998901112233', createdBy: 'test-admin', deletedAt: null },
      select: { id: true },
    })
    if (customer) {
      await db.customer.update({
        where: { id: customer.id },
        data: { name: 'Browser Test Customer', address: 'Test address', isActive: true },
      })
    } else {
      await db.customer.create({
        data: {
          name: 'Browser Test Customer',
          phone: '+998901112233',
          address: 'Test address',
          createdBy: 'test-admin',
          isActive: true,
        },
      })
    }
  } finally {
    await db.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
