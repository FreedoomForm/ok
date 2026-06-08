/* ═════════════════════════════════════════════
   Backend Design System v1.0 — DB Helpers
   «Чистая библиотека»

   - Query logging with slow detection
   - Select helpers (no SELECT *)
   - Cursor pagination helpers
   ═════════════════════════════════════════════ */

import { PrismaClient } from '@prisma/client';
import { logger } from '../logger';

const SLOW_QUERY_THRESHOLD_MS = 150;

/**
 * Creates a Prisma client with query logging middleware.
 * Logs duration for each query and warns about slow queries.
 */
export function createInstrumentedPrismaClient(): PrismaClient {
  const client = new PrismaClient();

  // Query logging middleware
  client.$use(async (params, next) => {
    const startTime = Date.now();
    const result = await next(params);
    const durationMs = Date.now() - startTime;

    if (durationMs > SLOW_QUERY_THRESHOLD_MS) {
      logger.slowQuery(`${params.model}.${params.action}`, durationMs, {
        model: params.model,
        action: params.action,
        args: params.args,
      });
    } else {
      logger.debug(`DB: ${params.model}.${params.action} (${durationMs}ms)`, {
        model: params.model,
        action: params.action,
        durationMs,
      });
    }

    return result;
  });

  return client;
}

/**
 * Helper for cursor-based pagination with Prisma.
 *
 * @example
 * const { items, nextCursor, hasMore } = await cursorPaginate(
 *   prisma.order,
 *   {
 *     where: { adminId },
 *     orderBy: { createdAt: 'desc' },
 *     select: orderListSelect,
 *   },
 *   { limit: 25, cursor: requestCursor },
 *   'createdAt'
 * );
 */
export async function cursorPaginate<
  T,
  TWhere extends Record<string, unknown>,
  TOrderBy extends Record<string, unknown>,
  TSelect extends Record<string, unknown>,
>(
  model: {
    findMany: (args: {
      where?: TWhere;
      orderBy?: TOrderBy;
      select?: TSelect;
      take: number;
      cursor?: Record<string, unknown>;
      skip?: number;
    }) => Promise<T[]>;
  },
  baseQuery: {
    where?: TWhere;
    orderBy?: TOrderBy;
    select?: TSelect;
  },
  pagination: {
    limit: number;
    cursor?: string;
  },
  cursorField: string = 'id',
): Promise<{
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  // Fetch one extra to determine if there are more items
  const take = pagination.limit + 1;

  const cursorData = pagination.cursor
    ? decodeCursor(pagination.cursor)
    : null;

  const items = await model.findMany({
    ...baseQuery,
    take,
    ...(cursorData && {
      cursor: { [cursorField]: cursorData[cursorField] },
      skip: 1,
    }),
  });

  const hasMore = items.length > pagination.limit;
  const resultItems = hasMore ? items.slice(0, pagination.limit) : items;

  // Build next cursor from last item
  let nextCursor: string | null = null;
  if (hasMore && resultItems.length > 0) {
    const lastItem = resultItems[resultItems.length - 1] as Record<string, unknown>;
    nextCursor = encodeCursor({ [cursorField]: lastItem[cursorField] });
  }

  return { items: resultItems, nextCursor, hasMore };
}

function encodeCursor(data: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

function decodeCursor(cursor: string): Record<string, unknown> | null {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
}

/**
 * Field selection constants — no SELECT * pattern.
 * These define exactly which fields to return for each DTO level.
 */

export const adminSummarySelect = {
  id: true,
  name: true,
  role: true,
} as const;

export const adminListItemSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  trialEndsAt: true,
  createdAt: true,
} as const;

export const customerSummarySelect = {
  id: true,
  name: true,
  phone: true,
} as const;

export const customerListItemSelect = {
  id: true,
  name: true,
  nickName: true,
  phone: true,
  planType: true,
  isActive: true,
  balance: true,
  assignedSetId: true,
  dailyPrice: true,
  deliveryDays: true,
  createdAt: true,
} as const;

export const orderListItemSelect = {
  id: true,
  orderNumber: true,
  orderStatus: true,
  paymentStatus: true,
  deliveryDate: true,
  deliveryTime: true,
  quantity: true,
  calories: true,
  amount: true,
  specialFeatures: true,
  paymentMethod: true,
  createdAt: true,
  customerId: true,
  courierId: true,
  adminId: true,
} as const;

export const menuSetListItemSelect = {
  id: true,
  name: true,
  description: true,
  menuNumber: true,
  isActive: true,
  adminId: true,
} as const;

export const transactionListItemSelect = {
  id: true,
  amount: true,
  type: true,
  description: true,
  category: true,
  createdAt: true,
  adminId: true,
  salaryRecipientAdminId: true,
  customerId: true,
} as const;
