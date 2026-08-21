import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
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

        // Backward-compatible single-day fetch
        if (dateStr) {
            const bounds = toLocalDayBounds(dateStr);
            if (!bounds) {
                return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
            }

            const plan = await db.dailyCookingPlan.findFirst({
                where: {
                    date: {
                        gte: bounds.start,
                        lte: bounds.end,
                    }
                },
            });

            if (!plan) {
                return NextResponse.json({ dishes: {}, cookedStats: {} });
            }

            return NextResponse.json({ dishes: plan.dishes, cookedStats: plan.cookedStats || {} });
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

        const { date: targetDate, menuNumber, dishes } = parsed.data;

        // Upsert the plan based on date
        const plan = await db.dailyCookingPlan.upsert({
            where: {
                date: targetDate,
            },
            update: {
                menuNumber,
                dishes,
            },
            create: {
                date: targetDate,
                menuNumber,
                dishes: dishes as Prisma.InputJsonValue,
            },
        });

        return NextResponse.json({ success: true, plan });
    } catch (error) {
        console.error('Error saving cooking plan:', error);
        return NextResponse.json({ error: 'Failed to save cooking plan' }, { status: 500 });
    }
}
