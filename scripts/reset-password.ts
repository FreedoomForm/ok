import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = process.argv[2] || 'admin@autofood.uz'
    const password = process.argv[3] || 'admin123'

    console.log(`Resetting password for ${email}...`)

    const hashedPassword = await bcrypt.hash(password, 10)

    try {
        const admin = await prisma.admin.upsert({
            where: { email },
            update: {
                password: hashedPassword,
                isActive: true,
                hasPassword: true
            },
            create: {
                email,
                name: 'Admin',
                password: hashedPassword,
                role: 'SUPER_ADMIN',
                isActive: true,
                hasPassword: true
            }
        })

        console.log(`Success! User ${admin.email} updated.`)
        console.log(`New password: ${password}`)
    } catch (error) {
        console.error('Error updating user:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
