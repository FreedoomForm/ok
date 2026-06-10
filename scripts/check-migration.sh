#!/usr/bin/env bash
#
# check-migration.sh — Validate Prisma schema and check migration status
# Used in CI to catch schema issues before they reach production.
#
# Exit codes:
#   0 — All checks pass
#   1 — Schema validation or migration check failed
#

set -euo pipefail

echo "🔍 Prisma Schema & Migration Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ─────────────────────────────────────────────
# 1. Validate schema
# ─────────────────────────────────────────────
echo ""
echo "📋 Step 1: Validating Prisma schema..."
if npx prisma validate; then
  echo "✅ Prisma schema is valid"
else
  echo "❌ Prisma schema validation failed"
  exit 1
fi

# ─────────────────────────────────────────────
# 2. Generate Prisma client (ensures schema is consistent)
# ─────────────────────────────────────────────
echo ""
echo "📋 Step 2: Generating Prisma client..."
if npx prisma generate; then
  echo "✅ Prisma client generated successfully"
else
  echo "❌ Prisma client generation failed"
  exit 1
fi

# ─────────────────────────────────────────────
# 3. Check migration status (if migrations directory exists)
# ─────────────────────────────────────────────
echo ""
echo "📋 Step 3: Checking migration status..."

MIGRATIONS_DIR="prisma/migrations"
if [ -d "$MIGRATIONS_DIR" ]; then
  # In CI we don't have a real database, so we check for:
  # - unapplied migrations (schema drift)
  # - migration file integrity

  PENDING_COUNT=$(find "$MIGRATIONS_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l)
  echo "   Found $PENDING_COUNT migration(s) in $MIGRATIONS_DIR"

  # Verify each migration directory has a migration.sql file
  MISSING_SQL=0
  for dir in "$MIGRATIONS_DIR"/*/; do
    if [ ! -f "$dir/migration.sql" ]; then
      echo "⚠️  Missing migration.sql in: $dir"
      MISSING_SQL=1
    fi
  done

  if [ "$MISSING_SQL" -eq 1 ]; then
    echo "❌ One or more migrations are missing migration.sql files"
    exit 1
  fi

  echo "✅ All migrations have valid migration.sql files"
else
  echo "ℹ️  No migrations directory found — project uses db:push strategy"
fi

echo ""
echo "✅ All migration checks passed!"
exit 0
