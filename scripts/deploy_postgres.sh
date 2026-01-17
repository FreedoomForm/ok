#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env.postgres ]; then
  echo "Missing .env.postgres with DATABASE_URL for Postgres" >&2
  exit 1
fi

# Backup current schema and switch to Postgres schema
cp prisma/schema.prisma prisma/schema.prisma.bak || true
cp prisma/schema.postgres.prisma prisma/schema.prisma

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
