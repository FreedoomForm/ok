import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth-utils';
import { toLocalDayBounds } from '@/lib/warehouse/cooking-plan';
import { cookRequestSchema } from '@/lib/warehouse/cook';

// Helper to manually scale ingredients since we might need more control here or reuse existing
// Reusing scaleIngredients from lib is fine, but we need to fetch specific Dish content from DB
// because Dish ingredients might have been edited.

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser(request);
        if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => null);
        if (body && typeof body === 'object' && 'dishes' in body && body.dishes) {
            return NextResponse.json({ error: 'Please use new detailed cooking interface' }, { status: 400 });
        }

        const parsed = cookRequestSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid request format' }, { status: 400 });
        }
        const { date, updates, menuNumber, activeSetId } = parsed.data;

        // 1. Fetch current plan to update stats
        const bounds = toLocalDayBounds(date.toISOString());
        if (!bounds) {
            return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
        }
        let plan = await db.dailyCookingPlan.findFirst({
            where: {
                date: {
                    gte: bounds.start,
                    lt: bounds.end
                }
            }
        });

        if (!plan) {
            if (!menuNumber) {
                return NextResponse.json({ error: 'No cooking plan found and no menuNumber provided to create one' }, { status: 404 });
            }

            plan = await db.dailyCookingPlan.create({
                data: {
                    date,
                    menuNumber,
                    dishes: {},
                    cookedStats: {}
                }
            });
        }

        const cookedStats = (plan.cookedStats as Prisma.JsonObject | null) || {};

        // 2. Fetch Active Set if provided (for custom ingredients)
        let activeSet: any = null;
        if (activeSetId) {
            activeSet = await db.menuSet.findUnique({
                where: { id: activeSetId }
            });
        }

        // 3. Fetch standard dishes (we still need them for fallback and base info)
        const dishIds = updates.map((update) => update.dishId);
        const dishes = await db.dish.findMany({
            where: { id: { in: dishIds } }
        });
        const dishMap = new Map(dishes.map(d => [d.id, d]));

        const inventoryUpdates = new Map<string, number>(); // name -> amount to deduct

        for (const update of updates) {
            const { dishId, calorie, amount } = update;
            const dId = dishId;

            const dish = dishMap.get(dId);
            if (!dish) continue;

            // Determine Ingredients: Standard or Custom from Set?
            let ingredientsToUse = dish.ingredients as any[];

            if (activeSet && activeSet.calorieGroups) {
                // Determine day number from plan or body
                const currentMenuNumber = plan!.menuNumber;

                // calorieGroups is JSON object: Record<string, CalorieGroup[]>
                const setGroups = activeSet.calorieGroups as any;

                // Get groups for this specific day
                const dayGroups = setGroups[currentMenuNumber.toString()];

                if (dayGroups && Array.isArray(dayGroups)) {
                    const targetGroup = dayGroups.find((g: any) => g.calories === calorie);

                    if (targetGroup && targetGroup.dishes) {
                        // Find this dish in the group
                        const setDish = targetGroup.dishes.find((d: any) => d.dishId.toString() === dId);

                        // If dish found in set AND has custom ingredients, use them
                        if (setDish && setDish.customIngredients && setDish.customIngredients.length > 0) {
                            ingredientsToUse = setDish.customIngredients;
                        }
                    }
                }
            }

            // Use real ingredient grams from set/DB dish; no calorie-tier multiplier.
            const scaled = (Array.isArray(ingredientsToUse) ? ingredientsToUse : []).map((ing: any) => ({
                ...ing,
                amount: (Number(ing?.amount) || 0) * amount,
            }));

            // Accumulate deductions
            for (const ing of scaled) {
                const current = inventoryUpdates.get(ing.name) || 0;
                inventoryUpdates.set(ing.name, current + ing.amount);
            }

            // Update stats
            if (!cookedStats[dId]) cookedStats[dId] = {};
            const currentCooked = cookedStats[dId][calorie] || 0;
            cookedStats[dId][calorie] = currentCooked + amount;
        }

        // 4. Apply DB Transaction
        await db.$transaction(async (tx) => {
            // Update Plan
            await tx.dailyCookingPlan.update({
                where: { id: plan!.id }, // plan is not null here
                data: { cookedStats }
            });

            // Update Inventory with safety check
            for (const [name, deductAmount] of inventoryUpdates) {
                const item = await tx.warehouseItem.findUnique({ where: { name } });

                if (!item) {
                    throw new Error(`Ингредиент не найден на складе: ${name}`);
                }

                if (item.amount < deductAmount) {
                    throw new Error(`Недостаточно: ${name}. Нужно ${deductAmount.toFixed(1)}${item.unit}, есть ${item.amount.toFixed(1)}${item.unit}`);
                }

                await tx.warehouseItem.update({
                    where: { name },
                    data: { amount: { decrement: deductAmount } }
                });
            }
        });

        return NextResponse.json({ success: true, cookedStats });

    } catch (error) {
        console.error('Error in cooking:', error);
        const message = error instanceof Error ? error.message : 'Failed to process cooking';
        // Return 400 for expected logic errors (insufficient ingredients), 500 for unexpected
        const status = message.includes('Недостаточно') || message.includes('не найден') ? 400 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
