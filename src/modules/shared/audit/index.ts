/**
 * Audit logging for dangerous/sensitive actions.
 *
 * Writes to the `action_logs` table via Prisma.
 * Used for tracking administrative actions like:
 * - User creation/deletion
 * - Role changes
 * - Data imports
 * - Password resets
 * - Trial expirations
 */

import { db } from '@/modules/shared/db'
import { logger } from '@/modules/shared/logger'

export interface AuditEventInput {
  /** Admin ID performing the action */
  adminId: string
  /** Action type (e.g. 'LOGIN', 'DELETE_ADMIN', 'IMPORT_XLSX') */
  action: string
  /** Entity type (e.g. 'ADMIN', 'ORDER', 'CUSTOMER') */
  entityType?: string
  /** Entity ID affected */
  entityId?: string
  /** JSON string of previous values */
  oldValues?: string
  /** JSON string of new values */
  newValues?: string
  /** Human-readable description */
  description?: string
  /** Additional details as JSON string */
  details?: string
  /** Request ID for tracing */
  requestId?: string
}

/**
 * Log an audit event to the action_logs table.
 *
 * Non-blocking: errors are logged but don't throw, since audit logging
 * should never break the main request flow.
 *
 * @example
 * ```ts
 * await logAuditEvent({
 *   adminId: user.id,
 *   action: 'DELETE_ADMIN',
 *   entityType: 'ADMIN',
 *   entityId: targetId,
 *   description: `Deleted admin ${targetEmail}`,
 * })
 * ```
 */
export async function logAuditEvent(event: AuditEventInput): Promise<void> {
  try {
    await db.actionLog.create({
      data: {
        adminId: event.adminId,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        oldValues: event.oldValues,
        newValues: event.newValues,
        description: event.description,
        details: event.details,
      },
    })
  } catch (error) {
    // Audit logging must never break the request
    logger.error('Failed to write audit event', {
      action: event.action,
      adminId: event.adminId,
      entityType: event.entityType,
      entityId: event.entityId,
      requestId: event.requestId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
