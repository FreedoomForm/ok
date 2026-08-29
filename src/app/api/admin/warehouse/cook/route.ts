import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db'
import { buildMutationAuditDetails } from '@/lib/audit/mutation-audit';
import { getAuthUser } from '@/lib/auth-utils';
import { getGroupAdminIds, getOwnerAdminId } from '@/lib/admin-scope';
import { canManageGlobalOperationalResource } from '@/lib/resources/global-policy';
import { toLocalDayBounds } from '@/lib/warehouse/cooking-plan';
import { cookRequestSchema } from '@/lib/warehouse/cook';
import { findCustomCookIngredients, parseCookIngredients, type CookIngredient } from '@/lib/warehouse/cook-json';
import { buildCookingConsumptionRecord } from '@/lib/warehouse/cooking-consumption';

async function getAllowedAdminIds(user: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>): Promise<string[]> {
    if (user.role === 'SUPER_ADMIN') return [];
    const ownerAdminId = user.role === 'LOW_ADMIN' ? (await getOwnerAdminId(user)) ?? user.id : user.id;
    return (await getGroupAdminIds(user)) ?? [ownerAdminId];
}

async function canManageProvenance(user: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>, provenance: { clientIds?: string[]; contractIds?: string[]; orderIds?: string[]; setId?: string | null } | undefined): Promise<boolean> {
    if (!provenance || user.role === 'SUPER_ADMIN') return true;
    const adminIds = await getAllowedAdminIds(user);
    const unique = (values: readonly string[] | undefined) => [...new Set(values ?? [])];
    const clientIds = unique(provenance.clientIds);
    const contractIds = unique(provenance.contractIds);
    const orderIds = unique(provenance.orderIds);
    const [clients, contracts, orders, set] = await Promise.all([
        clientIds.length === 0 ? Promise.resolve([]) : db.customer.findMany({ where: { id: { in: clientIds }, createdBy: { in: [...adminIds] } }, select: { id: true } }),
        contractIds.length === 0 ? Promise.resolve([]) : db.contract.findMany({ where: { id: { in: contractIds }, ownerAdminId: { in: [...adminIds] } }, select: { id: true } }),
        orderIds.length === 0 ? Promise.resolve([]) : db.order.findMany({ where: { id: { in: orderIds }, OR: [{ adminId: { in: [...adminIds] } }, { customer: { createdBy: { in: [...adminIds] } } }] }, select: { id: true } }),
        provenance.setId ? db.menuSet.findFirst({ where: { id: provenance.setId, OR: [{ adminId: { in: [...adminIds] } }, { adminId: null }] }, select: { id: true } }) : Promise.resolve(null),
    ]);
    return clients.length === clientIds.length && contracts.length === contractIds.length && orders.length === orderIds.length && (!provenance.setId || Boolean(set));
}

async function deriveCookingProvenance(date: Date, activeSetId: string | null | undefined, calorie: number, bounds: { start: Date; end: Date }) {
    const orders = await db.order.findMany({
        where: { deliveryDate: { gte: bounds.start, lt: bounds.end }, ...(activeSetId ? { customer: { assignedSetId: activeSetId } } : {}) },
        select: { id: true, customerId: true, customer: { select: { contracts: { where: { status: 'ENABLED' }, select: { id: true } } } } },
    });
    const clientIds = [...new Set(orders.map((order) => order.customerId))];
    const orderIds = orders.map((order) => order.id);
    const contractIds = [...new Set(orders.flatMap((order) => order.customer.contracts.map((contract) => contract.id)))];
    return {
        ...(clientIds.length > 0 ? { clientIds } : {}),
        ...(contractIds.length > 0 ? { contractIds } : {}),
        ...(orderIds.length > 0 ? { orderIds } : {}),
        ...(activeSetId ? { setId: activeSetId } : {}),
        groupCalories: calorie,
    };
}

