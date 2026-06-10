import { spawnSync } from 'node:child_process'

function log(message) {
  process.stdout.write(`${message}\n`)
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db?schema=public'
  log('[prisma-generate] DATABASE_URL not set; using a dummy value for generate.')
}

// `directUrl` in schema.prisma requires DIRECT_URL to be defined for the schema
// to parse (Prisma does NOT silently fall back to DATABASE_URL). For non-migration
// commands like `generate` the value is unused, so mirror DATABASE_URL here.
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL
  log('[prisma-generate] DIRECT_URL not set; defaulting it to DATABASE_URL.')
}

const command = './node_modules/.bin/prisma generate --schema prisma/schema.prisma'
log(`[prisma-generate] Running: ${command}`)
const result = spawnSync(command, { stdio: 'inherit', shell: true, env: process.env })

if (result.error) {
  log(`[prisma-generate] Failed to spawn: ${result.error.message}`)
  process.exit(1)
}

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}
