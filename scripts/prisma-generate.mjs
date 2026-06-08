import { spawnSync } from 'node:child_process'

function log(message) {
  process.stdout.write(`${message}\n`)
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db?schema=public'
  log('[prisma-generate] DATABASE_URL not set; using a dummy value for generate.')
}

const command = 'npx prisma generate --schema prisma/schema.prisma'
log(`[prisma-generate] Running: ${command}`)
const result = spawnSync(command, { stdio: 'inherit', shell: true, env: process.env })

if (result.error) {
  log(`[prisma-generate] Failed to spawn: ${result.error.message}`)
  process.exit(1)
}

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}
