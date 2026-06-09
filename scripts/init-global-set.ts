
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Initializing Global Menu Set...');

    // Check if one already exists
    const existing = await prisma.menuSet.findFirst({
        where: { menuNumber: 0 } // Global
    });

    if (existing) {
        console.log('Global set already exists.');
        return;
    }

    // Create a new one
    await prisma.menuSet.create({
        data: {
            name: 'Global Autumn Set 2026',
            isActive: true, // Make it active by default
            menuNumber: 0,
            calorieGroups: {} // Empty JSON - User can fill it through UI
        }
    });

    console.log('Global set created and activated.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
