import { Prisma, PrismaClient } from '@prisma/client';
import { MENUS, EXTRA_DISHES } from '../src/lib/menuData';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing menus and dishes...');
  await prisma.menu.deleteMany();
  await prisma.dish.deleteMany();

  console.log('Start seeding Dishes from menuData...');

  const dishMap = new Map<string, any>();

  // 1. First, create all unique dishes
  const allSourceDishes = [
    ...MENUS.flatMap(m => m.dishes),
    ...EXTRA_DISHES
  ];

  for (const dish of allSourceDishes) {
    const dishId = dish.id.toString();
    if (dishMap.has(dishId)) continue;

    const createdDish = await prisma.dish.create({
      data: {
        id: dishId,
        name: dish.name,
        mealType: dish.mealType,
        ingredients: (dish.ingredients || []) as unknown as Prisma.InputJsonValue,
      }
    });
    dishMap.set(dishId, createdDish);
    console.log(`Created Dish: ${dish.name} (ID: ${dishId})`);
  }

  // 2. Create the 21 Menu records and link dishes
  console.log('Seeding 21-day Menus...');
  for (const sourceMenu of MENUS) {
    const dishIds = sourceMenu.dishes.map(d => d.id.toString());

    await prisma.menu.create({
      data: {
        number: sourceMenu.menuNumber,
        dishes: {
          connect: dishIds.map(id => ({ id }))
        }
      }
    });
    console.log(`Created Menu #${sourceMenu.menuNumber} with ${dishIds.length} dishes`);
  }

  console.log('Seeding finished.');
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
