import { PrismaClient } from '@prisma/client';
import { MENUS, EXTRA_DISHES, getAllIngredients, type Dish as MenuDish } from '../src/lib/menuData';

const prisma = new PrismaClient();

// Helper to normalize strings for comparison
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

async function main() {
    console.log('Starting ingredient harvest and dish update...');

    // 1. Harvest all ingredients from menuData
    const allIngredients = getAllIngredients(); // Returns string[]
    console.log(`Found ${allIngredients.length} unique ingredients in menuData.`);

    // We need units too. getAllIngredients only returns names. i'll extract manually.
    const ingredientMap = new Map<string, string>(); // Name -> Unit

    const collectIngredients = (dish: MenuDish) => {
        for (const ing of dish.ingredients) {
            if (ing.name) {
                // Use the first unit found for this ingredient name as canonical
                if (!ingredientMap.has(ing.name)) {
                    ingredientMap.set(ing.name, ing.unit);
                }
            }
        }
    };

    // Collect from both MENUS and EXTRA_DISHES
    MENUS.forEach(menu => menu.dishes.forEach(collectIngredients));
    EXTRA_DISHES.forEach(collectIngredients);

    console.log(`Extracted ${ingredientMap.size} unique ingredients with units.`);

    // 2. Upsert WarehouseItems
    for (const [name, unit] of ingredientMap) {
        await prisma.warehouseItem.upsert({
            where: { name },
            update: {},
            create: { name, unit, amount: 0 }
        });
    }
    console.log('Warehouse items populated.');

    // 3. Update Dishes in DB with ingredients from menuData
    // Create a map of normalized name -> ingredients
    const dishIngredientsMap = new Map<string, any[]>();

    const mapDish = (dish: MenuDish) => {
        dishIngredientsMap.set(normalize(dish.name), dish.ingredients);
    };

    // Map from both MENUS and EXTRA_DISHES
    MENUS.forEach(menu => menu.dishes.forEach(mapDish));
    EXTRA_DISHES.forEach(mapDish);

    const dbDishes = await prisma.dish.findMany();
    let updatedCount = 0;

    for (const dbDish of dbDishes) {
        const normName = normalize(dbDish.name);
        // Try exact normalized match
        let ingredients = dishIngredientsMap.get(normName);

        // Fallback: try finding a menuDish that is a substring of dbDish or vice versa
        if (!ingredients) {
            for (const [key, val] of dishIngredientsMap.entries()) {
                if (normName.includes(key) || key.includes(normName)) {
                    ingredients = val;
                    break;
                }
            }
        }

        if (ingredients) {
            await prisma.dish.update({
                where: { id: dbDish.id },
                data: { ingredients }
            });
            updatedCount++;
            // console.log(`Updated ingredients for: ${dbDish.name}`);
        } else {
            console.log(`No ingredients found for: ${dbDish.name}`);
        }
    }

    console.log(`Updated ingredients for ${updatedCount} / ${dbDishes.length} dishes.`);
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
