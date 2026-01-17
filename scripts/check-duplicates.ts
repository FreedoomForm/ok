
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking for duplicate dishes...');
    const dishes = await prisma.dish.groupBy({
        by: ['name'],
        _count: {
            name: true
        },
        having: {
            name: {
                _count: {
                    gt: 1
                }
            }
        }
    });

    if (dishes.length > 0) {
        console.log(`Found ${dishes.length} duplicate dish names.`);
        for (const d of dishes) {
            console.log(`- ${d.name} (${d._count.name} copies)`);
        }
    } else {
        console.log('No duplicates found by name.');
    }

    const allDishes = await prisma.dish.findMany();
    console.log(`Total dishes: ${allDishes.length}`);
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
