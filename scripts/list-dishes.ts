
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const dishes = await prisma.dish.findMany({
        select: { id: true, name: true }
    });

    // Sort by name for easier visual diff
    dishes.sort((a, b) => a.name.localeCompare(b.name));

    console.log(`Total Dishes: ${dishes.length}`);
    dishes.forEach(d => console.log(`[${d.id}] "${d.name}"`));
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
