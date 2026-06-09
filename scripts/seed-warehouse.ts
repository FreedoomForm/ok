
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding Warehouse Items from Dishes...');

    // 1. Get all dishes to extract ingredients
    const dishes = await prisma.dish.findMany();
    const uniqueIngredients = new Map<string, string>(); // name -> unit

    dishes.forEach((dish: any) => {
        // ingredients is usually a stringified JSON in some versions or array in others
        // In this schema it seems to be Json? 
        // Let's handle it as it appears.
        const ingredients = dish.ingredients;
        if (Array.isArray(ingredients)) {
            ingredients.forEach((ing: any) => {
                if (ing && ing.name) {
                    uniqueIngredients.set(ing.name, ing.unit || 'gr');
                }
            });
        }
    });

    console.log(`Found ${uniqueIngredients.size} unique ingredients. Populating warehouse...`);

    // 2. Create or Update warehouse items
    for (const [name, unit] of uniqueIngredients.entries()) {
        await prisma.warehouseItem.upsert({
            where: { name },
            update: {},
            create: {
                name,
                unit,
                amount: 10000, // Give some starting stock (10kg/10l)
            }
        });
    }

    console.log('Warehouse seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
