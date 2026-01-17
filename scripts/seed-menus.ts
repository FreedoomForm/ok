
import { PrismaClient } from '@prisma/client'
import { MENUS, getDishImageUrl } from '../src/lib/menuData'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding menus...')

    try {
        for (const menuData of MENUS) {
            console.log(`Processing Menu ${menuData.menuNumber}...`)

            // 1. Create or Update Menu
            const menu = await prisma.menu.upsert({
                where: { number: menuData.menuNumber },
                update: {},
                create: {
                    number: menuData.menuNumber
                }
            })

            // 2. Process Dishes
            for (const dishData of menuData.dishes) {
                // Find existing dish by name to avoid duplicates or create new
                // Note: In a real world, names might collide for different dishes, but here we assume uniqueness

                // Just in case, let's try to find it first
                let dish = await prisma.dish.findFirst({
                    where: { name: dishData.name }
                })

                const dishPayload = {
                    name: dishData.name,
                    description: '',
                    mealType: dishData.mealType,
                    ingredients: dishData.ingredients as any, // Cast to any for Json
                    imageUrl: getDishImageUrl(dishData.id)
                }

                if (dish) {
                    // Update existing dish (optional, maybe we don't want to overwrite if edited)
                    // For now, let's connect it
                    dish = await prisma.dish.update({
                        where: { id: dish.id },
                        data: {
                            // Connect to this menu if not already
                            menus: {
                                connect: { id: menu.id }
                            }
                        }
                    })
                } else {
                    // Create new dish and connect to menu
                    dish = await prisma.dish.create({
                        data: {
                            ...dishPayload,
                            menus: {
                                connect: { id: menu.id }
                            }
                        }
                    })
                }
            }
        }
        console.log('Seeding completed successfully.')
    } catch (e) {
        console.error('Error seeding:', e)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

main()
