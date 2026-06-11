/**
 * Shared database utilities.
 *
 * Re-exports the Prisma client singleton with slow-query logging middleware
 * and adds transaction helpers.
 */

export { db } from '@/lib/db'
