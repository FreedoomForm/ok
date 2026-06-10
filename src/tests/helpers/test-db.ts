/**
 * Test Database Helper
 *
 * Provides a Prisma client configured for integration tests.
 * Uses a separate test database when TEST_DATABASE_URL is available,
 * otherwise falls back to the main DATABASE_URL.
 *
 * Integration tests should use `describe.skip` pattern when
 * no database is available.
 */

import { PrismaClient } from '@prisma/client'

// Use a separate test database if available
const testDb = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
})

export { testDb }