async function canManageSet(user: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>, setId: string): Promise<boolean> {
    if (user.role === 'SUPER_ADMIN') return true;
    const allowedAdminIds = await getAllowedAdminIds(user);
    const set = await db.menuSet.findFirst({
        where: { id: setId, OR: [{ adminId: { in: allowedAdminIds } }, { adminId: null }] },
        select: { id: true },
    });
    return Boolean(set);
}

// Helper to manually scale ingredients since we might need more control here or reuse existing
// Reusing scaleIngredients from lib is fine, but we need to fetch specific Dish content from DB
// because Dish ingredients might have been edited.

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser(request);
        if (!user || !canManageGlobalOperationalResource(user.role)) {
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
        if (activeSetId && !(await canManageSet(user, activeSetId))) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        for (const update of updates) {
            if (!(await canManageProvenance(user, update.provenance))) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const dishIds = [...new Set(updates.map((update) => update.dishId))];
        const dishes = await db.dish.findMany({ where: { id: { in: dishIds }, isActive: true, deletedAt: null } });
        if (dishes.length !== dishIds.length) {
            return NextResponse.json({ error: 'Dish not found' }, { status: 404 });
        }

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
        let activeSet: { calorieGroups: Prisma.JsonValue } | null = null;
        if (activeSetId) {
            activeSet = await db.menuSet.findUnique({
                where: { id: activeSetId },
                select: { calorieGroups: true },
            });
        }

        // 3. Use the validated standard dishes for fallback and base info.
        const dishMap = new Map(dishes.map(d => [d.id, d]));

        const inventoryUpdates = new Map<string, number>(); // name -> amount to deduct
        const consumptionRecords: Prisma.JsonValue[] = Array.isArray(plan.consumption) ? [...plan.consumption] : [];

        for (const update of updates) {
            const { dishId, calorie, amount } = update;
            const dId = dishId;

            const dish = dishMap.get(dId);
            if (!dish) continue;

            // Determine Ingredients: Standard or Custom from Set?
            let ingredientsToUse: CookIngredient[] = parseCookIngredients(dish.ingredients);

            if (activeSet) {
                const customIngredients = findCustomCookIngredients(
                    activeSet.calorieGroups,
                    plan!.menuNumber,
                    calorie,
                    dId,
                );
                if (customIngredients) ingredientsToUse = customIngredients;
            }

            const provenance = update.provenance ?? await deriveCookingProvenance(date, activeSetId, calorie, bounds);
            const record = buildCookingConsumptionRecord({
                dishId: dId,
                calorie,
                amount,
                actualIngredients: update.actualIngredients,
                provenance,
            }, ingredientsToUse);
            const consumedIngredients = record.ingredients;
            consumptionRecords.push(JSON.parse(JSON.stringify({
                dishId: record.dishId,
                calorie: record.calorie,
                amount: record.amount,
                ingredients: consumedIngredients,
                provenance: record.provenance,
            })) as Prisma.JsonValue);

            // Accumulate deductions from actual consumption or legacy recipe scaling.
            for (const ing of consumedIngredients) {
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
                data: { cookedStats, consumption: consumptionRecords }
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

        await db.actionLog.create({
            data: {
                adminId: user.id,
                action: 'COOK_DISH',
                entityType: 'COOKING_RECORD',
                entityId: plan.id,
                oldValues: JSON.stringify({ cookedStats: plan.cookedStats, consumption: plan.consumption }),
                newValues: JSON.stringify({ cookedStats, consumption: consumptionRecords }),
                details: buildMutationAuditDetails({ result: 'APPLIED', extra: { mutation: 'COOK_DISH', entity: 'COOKING_RECORD', command: 'finish', resource: 'cooking', date: date.toISOString().slice(0, 10), dishIds, activeSetId: activeSetId ?? null, provenance: consumptionRecords.map((record) => (record && typeof record === 'object' && !Array.isArray(record) ? (record as { provenance?: unknown }).provenance ?? null : null)) } }),
            },
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
