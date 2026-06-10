import { PrismaClient } from '@prisma/client'

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Copy .env.example to .env.local (or .env) and fill in your database connection string.'
  )
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const SLOW_QUERY_THRESHOLD_MS = 150

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
  ],
})

// Log slow queries (>150ms) as warnings
if (!globalForPrisma.prisma) {
  (db as any).$on('query', (e: { duration: number; query: string; params: string }) => {
    if (e.duration > SLOW_QUERY_THRESHOLD_MS) {
      console.warn(
        JSON.stringify({
          level: 'warn',
          message: 'Slow DB query',
          durationMs: e.duration,
          query: e.query.slice(0, 500),
          params: e.params.slice(0, 200),
          timestamp: new Date().toISOString(),
        }),
      )
    }
  })
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
