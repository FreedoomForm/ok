#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env.postgres ]; then
  echo "Missing .env.postgres with DATABASE_URL for Postgres" >&2
  exit 1
fi

# schema.prisma is the canonical PostgreSQL schema used by CI and Vercel deployment.

# Load Postgres env
set -a
source ./.env.postgres
set +a

# Generate client and push schema (or migrate deploy if migrations exist)
which npx >/dev/null 2>&1 || { echo "npx not found"; exit 1; }

npx prisma generate
# Try migrate deploy first; fallback to db push
if ! npx prisma migrate deploy; then
  npx prisma db push
fi

# Seed data (idempotent)
npx tsx prisma/seed.ts

echo "Postgres deploy complete."
