# Database Access Patterns

This document catalogs the primary query access patterns, the indexes that serve them, and their expected frequency.

## Conventions

- **Tenant-first**: All multi-column indexes start with the tenant/owner column (`adminId`, `createdBy`, `participantId`, etc.)
- **Frequency**: High (>100 QPS), Medium (10-100 QPS), Low (<10 QPS)
- **Index name format**: `idx_{table}_{columns}`

---

## Order Queries

| # | Query Description                      | Prisma Where Clause                                  | Index Used                            | Frequency |
|---|----------------------------------------|------------------------------------------------------|---------------------------------------|-----------|
| 1 | List orders by admin (paginated)       | `{ adminId, orderBy: { createdAt: 'desc' } }`       | `idx_orders_admin_created_desc`       | High      |
| 2 | List orders by admin + status          | `{ adminId, orderStatus }`                           | `idx_orders_admin_status`             | High      |
| 3 | List orders by admin + date + status   | `{ adminId, deliveryDate, orderStatus }`             | `idx_orders_admin_delivery_status`    | High      |
| 4 | Get order by ID                        | `{ id }`                                             | PK                                    | High      |
| 5 | List orders by courier + status        | `{ courierId, orderStatus }`                         | `idx_orders_courier_status`           | Medium    |
| 6 | List orders by courier + date          | `{ courierId, deliveryDate }`                        | `idx_orders_courier_delivery`         | Medium    |
| 7 | List orders by customer                | `{ customerId, orderBy: { createdAt: 'desc' } }`    | `idx_orders_customer_created`         | Medium    |
| 8 | List orders by status (global)         | `{ orderStatus, orderBy: { createdAt: 'desc' } }`   | `idx_orders_status_created`           | Low       |
| 9 | Global chronological feed              | `{ orderBy: { createdAt: 'desc' } }`                 | `idx_orders_created_desc`             | Low       |
| 10| Soft-deleted order filter              | `{ deletedAt: { not: null } }`                       | `idx_orders_deleted_at`               | Low       |

## Customer Queries

| # | Query Description                      | Prisma Where Clause                                  | Index Used                            | Frequency |
|---|----------------------------------------|------------------------------------------------------|---------------------------------------|-----------|
| 1 | List active customers by admin         | `{ createdBy, isActive: true, orderBy: { createdAt } }` | `idx_customers_created_by_active_created` | High  |
| 2 | Get customer by ID                     | `{ id }`                                             | PK                                    | High      |
| 3 | Find customer by phone                 | `{ phone }`                                          | `idx_customers_phone`                 | Medium    |
| 4 | List customers by admin + deleted      | `{ createdBy, deletedAt: { not: null } }`            | `idx_customers_created_by_deleted`    | Medium    |
| 5 | List customers by default courier      | `{ defaultCourierId }`                               | `idx_customers_default_courier`       | Medium    |
| 6 | List customers by assigned menu set    | `{ assignedSetId }`                                  | `idx_customers_assigned_set`          | Low       |
| 7 | Customer phone uniqueness per admin    | `{ phone, createdBy, deletedAt }`                    | `uniq_customers_phone_created_by_deleted` | Write  |

## Transaction Queries

| # | Query Description                      | Prisma Where Clause                                  | Index Used                            | Frequency |
|---|----------------------------------------|------------------------------------------------------|---------------------------------------|-----------|
| 1 | List transactions by admin (date desc) | `{ adminId, orderBy: { createdAt: 'desc' } }`       | `idx_transactions_admin_created`      | High      |
| 2 | List transactions by admin + type      | `{ adminId, type, orderBy: { createdAt: 'desc' } }` | `idx_transactions_admin_type_created` | High      |
| 3 | List transactions by customer          | `{ customerId, orderBy: { createdAt: 'desc' } }`    | `idx_transactions_customer_created`   | Medium    |
| 4 | List salary transactions by recipient  | `{ salaryRecipientAdminId }`                         | `idx_transactions_salary_recipient`   | Medium    |
| 5 | List transactions by type (global)     | `{ type, orderBy: { createdAt: 'desc' } }`           | `idx_transactions_type_created`       | Low       |

## Message Queries

| # | Query Description                      | Prisma Where Clause                                  | Index Used                            | Frequency |
|---|----------------------------------------|------------------------------------------------------|---------------------------------------|-----------|
| 1 | List messages by conversation (paginated) | `{ conversationId, orderBy: { createdAt: 'asc' } }` | `idx_messages_conversation_created_asc` | High   |
| 2 | List messages by conversation (simple) | `{ conversationId }`                                 | `idx_messages_conversation`           | Medium    |
| 3 | List messages by sender                | `{ senderId }`                                       | `idx_messages_sender`                 | Low       |

## Conversation Queries

