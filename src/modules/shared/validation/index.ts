/* ═════════════════════════════════════════════
   Backend Design System v1.0 — Validation Helpers
   «Чистая библиотека»

   - Safe parsing with AppError integration
   - Common validation schemas
   ═════════════════════════════════════════════ */

import { z } from 'zod';
import { Errors } from '../errors';

export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.') || 'root';
      details[path] = issue.message;
    }
    throw Errors.validationFailed(details);
  }
  return result.data;
}

// ── Common Schemas ──

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
  sort: z.string().optional(),
});

export const uuidSchema = z.string().uuid();

export const emailSchema = z.string().email().toLowerCase().trim();

export const phoneSchema = z.string().min(7).max(20);

export const orderStatusSchema = z.enum([
  'NEW',
  'PENDING',
  'IN_PROCESS',
  'IN_DELIVERY',
  'PAUSED',
  'DELIVERED',
  'CANCELED',
  'FAILED',
]);

export const paymentStatusSchema = z.enum(['PAID', 'UNPAID', 'PARTIAL']);

export const paymentMethodSchema = z.enum(['CASH', 'CARD', 'TRANSFER']);

export const planTypeSchema = z.enum(['CLASSIC', 'INDIVIDUAL', 'DIABETIC']);

export const adminRoleSchema = z.enum(['SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN', 'COURIER', 'WORKER']);

export const orderTypeSchema = z.enum(['MORNING', 'EVENING']);

export const transactionTypeSchema = z.enum(['INCOME', 'EXPENSE']);
