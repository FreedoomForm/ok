import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/auth';

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session || !['SUPER_ADMIN', 'MIDDLE_ADMIN'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const dateStr = searchParams.get('date');

        if (!dateStr) {
            return NextResponse.json({ error: 'Date is required' }, { status: 400 });
        }

        const date = new Date(dateStr);

        // Find plan for this date
        const plan = await db.dailyCookingPlan.findFirst({
            where: {
                date: {
                    gte: new Date(date.setHours(0, 0, 0, 0)),
                    lt: new Date(date.setHours(23, 59, 59, 999)),
                }
            },
        });

        if (!plan) {
            return NextResponse.json({ dishes: {} });
        }

        return NextResponse.json({ dishes: plan.dishes });
    } catch (error) {
        console.error('Error fetching cooking plan:', error);
        return NextResponse.json({ error: 'Failed to fetch cooking plan' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session || !['SUPER_ADMIN', 'MIDDLE_ADMIN'].includes(session.user.role)) {
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
