import { spawnSync } from 'node:child_process'

function log(message) {
  process.stdout.write(`${message}\n`)
}

const isVercel = !!process.env.VERCEL
const vercelEnv = process.env.VERCEL_ENV // 'production' | 'preview' | 'development'
const shouldPush =
  process.env.PRISMA_DB_PUSH_ON_BUILD === 'true' ||
  (vercelEnv === 'production' && process.env.PRISMA_DB_PUSH_ON_BUILD !== 'false')

if (!isVercel) {
  log('[vercel-db-push] Skipping: not running on Vercel.')
  process.exit(0)
}

if (!shouldPush) {
  log('[vercel-db-push] Skipping: PRISMA_DB_PUSH_ON_BUILD not enabled.')
  process.exit(0)
}

if (!process.env.DATABASE_URL) {
  log('[vercel-db-push] Skipping: DATABASE_URL is not set.')
  process.exit(0)
}

log('[vercel-db-push] Running: ./node_modules/.bin/prisma db push --skip-generate')
const result = spawnSync(
  './node_modules/.bin/prisma',
  ['db', 'push', '--skip-generate'],
  { stdio: 'inherit' }
)

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}
