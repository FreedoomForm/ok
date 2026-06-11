-- ═══════════════════════════════════════════════════════════════════════════
-- Audit Table Partitioning — PostgreSQL native range partitioning
-- ═══════════════════════════════════════════════════════════════════════════
--
-- PURPOSE:
--   order_audit_events and action_logs are append-only tables that grow
--   indefinitely. Range partitioning by month keeps queries fast and enables
--   efficient data archiving/dropping of old partitions.
--
-- WHEN TO APPLY:
--   When order_audit_events exceeds ~1M rows or action_logs exceeds ~500K rows.
--   Monitor with: SELECT COUNT(*) FROM order_audit_events;
--
-- PREREQUISITES:
--   - PostgreSQL 10+ (partitioning supported)
--   - Neon / self-hosted PostgreSQL
--   - NOT compatible with Prisma migrations — apply manually or via SQL script
--   - Prisma will still read/write transparently (partitioning is transparent to clients)
--
-- CAVEATS:
--   - Partitioned tables cannot have FOREIGN KEY references FROM other tables
--   - Prisma schema stays unchanged — partitioning is a DB-level optimization
--   - Must create future partitions before data arrives (use cron/maintenance)
--
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Step 1: Rename existing tables (preserve data) ────────────────────────

BEGIN;

-- 1a. Rename order_audit_events → order_audit_events_legacy
ALTER TABLE order_audit_events RENAME TO order_audit_events_legacy;

-- 1b. Rename action_logs → action_logs_legacy
ALTER TABLE action_logs RENAME TO action_logs_legacy;

-- ── Step 2: Create partitioned parent tables ──────────────────────────────

-- 2a. order_audit_events (partitioned by occurredAt, monthly)
CREATE TABLE order_audit_events (
    id              TEXT NOT NULL,
    "orderId"       TEXT NOT NULL,
    "eventType"     TEXT NOT NULL,
    "actorAdminId"  TEXT,
    "actorRole"     TEXT,
    "actorName"     TEXT,
    "previousStatus" TEXT,
    "nextStatus"    TEXT,
    payload         JSONB,
    message         TEXT,
    "occurredAt"    TIMESTAMP(3) NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    "deletedAt"     TIMESTAMP(3),
    version         INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (id, "occurredAt")
) PARTITION BY RANGE ("occurredAt");

-- 2b. action_logs (partitioned by createdAt, monthly)
CREATE TABLE action_logs (
    id          TEXT NOT NULL,
    "adminId"   TEXT NOT NULL,
    action      TEXT NOT NULL,
    "entityType" TEXT,
    "entityId"  TEXT,
    "oldValues"  TEXT,
    "newValues"  TEXT,
    description TEXT,
    details     TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    version     INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (id, "createdAt")
) PARTITION BY RANGE ("createdAt");

-- ── Step 3: Create indexes on parent tables ───────────────────────────────

-- order_audit_events indexes
CREATE INDEX idx_oae_order_occurred ON order_audit_events ("orderId", "occurredAt");
CREATE INDEX idx_oae_actor_occurred ON order_audit_events ("actorAdminId", "occurredAt");
CREATE INDEX idx_oae_occurred ON order_audit_events ("occurredAt");

-- action_logs indexes
CREATE INDEX idx_al_admin_id ON action_logs ("adminId");
CREATE INDEX idx_al_entity ON action_logs ("entityType", "entityId");
CREATE INDEX idx_al_created_at ON action_logs ("createdAt");

-- ── Step 4: Create initial monthly partitions (next 6 months) ────────────

-- Helper: generates partitions for order_audit_events
-- Partitions for 2025-01 through 2025-12 (adjust as needed)

-- 2025 H1
CREATE TABLE order_audit_events_2025_01 PARTITION OF order_audit_events
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE order_audit_events_2025_02 PARTITION OF order_audit_events
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE order_audit_events_2025_03 PARTITION OF order_audit_events
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE order_audit_events_2025_04 PARTITION OF order_audit_events
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE order_audit_events_2025_05 PARTITION OF order_audit_events
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE order_audit_events_2025_06 PARTITION OF order_audit_events
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

-- 2025 H2
CREATE TABLE order_audit_events_2025_07 PARTITION OF order_audit_events
    FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE order_audit_events_2025_08 PARTITION OF order_audit_events
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE order_audit_events_2025_09 PARTITION OF order_audit_events
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE order_audit_events_2025_10 PARTITION OF order_audit_events
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE order_audit_events_2025_11 PARTITION OF order_audit_events
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE order_audit_events_2025_12 PARTITION OF order_audit_events
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- 2026 H1 (pre-create for forward compatibility)
CREATE TABLE order_audit_events_2026_01 PARTITION OF order_audit_events
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE order_audit_events_2026_02 PARTITION OF order_audit_events
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE order_audit_events_2026_03 PARTITION OF order_audit_events
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE order_audit_events_2026_04 PARTITION OF order_audit_events
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE order_audit_events_2026_05 PARTITION OF order_audit_events
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE order_audit_events_2026_06 PARTITION OF order_audit_events
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

