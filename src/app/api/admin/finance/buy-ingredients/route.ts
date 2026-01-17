import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/auth';
import { z } from 'zod';

const BuyIngredientsSchema = z.object({
    items: z.array(z.object({
        name: z.string(),
        amount: z.number().positive(), // in kg usually, but system stores in gr? Let's clarify.
        // User asked for "write how many kgs buyed", so input is likely KG.
        // System in menuData uses 'gr'. We need to convert or be consistent.
        // Assuming input amount is in the unit specified or we convert to 'gr' if it's 'kg'.
        // Let's expect the frontend to send grams or specific unit, but user prompt said "kgs".
        // Let's add a unit field to be safe, or default input to KG and convert to GR for storage if standard is GR.
        // Standard in DB seems to be 'gr' (default).
        // we'll handle conversion in API or Frontend. Let's do it in API if we receive unit.
        costPerUnit: z.number().nonnegative(), // cost per this amount unit (e.g. per kg)
        unit: z.string().default('kg')
    }))
});

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session || !['SUPER_ADMIN', 'MIDDLE_ADMIN'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const validation = BuyIngredientsSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data', details: validation.error }, { status: 400 });
        }

        const { items } = validation.data;
        const adminId = session.user.id;

        let totalCost = 0;
        const inventoryUpdates: Record<string, number> = {};

        // Calculate totals and prepare updates
        for (const item of items) {
            const cost = item.amount * item.costPerUnit;
            totalCost += cost;

            // Convert to grams if unit is kg (assuming DB stores grams)
            // If unit is 'gr', amount is as is.
            let amountInDbUnit = item.amount;
            if (item.unit.toLowerCase() === 'kg') {
                amountInDbUnit = item.amount * 1000;
            }

            inventoryUpdates[item.name] = (inventoryUpdates[item.name] || 0) + amountInDbUnit;
        }

        const result = await db.$transaction(async (tx) => {
            // 1. Create Transaction (Expense)
            const transaction = await tx.transaction.create({
                data: {
                    amount: totalCost,
                    type: 'EXPENSE',
                    category: 'INGREDIENT_PURCHASE',
                    description: `Закупка ингредиентов: ${items.map(i => `${i.name} (${i.amount}${i.unit})`).join(', ')}`,
                    adminId: adminId
                }
            });

            // 2. Update Company Balance
            await tx.admin.update({
                where: { id: adminId },
                data: {
                    companyBalance: { decrement: totalCost }
                }
            });

            // 3. Update Warehouse Stock
            for (const [name, amountToAdd] of Object.entries(inventoryUpdates)) {
                await tx.warehouseItem.upsert({
                    where: { name },
                    update: {
                        amount: { increment: amountToAdd },
                        updatedAt: new Date()
                    },
                    create: {
                        name,
                        amount: amountToAdd,
                        unit: 'gr' // Default storing unit
                    }
                });
            }

            return transaction;
        });

        return NextResponse.json({ success: true, transaction: result });

    } catch (error) {
        console.error('Error buying ingredients:', error);
        return NextResponse.json({ error: 'Failed to process purchase' }, { status: 500 });
    }
}
