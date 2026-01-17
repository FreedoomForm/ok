import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Testing database connection...')
    try {
        const count = await prisma.admin.count()
        console.log(`Database connected. Admin count: ${count}`)
    } catch (error) {
        console.error('Database connection failed:', error)
        process.exit(1)
    }

    console.log('Testing statistics query...')
    try {
        const allOrders = await prisma.order.findMany({
            include: {
                customer: {
                    select: {
                        orderPattern: true
                    }
                }
            }
        })
        console.log(`Statistics query successful. Orders found: ${allOrders.length}`)
    } catch (error) {
        console.error('Statistics query failed:', error)
    }

    console.log('Testing clients query...')
    try {
        const clients = await prisma.customer.findMany({
            where: { deletedAt: null },
            include: {
                defaultCourier: {
                    select: { id: true, name: true }
                }
            }
        })
        console.log(`Clients query successful. Clients found: ${clients.length}`)
    } catch (error) {
        console.error('Clients query failed:', error)
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