-- action_logs partitions (same pattern)
CREATE TABLE action_logs_2025_01 PARTITION OF action_logs
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE action_logs_2025_02 PARTITION OF action_logs
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE action_logs_2025_03 PARTITION OF action_logs
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE action_logs_2025_04 PARTITION OF action_logs
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE action_logs_2025_05 PARTITION OF action_logs
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE action_logs_2025_06 PARTITION OF action_logs
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE action_logs_2025_07 PARTITION OF action_logs
    FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE action_logs_2025_08 PARTITION OF action_logs
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE action_logs_2025_09 PARTITION OF action_logs
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE action_logs_2025_10 PARTITION OF action_logs
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE action_logs_2025_11 PARTITION OF action_logs
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE action_logs_2025_12 PARTITION OF action_logs
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
CREATE TABLE action_logs_2026_01 PARTITION OF action_logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE action_logs_2026_02 PARTITION OF action_logs
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE action_logs_2026_03 PARTITION OF action_logs
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE action_logs_2026_04 PARTITION OF action_logs
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE action_logs_2026_05 PARTITION OF action_logs
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE action_logs_2026_06 PARTITION OF action_logs
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

-- ── Step 5: Migrate existing data from legacy tables ─────────────────────

INSERT INTO order_audit_events
    SELECT id, "orderId", "eventType", "actorAdminId", "actorRole", "actorName",
           "previousStatus", "nextStatus", payload, message, "occurredAt",
           "createdAt", "updatedAt", "deletedAt", version
    FROM order_audit_events_legacy;

INSERT INTO action_logs
    SELECT id, "adminId", action, "entityType", "entityId", "oldValues",
           "newValues", description, details, "createdAt", "updatedAt",
           "deletedAt", version
    FROM action_logs_legacy;

-- ── Step 6: Verify row counts match ──────────────────────────────────────

-- Run these manually after commit to verify:
-- SELECT COUNT(*) FROM order_audit_events;
-- SELECT COUNT(*) FROM order_audit_events_legacy;
-- SELECT COUNT(*) FROM action_logs;
-- SELECT COUNT(*) FROM action_logs_legacy;

-- ── Step 7: Drop legacy tables (AFTER verification!) ─────────────────────
-- Uncomment when verified:
-- DROP TABLE order_audit_events_legacy;
-- DROP TABLE action_logs_legacy;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- Maintenance: auto-create future partitions
-- ═══════════════════════════════════════════════════════════════════════════
-- Add this as a cron job (Vercel cron or pg_cron) to create partitions
-- for upcoming months. Run monthly.

/*
CREATE OR REPLACE FUNCTION create_next_month_partitions()
RETURNS void AS $$
DECLARE
    next_month_start TIMESTAMP;
    next_month_end TIMESTAMP;
    year_text TEXT;
    month_text TEXT;
BEGIN
    next_month_start := DATE_TRUNC('month', NOW() + INTERVAL '1 month');
    next_month_end := DATE_TRUNC('month', NOW() + INTERVAL '2 months');
    year_text := EXTRACT(YEAR FROM next_month_start)::TEXT;
    month_text := LPAD(EXTRACT(MONTH FROM next_month_start)::TEXT, 2, '0');

    -- order_audit_events
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS order_audit_events_%s_%s PARTITION OF order_audit_events FOR VALUES FROM (%L) TO (%L)',
        year_text, month_text, next_month_start, next_month_end
    );

    -- action_logs
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS action_logs_%s_%s PARTITION OF action_logs FOR VALUES FROM (%L) TO (%L)',
        year_text, month_text, next_month_start, next_month_end
    );
END;
$$ LANGUAGE plpgsql;
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- Archiving: drop old partitions (data retention)
-- ═══════════════════════════════════════════════════════════════════════════
-- When data exceeds retention policy (e.g., 12 months), drop oldest partitions:

-- Example: Drop partitions older than 12 months
-- DROP TABLE IF EXISTS order_audit_events_2024_01;
-- DROP TABLE IF EXISTS action_logs_2024_01;

-- Safe archive alternative: export to cold storage before dropping
-- COPY order_audit_events_2024_01 TO '/archive/order_audit_events_2024_01.csv' WITH CSV HEADER;
