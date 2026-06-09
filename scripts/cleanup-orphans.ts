
import { PrismaClient } from '@prisma/client';
import { MENUS, EXTRA_DISHES } from '../src/lib/menuData';

const prisma = new PrismaClient();

// normalize for comparison (ignore casing/spaces)
const norm = (s: string) => s.trim().toLowerCase();

async function main() {
    console.log('Validating dishes against menuData...');

    // 1. Harvest valid names from menuData
    const validNames = new Set<string>();

    MENUS.forEach(menu => {
        menu.dishes.forEach(d => validNames.add(norm(d.name)));
    });
    EXTRA_DISHES.forEach(d => validNames.add(norm(d.name)));

    console.log(`Found ${validNames.size} valid dish names in menuData.`);

    // 2. Fetch all dishes from DB
    const dbDishes = await prisma.dish.findMany();
    console.log(`Found ${dbDishes.length} dishes in DB.`);

    // 3. Identify invalid dishes
    const invalidDishes = dbDishes.filter(d => !validNames.has(norm(d.name)));

    if (invalidDishes.length === 0) {
        console.log('No invalid dishes found. Database is clean.');
        return;
    }

    console.log(`Found ${invalidDishes.length} invalid dishes (orphans/duplicates).`);

    // 4. Delete them
    console.log('Deleting invalid dishes...');
    const result = await prisma.dish.deleteMany({
        where: {
            id: {
                in: invalidDishes.map(d => d.id)
            }
        }
    });

    console.log(`Deleted ${result.count} dishes.`);
    invalidDishes.forEach(d => console.log(`- Deleted: "${d.name}"`));
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
