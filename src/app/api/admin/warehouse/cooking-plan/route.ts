import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db'
import { buildMutationAuditDetails } from '@/lib/audit/mutation-audit';
import { getAuthUser } from '@/lib/auth-utils';
import { canManageGlobalOperationalResource } from '@/lib/resources/global-policy';
import { cookingPlanWriteSchema, toLocalDayBounds, validateCookingPlanRange } from '@/lib/warehouse/cooking-plan';

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request);
        if (!user || !canManageGlobalOperationalResource(user.role)) {
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

            return NextResponse.json({ id: plan.id, color: plan.color, isActive: plan.isActive, dishes: plan.dishes, cookedStats: plan.cookedStats || {}, consumption: plan.consumption || [] });
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
                id: plan.id,
                date: plan.date.toISOString().split('T')[0],
                menuNumber: plan.menuNumber,
                color: plan.color,
                isActive: plan.isActive,
                dishes: plan.dishes,
                cookedStats: plan.cookedStats || {},
                consumption: plan.consumption || [],
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
        if (!user || !canManageGlobalOperationalResource(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => null);
        const parsed = cookingPlanWriteSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid cooking plan payload' }, { status: 400 });
        }

        const { date: targetDate, menuNumber, color, dishes, consumption } = parsed.data;

        // Upsert the plan based on date
        const plan = await db.dailyCookingPlan.upsert({
            where: {
                date: targetDate,
            },
            update: {
                menuNumber,
                ...(color !== undefined ? { color } : {}),
                dishes,
                ...(consumption !== undefined ? { consumption: consumption as Prisma.InputJsonValue } : {}),
                deletedAt: null,
            },
            create: {
                date: targetDate,
                menuNumber,
                color: color ?? null,
                isActive: true,
                dishes: dishes as Prisma.InputJsonValue,
                ...(consumption !== undefined ? { consumption: consumption as Prisma.InputJsonValue } : {}),
            },
        });

        await db.actionLog.create({ data: { adminId: user.id, action: 'SAVE_COOKING_PLAN', entityType: 'COOKING_PLAN', entityId: plan.id, details: buildMutationAuditDetails({ result: 'APPLIED', extra: { mutation: 'SAVE_COOKING_PLAN', entity: 'COOKING_RECORD' } }), newValues: JSON.stringify({ date: plan.date, menuNumber: plan.menuNumber, color: plan.color }) } });
        return NextResponse.json({ success: true, plan });
    } catch (error) {
        console.error('Error saving cooking plan:', error);
        return NextResponse.json({ error: 'Failed to save cooking plan' }, { status: 500 });
    }
}

const cookingPlanLifecycleSchema = z.object({
    id: z.string().min(1).optional(),
    date: z.string().min(10).optional(),
    deletedAt: z.boolean().optional(),
    isActive: z.boolean().optional(),
}).strict()
    .refine((value) => value.id !== undefined || value.date !== undefined, { message: 'A cooking plan identity is required' })
    .refine((value) => value.deletedAt !== undefined || value.isActive !== undefined, { message: 'A lifecycle state is required' });

export async function PATCH(request: NextRequest) {
    try {
        const user = await getAuthUser(request);
        if (!user || !canManageGlobalOperationalResource(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const parsed = cookingPlanLifecycleSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return NextResponse.json({ error: 'Invalid cooking plan lifecycle payload' }, { status: 400 });
        const bounds = parsed.data.date ? toLocalDayBounds(parsed.data.date) : null;
        if (parsed.data.date && !bounds) return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
        const current = parsed.data.id
            ? await db.dailyCookingPlan.findUnique({ where: { id: parsed.data.id } })
            : bounds
                ? await db.dailyCookingPlan.findFirst({ where: { date: { gte: bounds.start, lte: bounds.end } } })
                : null;
        if (!current) return NextResponse.json({ error: 'Cooking plan not found' }, { status: 404 });
        const plan = await db.dailyCookingPlan.update({ where: { id: current.id }, data: { ...(parsed.data.deletedAt === undefined ? {} : { deletedAt: parsed.data.deletedAt ? new Date() : null }), ...(parsed.data.isActive === undefined ? {} : { isActive: parsed.data.isActive }) } });
        await db.actionLog.create({ data: { adminId: user.id, action: parsed.data.deletedAt === true ? 'DELETE_COOKING_PLAN' : parsed.data.deletedAt === false ? 'RESTORE_COOKING_PLAN' : parsed.data.isActive === false ? 'DISABLE_COOKING_PLAN' : 'ENABLE_COOKING_PLAN', entityType: 'COOKING_PLAN', entityId: plan.id, details: buildMutationAuditDetails({ result: 'APPLIED', extra: { mutation: 'COOKING_PLAN_LIFECYCLE', entity: 'COOKING_RECORD' } }), oldValues: JSON.stringify({ deletedAt: current.deletedAt, isActive: current.isActive }), newValues: JSON.stringify({ deletedAt: plan.deletedAt, isActive: plan.isActive }) } });
        return NextResponse.json({ success: true, plan });
    } catch (error) {
        console.error('Error updating cooking plan lifecycle:', error);
        return NextResponse.json({ error: 'Failed to update cooking plan' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const user = await getAuthUser(request);
        if (!user || !canManageGlobalOperationalResource(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const searchParams = new URL(request.url).searchParams;
        const id = searchParams.get('id');
        const date = searchParams.get('date') || '';
        const bounds = date ? toLocalDayBounds(date) : null;
        if (!id && !bounds) return NextResponse.json({ error: 'A cooking plan identity is required' }, { status: 400 });
        const current = id
            ? await db.dailyCookingPlan.findUnique({ where: { id } })
            : await db.dailyCookingPlan.findFirst({ where: { date: { gte: bounds!.start, lte: bounds!.end } } });
        if (!current) return NextResponse.json({ error: 'Cooking plan not found' }, { status: 404 });
        const plan = await db.dailyCookingPlan.update({ where: { id: current.id }, data: { deletedAt: new Date() } });
        await db.actionLog.create({ data: { adminId: user.id, action: 'DELETE_COOKING_PLAN', entityType: 'COOKING_PLAN', entityId: plan.id, details: buildMutationAuditDetails({ result: 'APPLIED', extra: { mutation: 'DELETE_COOKING_PLAN', entity: 'COOKING_RECORD' } }), oldValues: JSON.stringify({ deletedAt: current.deletedAt }), newValues: JSON.stringify({ deletedAt: plan.deletedAt }) } });
        return NextResponse.json({ success: true, plan });
    } catch (error) {
        console.error('Error deleting cooking plan:', error);
        return NextResponse.json({ error: 'Failed to delete cooking plan' }, { status: 500 });
    }
}
