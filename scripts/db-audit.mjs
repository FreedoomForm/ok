#!/usr/bin/env node
/**
 * Read-only DB hygiene audit runner.
 *
 * Runs scripts/db-audit.sql against the configured database and prints a table of
 * lifecycle/identity columns per table. SELECT-only — never mutates data.
 *
 * Connection precedence: DIRECT_URL -> DATABASE_URL (direct/non-pooled preferred).
 * Requires `psql` on PATH. Exits non-zero if no connection string is configured.
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sqlFile = path.join(__dirname, 'db-audit.sql')

const url = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!url) {
  console.error(
    '[db-audit] No connection string. Set DIRECT_URL (preferred) or DATABASE_URL.'
  )
  process.exit(1)
}

const result = spawnSync('psql', [url, '-f', sqlFile], {
  stdio: 'inherit',
  env: process.env,
})

if (result.error) {
  console.error(`[db-audit] Failed to run psql: ${result.error.message}`)
  console.error('[db-audit] Ensure the PostgreSQL client (psql) is installed.')
  process.exit(1)
}
process.exit(result.status ?? 0)
