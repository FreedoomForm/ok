import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Listing all admins...')
    const admins = await prisma.admin.findMany()
    console.log(JSON.stringify(admins, null, 2))

    const email = 'admin@autofood.uz'
    const existing = admins.find(a => a.email === email)

    if (!existing) {
        console.log(`Creating ${email}...`)
        // Create super admin
        const bcrypt = require('bcryptjs')
        const hashedPassword = await bcrypt.hash('admin123', 10)

        await prisma.admin.create({
            data: {
                email,
                password: hashedPassword,
                name: 'Super Admin',
                role: 'SUPER_ADMIN',
                isActive: true
            }
        })
        console.log('Super Admin created successfully.')
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
