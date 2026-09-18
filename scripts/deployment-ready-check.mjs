#!/usr/bin/env node
// §16 deployment row: "migration status; remote SHA; Vercel-ready deployment check".
// Compares origin/main HEAD with the latest production deployment on Vercel,
// asserts the deployment is READY, and reports the production migration status
// from the /api/system-health endpoint when HEALTHCHECK_KEY and the base URL
// are available. Exit code 0 only when the deployment is Vercel-ready.
//
// Env:
//   VERCEL_TOKEN       — Vercel API token (required)
//   VERCEL_PROJECT_ID  — Vercel project id (default: prj_bPbYgr0PHF6G34XVPY3hehGOQskd)
//   HEALTHCHECK_KEY    — system-health access key (optional)
//   HEALTHCHECK_URL    — system-health base URL (default: https://ok-two-eta.vercel.app)

import { execSync } from 'node:child_process'

const TOKEN = process.env.VERCEL_TOKEN
const PROJECT = process.env.VERCEL_PROJECT_ID || 'prj_bPbYgr0PHF6G34XVPY3hehGOQskd'
const HEALTH_URL = process.env.HEALTHCHECK_URL || 'https://ok-two-eta.vercel.app'

function fail(message) {
  process.stdout.write(`FAIL ${message}\n`)
  process.exit(1)
}

if (!TOKEN) fail('VERCEL_TOKEN is not set')

const localSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
const remoteSha = execSync('git ls-remote origin refs/heads/main', { encoding: 'utf8' }).split('\t')[0].trim()

const deploys = await fetch(
  `https://api.vercel.com/v6/deployments?projectId=${PROJECT}&target=production&limit=1`,
  { headers: { Authorization: `Bearer ${TOKEN}` } },
).then((r) => r.json())

const latest = deploys.deployments?.[0]
if (!latest) fail('no production deployment found')
const deploySha = latest.meta?.githubCommitSha || ''
const state = latest.readyState

const rows = [
  ['local HEAD', localSha.slice(0, 7)],
  ['remote main', remoteSha.slice(0, 7)],
  ['deployed SHA', deploySha.slice(0, 7)],
  ['deploy state', state],
]
for (const [k, v] of rows) process.stdout.write(`${k.padEnd(14)} ${v}\n`)

if (remoteSha !== localSha) fail('local HEAD differs from origin/main — push first')
if (deploySha !== remoteSha) fail('production deployment is not on origin/main HEAD')
if (state !== 'READY') fail('production deployment is not READY')

process.stdout.write('deploy sha == main HEAD and READY: OK\n')

if (process.env.HEALTHCHECK_KEY) {
  try {
    const report = await fetch(`${HEALTH_URL}/api/system-health`, {
      headers: { 'x-health-key': process.env.HEALTHCHECK_KEY },
    }).then((r) => r.json())
    const db = report.db || {}
    process.stdout.write(`db ping        ${db.ping?.ok ? 'OK ' : 'FAIL'} ${db.ping?.ms ?? '?'}ms\n`)
    process.stdout.write(`admins count   ${db.adminCount ?? '?'}\n`)
    process.stdout.write(`migrations     ${db.migrations ? JSON.stringify(db.migrations) : (db.migrationError || 'unknown')}\n`)
    process.stdout.write(`nextauthSecret ${report.env?.auth?.nextauthSecret?.set ? 'set' : 'MISSING'}\n`)
  } catch (error) {
    process.stdout.write(`health probe skipped: ${error.message}\n`)
  }
} else {
  process.stdout.write('health probe skipped: HEALTHCHECK_KEY not set\n')
}

process.stdout.write('VERCEL-READY: yes\n')
