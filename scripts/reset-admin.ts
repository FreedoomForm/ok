import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = 'super@admin.com'
    const newPassword = 'admin123'

    console.log(`🔍 Checking for admin user: ${email}...`)

    const existingAdmin = await prisma.admin.findUnique({
        where: { email }
    })

    if (!existingAdmin) {
        console.error(`❌ Admin user not found! Creating it now...`)
        const hashedPassword = await hash(newPassword, 12)
        await prisma.admin.create({
            data: {
                email,
                name: 'Super Admin (Recovery)',
                password: hashedPassword,
                role: 'SUPER_ADMIN',
                isActive: true
            }
        })
        console.log(`✅ Admin created with password: ${newPassword}`)
    } else {
        console.log(`✅ Admin found. Resetting password...`)
        const hashedPassword = await hash(newPassword, 12)
        await prisma.admin.update({
            where: { email },
            data: {
                password: hashedPassword,
                isActive: true
            }
        })
        console.log(`✅ Password reset to: ${newPassword}`)
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
