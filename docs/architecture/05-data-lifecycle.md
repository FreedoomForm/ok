# Data Lifecycle & Retention Policy

## Data Categories

### Hot Data (0-90 days)
- Active orders, current month transactions
- Access pattern: frequent reads/writes
- Storage: primary database
- Retention: keep in main tables

### Warm Data (90 days - 1 year)
- Completed orders, past transactions
- Access pattern: occasional reads, no writes
- Storage: primary database (partitioned)
- Retention: archive to cold storage after 1 year

### Cold Data (> 1 year)
- Audit logs, old messages
- Access pattern: rare reads (compliance/audits)
- Storage: archive table or external storage
- Retention: per regulatory requirements (min 3 years for financial data)

## Partitioning Strategy

- `order_audit_events`: partition by month (`createdAt`)
- `action_logs`: partition by month (`createdAt`)
- `messages`: partition by month (`createdAt`)
- `outbox_events`: partition by month (`createdAt`), drop published events after 30 days

## Cleanup Jobs

| Schedule   | Job                                      | Description                                              |
|------------|------------------------------------------|----------------------------------------------------------|
| Daily      | Delete published outbox_events > 30 days | `DELETE FROM outbox_events WHERE status = 'published' AND created_at < NOW() - INTERVAL '30 days'` |
| Weekly     | Vacuum analyze on high-write tables      | `VACUUM ANALYZE orders, order_audit_events, action_logs, outbox_events, messages` |
| Monthly    | Archive completed orders > 90 days       | Move to `orders_archive` table or cold storage (S3/GCS)  |
| Quarterly  | Review index usage statistics            | `SELECT * FROM pg_stat_user_indexes ORDER BY idx_scan ASC` — drop unused indexes |

## Soft-Delete Policy

All business tables use a `deletedAt` nullable column for soft-delete:

- **Orders**: soft-deleted orders remain for 90 days in the main table, then permanently deleted or archived
- **Customers**: soft-deleted customers remain for 90 days, then permanently deleted
- **Admins**: soft-deleted admins retained indefinitely (audit trail requirement)

Active-only queries should filter `WHERE deleted_at IS NULL`. Indexes with `deletedAt` support efficient filtering:
- `idx_orders_deleted_at` — soft-delete filtering on orders
- `idx_customers_created_by_deleted` — tenant-scoped soft-delete on customers

> **NOTE**: Consider partial indexes `WHERE deleted_at IS NULL` for active-only queries.
> Prisma doesn't natively support partial indexes; add via raw SQL in a migration.

## Backup & Restore

### Backup Schedule

| Provider              | Schedule | Retention | Type          |
|-----------------------|----------|-----------|---------------|
| Vercel Postgres       | Daily    | 7 days    | Automatic     |
| Manual pg_dump        | Weekly   | 30 days   | Full dump     |
| Pre-migration backup  | On-demand| 90 days   | Schema + data |

### Automated Backup (Vercel Postgres / Neon / Supabase)

Most managed Postgres providers include:
- Point-in-time recovery (PITR) up to 7 days
- Daily full backups retained for 7-30 days
- No manual configuration required

### Manual Backup Procedure

```bash
# Full database dump with schema + data
pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-privileges \
  --format=custom \
  --file="backup-$(date +%Y%m%d-%H%M%S).dump"

# Schema-only dump (for migration testing)
pg_dump "$DATABASE_URL" \
  --schema-only \
  --no-owner \
  --file="schema-$(date +%Y%m%d).sql"

# Data-only dump (for seeding test environments)
pg_dump "$DATABASE_URL" \
  --data-only \
  --no-owner \
  --file="data-$(date +%Y%m%d).sql"
```

### Restore Procedure

1. **Verify backup integrity**:
   ```bash
   pg_restore --list backup-YYYYMMDD-HHMMSS.dump | head -20
   ```

2. **Create a fresh database** (never restore into production directly):
   ```bash
   createdb -T template0 restore_test
   ```

