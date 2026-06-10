-- =============================================================================
-- DB Lifecycle / Hygiene Audit (read-only)
-- =============================================================================
-- DB Design System v1.0 — verifies that every base table carries the expected
-- lifecycle/identity columns. Handles BOTH snake_case and Prisma camelCase
-- naming, because columns in this project are camelCase (createdAt, deletedAt…)
-- while tables are snake_case via @@map. Run against a copy/replica; SELECT-only.
--
-- Usage:
--   psql "$DIRECT_URL" -f scripts/db-audit.sql
--   (or)  npm run db:audit   (see package.json — requires DIRECT_URL/DATABASE_URL)
-- =============================================================================

SELECT
  t.table_schema,
  t.table_name,
  COALESCE(bool_or(c.column_name = 'id'), false) AS has_id,
  COALESCE(bool_or(c.column_name IN
    ('organization_id', 'organizationId', 'tenant_id', 'tenantId')), false) AS has_tenant_scope,
  COALESCE(bool_or(c.column_name IN ('created_at', 'createdAt')), false) AS has_created_at,
  COALESCE(bool_or(c.column_name IN ('updated_at', 'updatedAt')), false) AS has_updated_at,
  COALESCE(bool_or(c.column_name IN ('deleted_at', 'deletedAt')), false) AS has_deleted_at,
  COALESCE(bool_or(c.column_name = 'version'), false) AS has_version
FROM information_schema.tables t
LEFT JOIN information_schema.columns c
  ON c.table_schema = t.table_schema
 AND c.table_name = t.table_name
WHERE t.table_type = 'BASE TABLE'
  AND t.table_schema NOT IN ('pg_catalog', 'information_schema')
  -- Skip Prisma join tables and migration bookkeeping.
  AND t.table_name NOT LIKE '\_%'
  AND t.table_name <> '_prisma_migrations'
GROUP BY t.table_schema, t.table_name
ORDER BY t.table_schema, t.table_name;
