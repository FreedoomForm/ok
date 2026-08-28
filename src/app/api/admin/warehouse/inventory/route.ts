import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-utils';
import { canManageGlobalOperationalResource } from '@/lib/resources/global-policy';
import { inventorySchema } from '@/lib/warehouse/inventory';

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser(request);
        if (!user || !canManageGlobalOperationalResource(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const items = await db.warehouseItem.findMany({
            where: { isActive: true, deletedAt: null },
            orderBy: { name: 'asc' },
        });

        // Convert array to object map for frontend compatibility { [name]: amount }
        const inventoryMap: Record<string, number> = {};
        items.forEach(item => {
            inventoryMap[item.name] = item.amount;
        });

        return NextResponse.json(inventoryMap);
    } catch (error) {
        console.error('Error fetching inventory:', error);
        return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser(request);
        if (!user || !canManageGlobalOperationalResource(user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => null);
        const parsed = inventorySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid inventory payload' }, { status: 400 });
        }

        const inventory = parsed.data;

        // Use transaction to update all items
        const updates = Object.entries(inventory).map(([name, amount]) => {
            return db.warehouseItem.upsert({
                where: { name },
                update: { amount, isActive: true, deletedAt: null },
                create: { name, amount, isActive: true },
            });
        });

        await db.$transaction(updates);

        return NextResponse.json({ success: true, count: updates.length });
    } catch (error) {
        console.error('Error saving inventory:', error);
        return NextResponse.json({ error: 'Failed to save inventory' }, { status: 500 });
    }
}
