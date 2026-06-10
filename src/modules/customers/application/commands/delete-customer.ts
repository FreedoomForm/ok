/**
 * Delete Customer Command — Application layer.
 *
 * Handles soft-delete, restore, and permanent-delete for customers.
 * Includes role-based scoping and batch operations.
 */

import { db } from '@/modules/shared/db'
import { getGroupAdminIds, filterCustomerIdsInGroup } from '@/modules/shared/auth/admin-scope'
import type { AuthUser } from '@/modules/shared/auth'
import type { SoftDeleteResult, PermanentDeleteResult } from '../../contracts'
import { BadRequestError, ForbiddenError } from '@/modules/shared/errors'

// ── Soft Delete ──────────────────────────────────────────────────────────────

export interface SoftDeleteCustomersCommand {
  user: AuthUser
  clientIds: string[]
}

export async function executeSoftDeleteCustomers(
  command: SoftDeleteCustomersCommand,
): Promise<SoftDeleteResult> {
  const { user, clientIds } = command

  if (!clientIds || clientIds.length === 0) {
    throw new BadRequestError('Не указаны ID клиентов для удаления')
  }

  const scopedCreatedBy = user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)

  let movedToBin = 0
  let deletedAutoOrders = 0
  let skippedCount = 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get all clients in scope
  const eligibleClients = await db.customer.findMany({
    where: {
      id: { in: clientIds },
      ...(scopedCreatedBy ? { createdBy: { in: scopedCreatedBy } } : {}),
      deletedAt: null, // only soft-delete active clients
    },
    select: { id: true, isActive: true },
  })

  const eligibleIds = new Set(eligibleClients.map((c) => c.id))
  skippedCount = clientIds.length - eligibleIds.size

  for (const client of eligibleClients) {
    // If client is active, delete future auto-generated orders from today onwards
    if (client.isActive) {
      const deletedOrdersResult = await db.order.deleteMany({
        where: {
          customerId: client.id,
          fromAutoOrder: true,
          deliveryDate: { gte: today },
        },
      })
      deletedAutoOrders += deletedOrdersResult.count
    }

    // Soft delete the client
    await db.customer.update({
      where: { id: client.id },
      data: { deletedAt: new Date(), deletedBy: user.id },
    })

    movedToBin++
  }

  return {
    affectedCount: movedToBin,
    skippedCount,
    deletedAutoOrders,
  }
}

// ── Restore ──────────────────────────────────────────────────────────────────

export interface RestoreCustomersCommand {
  user: AuthUser
  clientIds: string[]
}

export async function executeRestoreCustomers(
  command: RestoreCustomersCommand,
): Promise<{ affectedCount: number; skippedCount: number }> {
  const { user, clientIds } = command

  if (!clientIds || clientIds.length === 0) {
    throw new BadRequestError('Не указаны ID клиентов для восстановления')
  }

  const scopedCreatedBy = user.role === 'SUPER_ADMIN' ? null : await getGroupAdminIds(user)

  // Get deleted clients in scope
  const eligibleClients = await db.customer.findMany({
    where: {
      id: { in: clientIds },
      deletedAt: { not: null },
      ...(scopedCreatedBy ? { createdBy: { in: scopedCreatedBy } } : {}),
    },
    select: { id: true },
  })

  const eligibleIds = eligibleClients.map((c) => c.id)
  const skippedCount = clientIds.length - eligibleIds.length

  const result = await db.customer.updateMany({
    where: { id: { in: eligibleIds } },
    data: { deletedAt: null, deletedBy: null },
  })

  return { affectedCount: result.count, skippedCount }
}

// ── Permanent Delete ─────────────────────────────────────────────────────────

export interface PermanentDeleteCustomersCommand {
  user: AuthUser
  clientIds: string[]
}

export async function executePermanentDeleteCustomers(
  command: PermanentDeleteCustomersCommand,
): Promise<PermanentDeleteResult> {
  const { user, clientIds } = command

  if (!clientIds || clientIds.length === 0) {
    throw new BadRequestError('Не указаны ID клиентов для удаления')
  }

  if (user.role !== 'SUPER_ADMIN' && user.role !== 'MIDDLE_ADMIN') {
    throw new ForbiddenError('Недостаточно прав для永久ного удаления')
  }

  let deletedClients = 0
  let deletedOrders = 0

  for (const clientId of clientIds) {
    try {
      // Delete all orders for this client
      const deletedOrdersResult = await db.order.deleteMany({
        where: { customerId: clientId },
      })
      deletedOrders += deletedOrdersResult.count

      // Permanently delete the client
      await db.customer.delete({
        where: { id: clientId },
      })

      deletedClients++
    } catch (dbError) {
      console.error(`Error permanently deleting client ${clientId}:`, dbError)
    }
  }

  return { deletedClients, deletedOrders }
}
