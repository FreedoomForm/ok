import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const email = 'admin@autofood.uz'
    console.log(`Checking role for user: ${email}`)

    const admin = await prisma.admin.findUnique({
        where: { email }
    })

    if (!admin) {
        console.log('User not found!')
        return
    }

    console.log(`Current role: ${admin.role}`)

    if (admin.role !== 'SUPER_ADMIN') {
        console.log('Updating role to SUPER_ADMIN...')
        const updatedAdmin = await prisma.admin.update({
            where: { email },
            data: { role: 'SUPER_ADMIN' }
        })
        console.log(`Role updated to: ${updatedAdmin.role}`)
    } else {
        console.log('Role is already SUPER_ADMIN')
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
