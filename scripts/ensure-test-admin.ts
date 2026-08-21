import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

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
  } finally {
    await db.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
