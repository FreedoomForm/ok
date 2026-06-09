import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/auth';

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session || !['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const dateStr = searchParams.get('date');
        const fromStr = searchParams.get('from');
        const toStr = searchParams.get('to');

        const toLocalDayBounds = (input: string) => {
            const d = new Date(input);
            if (Number.isNaN(d.getTime())) return null;
            const start = new Date(d);
            start.setHours(0, 0, 0, 0);
            const end = new Date(d);
            end.setHours(23, 59, 59, 999);
            return { start, end };
        };

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

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session || !['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { date, menuNumber, dishes } = body;

        if (!date || !menuNumber || !dishes) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const targetDate = new Date(date);

        // Upsert the plan based on date
        const plan = await db.dailyCookingPlan.upsert({
            where: {
                date: targetDate,
            },
            update: {
                menuNumber,
                dishes: dishes as any, // Json type
            },
            create: {
                date: targetDate,
                menuNumber,
                dishes: dishes as any,
            },
        });

        return NextResponse.json({ success: true, plan });
    } catch (error) {
        console.error('Error saving cooking plan:', error);
        return NextResponse.json({ error: 'Failed to save cooking plan' }, { status: 500 });
    }
}
