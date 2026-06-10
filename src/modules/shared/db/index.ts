/**
 * Shared database utilities.
 *
 * Re-exports the Prisma client singleton and adds transaction helpers.
 */

// Re-export the existing Prisma singleton for backward compatibility.
// Later steps will move the actual db.ts here.
export { db } from '@/lib/db'
