import { PrismaClient } from '@prisma/client'

/**
 * Prisma client singleton with slow-query logging.
 *
 * Design note (Backend DS — Observability + Testing strategy):
 * The client is created LAZILY. Importing this module must never throw, so that
 * test files (and tooling) can import repositories without a live database.
 * The DATABASE_URL guard fires only on first real use, and integration tests
 * gated behind `RUN_INTEGRATION_TESTS=1` skip cleanly when no DB is configured.
 */

const SLOW_QUERY_THRESHOLD_MS = 150

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env.local (or .env) and fill in your database connection string.'
    )
  }

  const client = new PrismaClient({
    log: [{ emit: 'event', level: 'query' }],
  })

  // Log slow queries (>150ms) as structured warnings.
  ;(client as unknown as {
    $on: (
      event: 'query',
      cb: (e: { duration: number; query: string; params: string }) => void
    ) => void
  }).$on('query', (e) => {
    if (e.duration > SLOW_QUERY_THRESHOLD_MS) {
      console.warn(
        JSON.stringify({
          level: 'warn',
          message: 'Slow DB query',
          durationMs: e.duration,
          query: e.query.slice(0, 500),
          params: e.params.slice(0, 200),
          timestamp: new Date().toISOString(),
        })
      )
    }
  })

  return client
}

function getClient(): PrismaClient {
  const existing = globalForPrisma.prisma
  if (existing) return existing

  const client = createPrismaClient()
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = client
  return client
}

/**
 * Lazy Prisma proxy: behaves exactly like a PrismaClient, but the underlying
 * client (and the DATABASE_URL check) is only instantiated on first property
 * access. This keeps module imports side-effect-free.
 */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient()
    const value = Reflect.get(client as object, prop, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  },
  has(_target, prop) {
    return Reflect.has(getClient() as object, prop)
  },
})
