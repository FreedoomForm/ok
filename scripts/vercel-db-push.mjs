import { spawnSync } from 'node:child_process'

function log(message) {
  process.stdout.write(`${message}\n`)
}

const isVercel = !!process.env.VERCEL
// Schema changes should be applied by an explicit migration/deploy step, not by a
// normal application build. Keep the legacy behavior available only when explicitly opted in.
const shouldPush = process.env.PRISMA_DB_PUSH_ON_BUILD === 'true'

if (!isVercel) {
  log('[vercel-db-push] Skipping: not running on Vercel.')
  process.exit(0)
}

if (!shouldPush) {
  log('[vercel-db-push] Skipping: schema push is opt-in; use a migration/deploy step or set PRISMA_DB_PUSH_ON_BUILD=true explicitly.')
  process.exit(0)
}

if (!process.env.DATABASE_URL) {
  log('[vercel-db-push] Skipping: DATABASE_URL is not set.')
  process.exit(0)
}

log('[vercel-db-push] Running: prisma db push --skip-generate')
const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['prisma', 'db', 'push', '--skip-generate'],
  { stdio: 'inherit' }
)

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}