| # | Query Description                      | Prisma Where Clause                                  | Index Used                            | Frequency |
|---|----------------------------------------|------------------------------------------------------|---------------------------------------|-----------|
| 1 | List conversations for participant 1   | `{ participant1Id, orderBy: { lastMessageAt: 'desc' } }` | `idx_conversations_p1_last_msg`  | High      |
| 2 | List conversations for participant 2   | `{ participant2Id, orderBy: { lastMessageAt: 'desc' } }` | `idx_conversations_p2_last_msg`  | High      |
| 3 | Check conversation uniqueness          | `{ participant1Id, participant2Id }`                 | `uniq_conversations_p1_p2`            | Write     |

## ActionLog Queries

| # | Query Description                      | Prisma Where Clause                                  | Index Used                            | Frequency |
|---|----------------------------------------|------------------------------------------------------|---------------------------------------|-----------|
| 1 | List logs by admin (paginated)         | `{ adminId, orderBy: { createdAt: 'desc' } }`       | `idx_action_logs_admin_created_desc`  | High      |
| 2 | List logs by admin + entity            | `{ adminId, entityType, entityId }`                  | `idx_action_logs_admin_entity`        | Medium    |
| 3 | List logs by entity (global)           | `{ entityType, entityId }`                           | `idx_action_logs_entity`              | Low       |

## OrderAuditEvent Queries

| # | Query Description                      | Prisma Where Clause                                  | Index Used                            | Frequency |
|---|----------------------------------------|------------------------------------------------------|---------------------------------------|-----------|
| 1 | List events by order (chronological)   | `{ orderId, orderBy: { occurredAt: 'asc' } }`       | `idx_order_audit_events_order_occurred` | High    |
| 2 | List events by actor admin             | `{ actorAdminId, orderBy: { occurredAt: 'desc' } }` | `idx_order_audit_events_actor_occurred` | Medium  |
| 3 | Global chronological event feed        | `{ orderBy: { occurredAt: 'desc' } }`                | `idx_order_audit_events_occurred`     | Low       |

## AsyncJob Queries

| # | Query Description                      | Prisma Where Clause                                  | Index Used                            | Frequency |
|---|----------------------------------------|------------------------------------------------------|---------------------------------------|-----------|
| 1 | Fetch pending jobs (worker poll)       | `{ status: 'pending', orderBy: { createdAt: 'asc' } }` | `idx_async_jobs_status_created`    | High      |
| 2 | List jobs by type + status             | `{ type, status }`                                   | `idx_async_jobs_type_status`          | Medium    |
| 3 | List jobs by creator                   | `{ createdBy }`                                      | `idx_async_jobs_created_by`           | Low       |

## OutboxEvent Queries

| # | Query Description                      | Prisma Where Clause                                  | Index Used                            | Frequency |
|---|----------------------------------------|------------------------------------------------------|---------------------------------------|-----------|
| 1 | Fetch pending events (worker poll)     | `{ status: 'pending', orderBy: { createdAt: 'asc' } }` | `idx_outbox_events_status_created` | High      |
| 2 | Lookup events by aggregate             | `{ aggregateType, aggregateId }`                     | `idx_outbox_events_aggregate`         | Low       |

## DailyOrderStats Queries

| # | Query Description                      | Prisma Where Clause                                  | Index Used                            | Frequency |
|---|----------------------------------------|------------------------------------------------------|---------------------------------------|-----------|
| 1 | Get stats by admin + date range        | `{ adminId, date: { gte, lte } }`                    | `idx_daily_order_stats_admin_date`    | High      |
| 2 | Get stats by date (global)             | `{ date }`                                           | `idx_daily_order_stats_date`          | Low       |
| 3 | Upsert stats row                       | `{ date, adminId }`                                  | `uniq_daily_order_stats_date_admin`   | Write     |

## Admin Queries

| # | Query Description                      | Prisma Where Clause                                  | Index Used                            | Frequency |
|---|----------------------------------------|------------------------------------------------------|---------------------------------------|-----------|
| 1 | Find admin by email                    | `{ email }`                                          | `uniq_admins_email`                   | High      |
| 2 | List admins by role + active status    | `{ role, isActive }`                                 | `idx_admins_role_is_active`           | Medium    |
| 3 | Find admin by Google ID                | `{ googleId }`                                       | `uniq_admins_google_id`               | Low       |
| 4 | List sub-admins by creator             | `{ createdBy }`                                      | `idx_admins_created_by`               | Medium    |

---

## Index Summary by Table

| Table               | Total Indexes | Tenant-First | Global/Legacy | Step 39 Added |
|---------------------|---------------|--------------|---------------|---------------|
| orders              | 10            | 4            | 1             | 5             |
| customers           | 7             | 3            | 0             | 2             |
| transactions        | 6             | 3            | 1             | 1             |
| messages            | 4             | 1            | 0             | 1             |
| conversations       | 5             | 2            | 0             | 2             |
| action_logs         | 5             | 2            | 1             | 2             |
| order_audit_events  | 3             | 1            | 0             | 0             |
| async_jobs          | 4             | 2            | 0             | 0             |
| outbox_events       | 2             | 1            | 0             | 0             |
| daily_order_stats   | 3             | 1            | 0             | 0             |
| admins              | 3 + 2 unique  | 1            | 0             | 0             |
