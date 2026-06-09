import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/auth';
import { z } from 'zod';
import { getOwnerAdminId } from '@/lib/admin-scope';

const BuyIngredientsSchema = z.object({
    items: z.array(z.object({
        name: z.string().trim().min(1),
        amount: z.number().positive(),
        costPerUnit: z.number().nonnegative(),
        unit: z.string().trim().min(1).default('kg'),
        kcalPerGram: z.number().nonnegative().optional(),
    }))
});

const normalizeUnit = (unit: string): string => {
    const value = unit.trim().toLowerCase();
    if (value === 'g') return 'gr';
    if (value === 'pc' || value === 'sht' || value === 'don' || value === "bo'lak") return 'pcs';
    return value;
};

const massUnits: Record<string, number> = { mg: 0.001, gr: 1, kg: 1000 };
const volumeUnits: Record<string, number> = { ml: 1, l: 1000 };
const countUnits: Record<string, number> = { pcs: 1, dona: 1 };

const convertAmount = (amount: number, fromUnit: string, toUnit: string): number | null => {
    const from = normalizeUnit(fromUnit);
    const to = normalizeUnit(toUnit);
    if (from === to) return amount;
    if (massUnits[from] && massUnits[to]) return (amount * massUnits[from]) / massUnits[to];
    if (volumeUnits[from] && volumeUnits[to]) return (amount * volumeUnits[from]) / volumeUnits[to];
    if (countUnits[from] && countUnits[to]) return amount;
    return null;
};

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session || !['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const validation = BuyIngredientsSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data', details: validation.error }, { status: 400 });
        }

        const { items } = validation.data;
        const effectiveAdminId =
            session.user.role === 'LOW_ADMIN'
                ? (await getOwnerAdminId(session.user)) ?? session.user.id
                : session.user.id;
        const adminId = effectiveAdminId;

        const totalCost = items.reduce((sum, item) => sum + (item.amount * item.costPerUnit), 0);

        const result = await db.$transaction(async (tx) => {
            const admin = await tx.admin.findUnique({
                where: { id: adminId },
                select: { companyBalance: true }
            });
            if (!admin) {
                throw new Error('ADMIN_NOT_FOUND');
            }
            if (admin.companyBalance < totalCost) {
                throw new Error('INSUFFICIENT_BALANCE');
            }

            // 1. Create Transaction (Expense)
            const transaction = await tx.transaction.create({
                data: {
                    amount: totalCost,
                    type: 'EXPENSE',
                    category: 'INGREDIENT_PURCHASE',
                    description: `Ingredient purchase: ${items.map(i => `${i.name} (${i.amount}${i.unit})`).join(', ')}`,
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
            for (const purchased of items) {
                const existing = await tx.warehouseItem.findUnique({
                    where: { name: purchased.name }
                });

                if (!existing) {
                    await tx.warehouseItem.create({
                        data: {
                            name: purchased.name,
                            amount: purchased.amount,
                            unit: normalizeUnit(purchased.unit),
                            kcalPerGram: typeof purchased.kcalPerGram === 'number' && Number.isFinite(purchased.kcalPerGram) ? purchased.kcalPerGram : null,
                            pricePerUnit: purchased.costPerUnit,
                            priceUnit: normalizeUnit(purchased.unit),
                        }
                    });
                    continue;
                }

                const convertedAmount = convertAmount(purchased.amount, purchased.unit, existing.unit);
                if (convertedAmount === null) {
                    throw new Error(`UNIT_MISMATCH:${purchased.name}:${existing.unit}:${purchased.unit}`);
                }

                await tx.warehouseItem.update({
                    where: { name: purchased.name },
                    data: {
                        amount: { increment: convertedAmount },
                        ...(typeof purchased.kcalPerGram === 'number' && Number.isFinite(purchased.kcalPerGram)
                            ? { kcalPerGram: purchased.kcalPerGram }
                            : {}),
                        pricePerUnit: purchased.costPerUnit,
                        priceUnit: normalizeUnit(purchased.unit),
                        updatedAt: new Date()
                    }
                });
            }

            return transaction;
        });

        try {
            await db.actionLog.create({
                data: {
                    adminId: session.user.id,
                    action: 'BUY_INGREDIENTS',
                    entityType: 'TRANSACTION',
                    entityId: result.id,
                    description: 'Bought ingredients'
                }
            })
        } catch {
            // ignore logging failures
        }

        return NextResponse.json({ success: true, transaction: result });

    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'INSUFFICIENT_BALANCE') {
                return NextResponse.json({ error: 'Insufficient company balance' }, { status: 400 });
            }
            if (error.message === 'ADMIN_NOT_FOUND') {
                return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
            }
            if (error.message.startsWith('UNIT_MISMATCH:')) {
                const [, name, existingUnit, newUnit] = error.message.split(':');
                return NextResponse.json(
                    { error: `Unit mismatch for ${name}: warehouse uses ${existingUnit}, attempted to buy in ${newUnit}` },
                    { status: 400 }
                );
            }
        }

        console.error('Error buying ingredients:', error);
        return NextResponse.json({ error: 'Failed to process purchase' }, { status: 500 });
    }
}
