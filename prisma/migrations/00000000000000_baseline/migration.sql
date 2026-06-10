-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'MIDDLE_ADMIN', 'LOW_ADMIN', 'COURIER', 'WORKER');

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('CLASSIC', 'INDIVIDUAL', 'DIABETIC');

-- CreateEnum
CREATE TYPE "FeatureType" AS ENUM ('TEXT', 'SELECT');

-- CreateEnum
CREATE TYPE "order_status_new" AS ENUM ('NEW', 'PENDING', 'IN_PROCESS', 'IN_DELIVERY', 'PAUSED', 'DELIVERED', 'CANCELED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'UNPAID', 'PARTIAL');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('MORNING', 'EVENING');

-- CreateEnum
CREATE TYPE "OrderEventType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'DETAILS_UPDATED', 'COURIER_ASSIGNED', 'COURIER_UNASSIGNED', 'DELIVERY_STARTED', 'DELIVERY_PAUSED', 'DELIVERY_RESUMED', 'DELIVERY_COMPLETED', 'PAYMENT_UPDATED', 'REORDERED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'SUPER_ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "allowedTabs" TEXT,
    "googleId" TEXT,
    "hasPassword" BOOLEAN NOT NULL DEFAULT true,
    "phone" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "transportType" TEXT,
    "vehicleNumber" TEXT,
    "maxLoad" INTEGER NOT NULL DEFAULT 0,
    "isOnShift" BOOLEAN NOT NULL DEFAULT false,
    "shiftStartedAt" TIMESTAMP(3),
    "shiftEndedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "averageDeliveryMinutes" DOUBLE PRECISION,
    "version" INTEGER NOT NULL DEFAULT 1,
    "companyBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salary" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nickName" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "preferences" TEXT,
    "orderPattern" TEXT,
    "password" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "defaultCourierId" TEXT,
    "calories" INTEGER NOT NULL DEFAULT 2000,
    "planType" "PlanType" NOT NULL DEFAULT 'CLASSIC',
    "dailyPrice" INTEGER NOT NULL DEFAULT 84000,
    "notes" TEXT,
    "deliveryDays" TEXT,
    "autoOrdersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "googleMapsLink" TEXT,
    "assignedSetId" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNumber" INTEGER NOT NULL,
    "status" "order_status_new" NOT NULL DEFAULT 'NEW',
    "customerId" TEXT NOT NULL,
    "deliveryDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "deliveryAddress" TEXT NOT NULL,
    "deliveryTime" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "calories" INTEGER NOT NULL DEFAULT 1600,
    "specialFeatures" TEXT,
    "notes" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "isPrepaid" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "sourceChannel" TEXT DEFAULT 'ADMIN_PANEL',
    "statusChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "resumedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "etaMinutes" INTEGER,
    "routeDistanceKm" DOUBLE PRECISION,
    "routeDurationMin" INTEGER,
    "sequenceInRoute" INTEGER,
    "customerRating" INTEGER,
    "customerFeedback" TEXT,
    "amountReceived" DOUBLE PRECISION,
    "lastLatitude" DOUBLE PRECISION,
    "lastLongitude" DOUBLE PRECISION,
    "lastLocationAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "orderType" "OrderType" NOT NULL DEFAULT 'MORNING',
    "fromAutoOrder" BOOLEAN NOT NULL DEFAULT false,
    "adminId" TEXT,
    "courierId" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_audit_events" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "eventType" "OrderEventType" NOT NULL,
    "actorAdminId" TEXT,
    "actorRole" TEXT,
    "actorName" TEXT,
    "previousStatus" "order_status_new",
    "nextStatus" "order_status_new",
    "payload" JSONB,
    "message" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "order_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "oldValues" TEXT,
    "newValues" TEXT,
    "description" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interface_configs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "language" TEXT NOT NULL DEFAULT 'ru',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "interface_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "features" (
    "id" TEXT NOT NULL,
    "ownerAdminId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "FeatureType" NOT NULL,
    "options" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "participant1Id" TEXT NOT NULL,
    "participant2Id" TEXT NOT NULL,
    "lastMessage" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "websites" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chatEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "websites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'gr',
    "kcalPerGram" DOUBLE PRECISION DEFAULT 0,
    "pricePerUnit" DOUBLE PRECISION,
    "priceUnit" TEXT NOT NULL DEFAULT 'kg',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "warehouse_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_cooking_plans" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "menuNumber" INTEGER NOT NULL,
    "dishes" JSONB NOT NULL,
    "cookedStats" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "daily_cooking_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menus" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "TransactionType" NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "adminId" TEXT,
    "salaryRecipientAdminId" TEXT,
    "customerId" TEXT,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dishes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "mealType" TEXT NOT NULL,
    "ingredients" JSONB NOT NULL,
    "calorieMappings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "dishes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_sets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "menuNumber" INTEGER NOT NULL DEFAULT 0,
    "calorieGroups" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "adminId" TEXT,

    CONSTRAINT "menu_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "async_jobs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "input" JSONB,
    "result" JSONB,
    "error" TEXT,
    "createdBy" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "async_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_order_stats" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "adminId" TEXT NOT NULL,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "deliveredOrders" INTEGER NOT NULL DEFAULT 0,
    "cancelledOrders" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageDeliveryTime" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_order_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_dashboard_counters" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "totalClients" INTEGER NOT NULL DEFAULT 0,
    "activeClients" INTEGER NOT NULL DEFAULT 0,
    "totalCouriers" INTEGER NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "pendingOrders" INTEGER NOT NULL DEFAULT 0,
    "todayRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statsSnapshot" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_dashboard_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DishToMenu" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "uniq_admins_email" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_admins_google_id" ON "admins"("googleId");

-- CreateIndex
CREATE INDEX "idx_admins_role_is_active" ON "admins"("role", "isActive");

-- CreateIndex
CREATE INDEX "idx_admins_created_by" ON "admins"("createdBy");

-- CreateIndex
CREATE INDEX "idx_admins_created_at" ON "admins"("createdAt");

-- CreateIndex
CREATE INDEX "idx_customers_created_by_active_created" ON "customers"("createdBy", "isActive", "createdAt");

-- CreateIndex
CREATE INDEX "idx_customers_default_courier" ON "customers"("defaultCourierId");

-- CreateIndex
CREATE INDEX "idx_customers_assigned_set" ON "customers"("assignedSetId");

-- CreateIndex
CREATE INDEX "idx_customers_created_at" ON "customers"("createdAt");

-- CreateIndex
CREATE INDEX "idx_customers_created_by_deleted" ON "customers"("createdBy", "deletedAt");

-- CreateIndex
CREATE INDEX "idx_customers_phone" ON "customers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_customers_phone_created_by_deleted" ON "customers"("phone", "createdBy", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_orders_order_number" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "idx_orders_admin_delivery_status" ON "orders"("adminId", "deliveryDate", "status");

-- CreateIndex
CREATE INDEX "idx_orders_courier_delivery" ON "orders"("courierId", "deliveryDate");

-- CreateIndex
CREATE INDEX "idx_orders_customer_created" ON "orders"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_orders_customer" ON "orders"("customerId");

-- CreateIndex
CREATE INDEX "idx_orders_status_created" ON "orders"("status", "createdAt");

-- CreateIndex
CREATE INDEX "idx_orders_admin_status" ON "orders"("adminId", "status");

-- CreateIndex
CREATE INDEX "idx_orders_admin_created_desc" ON "orders"("adminId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_orders_courier_status" ON "orders"("courierId", "status");

-- CreateIndex
CREATE INDEX "idx_orders_created_desc" ON "orders"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_orders_deleted_at" ON "orders"("deletedAt");

-- CreateIndex
CREATE INDEX "idx_order_audit_events_order_occurred" ON "order_audit_events"("orderId", "occurredAt");

-- CreateIndex
CREATE INDEX "idx_order_audit_events_actor_occurred" ON "order_audit_events"("actorAdminId", "occurredAt");

-- CreateIndex
CREATE INDEX "idx_order_audit_events_occurred" ON "order_audit_events"("occurredAt");

-- CreateIndex
CREATE INDEX "idx_action_logs_admin_id" ON "action_logs"("adminId");

-- CreateIndex
CREATE INDEX "idx_action_logs_entity" ON "action_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "idx_action_logs_created_at" ON "action_logs"("createdAt");

-- CreateIndex
CREATE INDEX "idx_action_logs_admin_created_desc" ON "action_logs"("adminId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_action_logs_admin_entity" ON "action_logs"("adminId", "entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_interface_configs_admin_id" ON "interface_configs"("adminId");

-- CreateIndex
CREATE INDEX "idx_features_owner_admin" ON "features"("ownerAdminId");

-- CreateIndex
CREATE INDEX "idx_features_created_at" ON "features"("createdAt");

-- CreateIndex
CREATE INDEX "idx_accounts_user" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_accounts_provider_account" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "idx_conversations_p1" ON "conversations"("participant1Id");

-- CreateIndex
CREATE INDEX "idx_conversations_p2" ON "conversations"("participant2Id");

-- CreateIndex
CREATE INDEX "idx_conversations_last_message" ON "conversations"("lastMessageAt");

-- CreateIndex
CREATE INDEX "idx_conversations_p1_last_msg" ON "conversations"("participant1Id", "lastMessageAt" DESC);

-- CreateIndex
CREATE INDEX "idx_conversations_p2_last_msg" ON "conversations"("participant2Id", "lastMessageAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "uniq_conversations_p1_p2" ON "conversations"("participant1Id", "participant2Id");

-- CreateIndex
CREATE INDEX "idx_messages_conversation" ON "messages"("conversationId");

-- CreateIndex
CREATE INDEX "idx_messages_sender" ON "messages"("senderId");

-- CreateIndex
CREATE INDEX "idx_messages_created_at" ON "messages"("createdAt");

-- CreateIndex
CREATE INDEX "idx_messages_conversation_created_asc" ON "messages"("conversationId", "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "uniq_websites_admin_id" ON "websites"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_websites_subdomain" ON "websites"("subdomain");

-- CreateIndex
CREATE INDEX "idx_websites_admin" ON "websites"("adminId");

-- CreateIndex
CREATE INDEX "idx_websites_created_at" ON "websites"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_warehouse_items_name" ON "warehouse_items"("name");

-- CreateIndex
CREATE INDEX "idx_warehouse_items_updated_at" ON "warehouse_items"("updatedAt");

-- CreateIndex
CREATE INDEX "idx_warehouse_items_created_at" ON "warehouse_items"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_daily_cooking_plans_date" ON "daily_cooking_plans"("date");

-- CreateIndex
CREATE INDEX "idx_daily_cooking_plans_created_at" ON "daily_cooking_plans"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_menus_number" ON "menus"("number");

-- CreateIndex
CREATE INDEX "idx_menus_created_at" ON "menus"("createdAt");

-- CreateIndex
CREATE INDEX "idx_transactions_admin_created" ON "transactions"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_transactions_salary_recipient" ON "transactions"("salaryRecipientAdminId");

-- CreateIndex
CREATE INDEX "idx_transactions_customer_created" ON "transactions"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_transactions_type_created" ON "transactions"("type", "createdAt");

-- CreateIndex
CREATE INDEX "idx_transactions_created_at" ON "transactions"("createdAt");

-- CreateIndex
CREATE INDEX "idx_transactions_admin_type_created" ON "transactions"("adminId", "type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_dishes_created_at" ON "dishes"("createdAt");

-- CreateIndex
CREATE INDEX "idx_dishes_updated_at" ON "dishes"("updatedAt");

-- CreateIndex
CREATE INDEX "idx_menu_sets_admin_active" ON "menu_sets"("adminId", "isActive");

-- CreateIndex
CREATE INDEX "idx_menu_sets_admin_name" ON "menu_sets"("adminId", "name");

-- CreateIndex
CREATE INDEX "idx_menu_sets_created_at" ON "menu_sets"("createdAt");

-- CreateIndex
CREATE INDEX "idx_async_jobs_status_created" ON "async_jobs"("status", "createdAt");

-- CreateIndex
CREATE INDEX "idx_async_jobs_type_status" ON "async_jobs"("type", "status");

-- CreateIndex
CREATE INDEX "idx_async_jobs_created_by" ON "async_jobs"("createdBy");

-- CreateIndex
CREATE INDEX "idx_async_jobs_created_at" ON "async_jobs"("createdAt");

-- CreateIndex
CREATE INDEX "idx_outbox_events_status_created" ON "outbox_events"("status", "createdAt");

-- CreateIndex
CREATE INDEX "idx_outbox_events_aggregate" ON "outbox_events"("aggregateType", "aggregateId");

-- CreateIndex
CREATE INDEX "idx_daily_order_stats_admin_date" ON "daily_order_stats"("adminId", "date");

-- CreateIndex
CREATE INDEX "idx_daily_order_stats_date" ON "daily_order_stats"("date");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_daily_order_stats_date_admin" ON "daily_order_stats"("date", "adminId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_dashboard_counters_adminId_key" ON "admin_dashboard_counters"("adminId");

-- CreateIndex
CREATE INDEX "idx_admin_dashboard_counters_admin" ON "admin_dashboard_counters"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "_DishToMenu_AB_unique" ON "_DishToMenu"("A", "B");

-- CreateIndex
CREATE INDEX "_DishToMenu_B_index" ON "_DishToMenu"("B");

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_defaultCourierId_fkey" FOREIGN KEY ("defaultCourierId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_assignedSetId_fkey" FOREIGN KEY ("assignedSetId") REFERENCES "menu_sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_audit_events" ADD CONSTRAINT "order_audit_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_audit_events" ADD CONSTRAINT "order_audit_events_actorAdminId_fkey" FOREIGN KEY ("actorAdminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_logs" ADD CONSTRAINT "action_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interface_configs" ADD CONSTRAINT "interface_configs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "features" ADD CONSTRAINT "features_ownerAdminId_fkey" FOREIGN KEY ("ownerAdminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant1Id_fkey" FOREIGN KEY ("participant1Id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant2Id_fkey" FOREIGN KEY ("participant2Id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "websites" ADD CONSTRAINT "websites_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_salaryRecipientAdminId_fkey" FOREIGN KEY ("salaryRecipientAdminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_sets" ADD CONSTRAINT "menu_sets_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "async_jobs" ADD CONSTRAINT "async_jobs_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_order_stats" ADD CONSTRAINT "daily_order_stats_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_dashboard_counters" ADD CONSTRAINT "admin_dashboard_counters_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DishToMenu" ADD CONSTRAINT "_DishToMenu_A_fkey" FOREIGN KEY ("A") REFERENCES "dishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DishToMenu" ADD CONSTRAINT "_DishToMenu_B_fkey" FOREIGN KEY ("B") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

