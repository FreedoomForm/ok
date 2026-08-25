import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getAuthUser, hasRole } from '@/lib/auth-utils';
import { cookingPlanWriteSchema, toLocalDayBounds, validateCookingPlanRange } from '@/lib/warehouse/cooking-plan';

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request);
        if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const dateStr = searchParams.get('date');
        const fromStr = searchParams.get('from');
        const toStr = searchParams.get('to');
        const showDeleted = searchParams.get('showDeleted') === 'true';

        // Backward-compatible single-day fetch
        if (dateStr) {
            const bounds = toLocalDayBounds(dateStr);
            if (!bounds) {
                return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
            }

            const plan = await db.dailyCookingPlan.findFirst({
                where: {
                    deletedAt: showDeleted ? { not: null } : null,
                    date: {
                        gte: bounds.start,
                        lte: bounds.end,
                    }
                },
            });

            if (!plan) {
                return NextResponse.json({ dishes: {}, cookedStats: {} });
            }

            return NextResponse.json({ color: plan.color, dishes: plan.dishes, cookedStats: plan.cookedStats || {} });
        }

        // Period/range fetch for audits
        if (!fromStr && !toStr) {
            return NextResponse.json({ error: 'Date is required' }, { status: 400 });
        }

        const fromBounds = fromStr ? toLocalDayBounds(fromStr) : null;
        const toBounds = toStr ? toLocalDayBounds(toStr) : null;

        if (fromStr && !fromBounds) return NextResponse.json({ error: 'Invalid from' }, { status: 400 });
        if (toStr && !toBounds) return NextResponse.json({ error: 'Invalid to' }, { status: 400 });

        const start = fromBounds?.start ?? toBounds!.start;
        const end = toBounds?.end ?? fromBounds!.end;
        const rangeError = validateCookingPlanRange(start, end);
        if (rangeError) return NextResponse.json({ error: rangeError }, { status: 400 });

        const plans = await db.dailyCookingPlan.findMany({
            where: {
                deletedAt: showDeleted ? { not: null } : null,
                date: {
                    gte: start,
                    lte: end,
                },
            },
            orderBy: { date: 'asc' },
        });

        return NextResponse.json({
            plans: plans.map((plan) => ({
                date: plan.date.toISOString().split('T')[0],
                menuNumber: plan.menuNumber,
                color: plan.color,
                dishes: plan.dishes,
                cookedStats: plan.cookedStats || {},
            })),
        });
    } catch (error) {
        console.error('Error fetching cooking plan:', error);
        return NextResponse.json({ error: 'Failed to fetch cooking plan' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser(request);
        if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => null);
        const parsed = cookingPlanWriteSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid cooking plan payload' }, { status: 400 });
        }

        const { date: targetDate, menuNumber, color, dishes } = parsed.data;

        // Upsert the plan based on date
        const plan = await db.dailyCookingPlan.upsert({
            where: {
                date: targetDate,
            },
            update: {
                menuNumber,
                ...(color !== undefined ? { color } : {}),
                dishes,
                deletedAt: null,
            },
            create: {
                date: targetDate,
                menuNumber,
                color: color ?? null,
                dishes: dishes as Prisma.InputJsonValue,
            },
        });

        await db.actionLog.create({ data: { adminId: user.id, action: 'SAVE_COOKING_PLAN', entityType: 'COOKING_PLAN', entityId: plan.id, newValues: JSON.stringify({ date: plan.date, menuNumber: plan.menuNumber, color: plan.color }) } });
        return NextResponse.json({ success: true, plan });
    } catch (error) {
        console.error('Error saving cooking plan:', error);
        return NextResponse.json({ error: 'Failed to save cooking plan' }, { status: 500 });
    }
}

const cookingPlanLifecycleSchema = z.object({
    date: z.string().min(10),
    deletedAt: z.boolean(),
}).strict();

export async function PATCH(request: NextRequest) {
    try {
        const user = await getAuthUser(request);
        if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const parsed = cookingPlanLifecycleSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return NextResponse.json({ error: 'Invalid cooking plan lifecycle payload' }, { status: 400 });
        const bounds = toLocalDayBounds(parsed.data.date);
        if (!bounds) return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
        const current = await db.dailyCookingPlan.findFirst({ where: { date: { gte: bounds.start, lte: bounds.end } } });
        if (!current) return NextResponse.json({ error: 'Cooking plan not found' }, { status: 404 });
        const plan = await db.dailyCookingPlan.update({ where: { id: current.id }, data: { deletedAt: parsed.data.deletedAt ? new Date() : null } });
        await db.actionLog.create({ data: { adminId: user.id, action: parsed.data.deletedAt ? 'DELETE_COOKING_PLAN' : 'RESTORE_COOKING_PLAN', entityType: 'COOKING_PLAN', entityId: plan.id, oldValues: JSON.stringify({ deletedAt: current.deletedAt }), newValues: JSON.stringify({ deletedAt: plan.deletedAt }) } });
        return NextResponse.json({ success: true, plan });
    } catch (error) {
        console.error('Error updating cooking plan lifecycle:', error);
        return NextResponse.json({ error: 'Failed to update cooking plan' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const user = await getAuthUser(request);
        if (!user || !hasRole(user, ['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const date = new URL(request.url).searchParams.get('date') || '';
        const bounds = toLocalDayBounds(date);
        if (!bounds) return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
        const current = await db.dailyCookingPlan.findFirst({ where: { date: { gte: bounds.start, lte: bounds.end } } });
        if (!current) return NextResponse.json({ error: 'Cooking plan not found' }, { status: 404 });
        const plan = await db.dailyCookingPlan.update({ where: { id: current.id }, data: { deletedAt: new Date() } });
        await db.actionLog.create({ data: { adminId: user.id, action: 'DELETE_COOKING_PLAN', entityType: 'COOKING_PLAN', entityId: plan.id, oldValues: JSON.stringify({ deletedAt: current.deletedAt }), newValues: JSON.stringify({ deletedAt: plan.deletedAt }) } });
        return NextResponse.json({ success: true, plan });
    } catch (error) {
        console.error('Error deleting cooking plan:', error);
        return NextResponse.json({ error: 'Failed to delete cooking plan' }, { status: 500 });
    }
}
