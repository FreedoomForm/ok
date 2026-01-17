
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Starting client reset...')

    try {
        // Delete all orders first (foreign key constraint)
        const activeOrders = await prisma.order.deleteMany({
            where: {} // match all
        })
        console.log(`Deleted ${activeOrders.count} orders.`)

        // Delete all clients (but NOT admins)
        const activeClients = await prisma.customer.deleteMany({
            where: {} // match all
        })
        console.log(`Deleted ${activeClients.count} clients.`)

        console.log('Reset complete.')
    } catch (e) {
        console.error('Error resetting clients:', e)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

main()