3. **Restore from backup**:
   ```bash
   pg_restore \
     --dbname=restore_test \
     --no-owner \
     --no-privileges \
     backup-YYYYMMDD-HHMMSS.dump
   ```

4. **Validate restored data**:
   ```sql
   -- Row counts
   SELECT 'orders' AS tbl, COUNT(*) FROM orders
   UNION ALL SELECT 'customers', COUNT(*) FROM customers
   UNION ALL SELECT 'admins', COUNT(*) FROM admins
   UNION ALL SELECT 'transactions', COUNT(*) FROM transactions;

   -- Recent activity
   SELECT MAX(created_at) FROM orders;
   SELECT MAX(created_at) FROM transactions;

   -- Index health
   SELECT indexrelname, idx_scan FROM pg_stat_user_indexes
   ORDER BY idx_scan ASC LIMIT 10;
   ```

5. **Switch production** (if restoring to production):
   - Put application in maintenance mode
   - Run `prisma migrate deploy` to ensure schema matches
   - Restore data
   - Run validation queries
   - Switch application back to live

### Monthly Restore Test Checklist

- [ ] Backup file exists and is accessible
- [ ] `pg_restore --list` succeeds without errors
- [ ] Restore completes within acceptable time (< 30 min for 1 GB)
- [ ] Row counts match production (within 1% for active tables)
- [ ] Application can connect and query restored database
- [ ] All indexes present and valid (`pg_stat_user_indexes`)
- [ ] No orphaned data or broken foreign keys
- [ ] Document restore time and any issues found

## Index Maintenance

### New Indexes (Step 39)

The following indexes were added to optimize access patterns:

| Table               | Index Name                            | Columns                                 | Purpose                                |
|---------------------|---------------------------------------|-----------------------------------------|----------------------------------------|
| orders              | idx_orders_admin_status               | [adminId, orderStatus]                  | Tenant-first status filter             |
| orders              | idx_orders_admin_created_desc         | [adminId, createdAt DESC]              | Tenant-first chronological listing     |
| orders              | idx_orders_courier_status             | [courierId, orderStatus]                | Courier status filter                  |
| orders              | idx_orders_created_desc               | [createdAt DESC]                        | Global chronological listing           |
| orders              | idx_orders_deleted_at                 | [deletedAt]                             | Soft-delete filtering                  |
| customers           | idx_customers_created_by_deleted      | [createdBy, deletedAt]                  | Tenant-scoped soft-delete filtering    |
| customers           | idx_customers_phone                   | [phone]                                 | Phone lookup                           |
| transactions        | idx_transactions_admin_type_created   | [adminId, type, createdAt DESC]        | Tenant-first type+date filter          |
| messages            | idx_messages_conversation_created_asc | [conversationId, createdAt ASC]        | Paginated message loading              |
| conversations       | idx_conversations_p1_last_msg         | [participant1Id, lastMessageAt DESC]   | Participant conversations by activity  |
| conversations       | idx_conversations_p2_last_msg         | [participant2Id, lastMessageAt DESC]   | Participant conversations by activity  |
| action_logs         | idx_action_logs_admin_created_desc    | [adminId, createdAt DESC]              | Tenant-first audit log listing         |
| action_logs         | idx_action_logs_admin_entity          | [adminId, entityType, entityId]        | Tenant-first entity audit lookup       |

### Tenant-First Index Rule

All multi-column indexes start with the tenant/owner column (`adminId`, `createdBy`, etc.) to ensure queries scoped to a specific tenant use the index efficiently. The following legacy indexes remain for global (cross-tenant) queries:

- `idx_orders_status_created` [orderStatus, createdAt] — global status filter
- `idx_transactions_type_created` [type, createdAt] — global type filter
- `idx_action_logs_entity` [entityType, entityId] — global entity lookup

These are supplemented by tenant-first alternatives listed above.
