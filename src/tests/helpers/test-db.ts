/**
 * Test Database Helper
 *
 * Provides a Prisma client configured for integration tests.
 * Uses a separate test database when TEST_DATABASE_URL is available,
 * otherwise falls back to the main DATABASE_URL.
 *
 * The client is created LAZILY via a Proxy so that merely importing an
 * integration-test file never throws when no database is configured. Integration
 * tests skip cleanly unless `RUN_INTEGRATION_TESTS=1` is set.
 */

import { PrismaClient } from '@prisma/client'

let client: PrismaClient | undefined

function getTestClient(): PrismaClient {
  if (client) return client

  const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      'No test database configured. Set TEST_DATABASE_URL (or DATABASE_URL) and RUN_INTEGRATION_TESTS=1 to run integration tests.'
    )
  }

  client = new PrismaClient({
    datasources: { db: { url } },
  })
  return client
}

export const testDb: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const c = getTestClient()
    const value = Reflect.get(c as object, prop, receiver)
    return typeof value === 'function' ? value.bind(c) : value
  },
  has(_target, prop) {
    return Reflect.has(getTestClient() as object, prop)
  },
})
