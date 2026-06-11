# Database Migrations Runbook

> DB Design System v1.0 — Migration discipline (Expand/Contract, reversible,
> production-safe). This project historically used `prisma db push` (no history,
> no rollback). We now have a **versioned migration history** under
> `prisma/migrations/`.

## Why this exists

`prisma db push` mutates the schema with **no audit trail and no rollback plan**.
For a senior-grade backend, every schema change must be:

- versioned in Git,
- reviewable as SQL,
- applied the same way in every environment,
- safe to run on production (short locks, batched backfills).

## One-time: adopt the baseline on an existing database

Your production/preview databases already contain these tables (created earlier by
`db push`). Do **not** run `migrate dev` or `migrate reset` against them — that
would drop data. Instead, mark the baseline as already applied:

```bash
# Point DATABASE_URL at the target DB (use a NEW, rotated credential).
export DATABASE_URL="postgresql://...:...@.../neondb?sslmode=require"

# 1. Verify the live schema matches the baseline (should report "No difference").
npm run db:migrate:diff

# 2. Mark the baseline migration as already applied (records it, runs no SQL).
npm run db:migrate:resolve-baseline

# 3. Confirm migration state is clean.
npm run db:migrate:status
```

For a **fresh/empty** database, just run:

```bash
npm run db:migrate:deploy
```

## Day-to-day: making a schema change

1. Edit `prisma/schema.prisma`.
2. Create the migration locally (against a scratch/dev DB):
   ```bash
   npm run db:migrate -- --name short_descriptive_name
   ```
3. Review the generated SQL in `prisma/migrations/<timestamp>_<name>/migration.sql`.
4. Commit schema + migration together.
5. CI/CD applies it with:
   ```bash
   npm run db:migrate:deploy
   ```

## Production-safety rules (DB DS §25)

- **Expand → Contract** for breaking changes:
  1. Add new nullable column.
  2. Deploy app writing both old + new.
  3. Backfill in **batches** (not one giant `UPDATE`).
  4. Deploy app reading new column.
  5. Add `NOT NULL`/constraints.
  6. Remove old column in a later migration.
- Never add `NOT NULL` without a default or a completed backfill.
- Create indexes on large tables `CONCURRENTLY` (edit the generated SQL).
- Keep `lock_timeout` / `statement_timeout` low for migration sessions.
- Every migration must be tested on a copy of production data first.

## Connection URLs (Neon)

`schema.prisma` declares both `url` and `directUrl`:

- `DATABASE_URL` — **pooled** runtime connection (Neon host with `-pooler`).
- `DIRECT_URL` — **direct/non-pooled** connection used by `migrate`/`db push`.

`DIRECT_URL` **must be set** wherever Prisma parses the schema for a
migrate/`db push` command — Prisma does *not* fall back to `DATABASE_URL` and
hard-fails (P1012) if the env var is missing. To keep single-URL environments
(e.g. Vercel) working, the build tooling defaults `DIRECT_URL` to `DATABASE_URL`
when it is unset:

- `scripts/prisma-generate.mjs` (used by `typecheck`)
- `scripts/vercel-db-push.mjs` (used by `npm run build` on Vercel)

Set a real direct (non-pooled) `DIRECT_URL` in production/CI secrets to use a
dedicated migration connection; otherwise the pooled `DATABASE_URL` is reused.

## Schema hygiene audit (read-only)

Columns in this project are Prisma **camelCase** (`createdAt`, `deletedAt`, …)
even though tables are snake_case via `@@map`. Run the lifecycle audit (handles
both naming styles, SELECT-only):

```bash
DIRECT_URL="postgresql://..." npm run db:audit
# or directly:
psql "$DIRECT_URL" -f scripts/db-audit.sql
```

It reports, per table: `has_id`, `has_tenant_scope`, `has_created_at`,
`has_updated_at`, `has_deleted_at`, `has_version`.

## CI note

`npm run build` still calls `scripts/vercel-db-push.mjs`, which **skips unless on
Vercel with `PRISMA_DB_PUSH_ON_BUILD=true`**. To migrate to the safer flow, set
`PRISMA_DB_PUSH_ON_BUILD=false` and run `npm run db:migrate:deploy` as a separate
deploy step (see `docs/architecture/06-deployment-runbook.md`).
