-- Additive purchase history with exact ingredient lines.
CREATE TYPE "PurchaseStatus" AS ENUM ('DRAFT', 'COMPLETED');

CREATE TABLE "purchases" (
  "id" TEXT NOT NULL,
  "ownerAdminId" TEXT NOT NULL,
  "transactionId" TEXT,
  "title" TEXT NOT NULL,
  "status" "PurchaseStatus" NOT NULL DEFAULT 'DRAFT',
  "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_items" (
  "id" TEXT NOT NULL,
  "purchaseId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "unit" TEXT NOT NULL,
  "costPerUnit" DOUBLE PRECISION NOT NULL,
  "totalCost" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "purchases_transactionId_key" ON "purchases"("transactionId");
CREATE INDEX "purchases_ownerAdminId_status_createdAt_idx" ON "purchases"("ownerAdminId", "status", "createdAt");
CREATE INDEX "purchase_items_purchaseId_idx" ON "purchase_items"("purchaseId");

ALTER TABLE "purchases"
  ADD CONSTRAINT "purchases_ownerAdminId_fkey"
  FOREIGN KEY ("ownerAdminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "purchases_transactionId_fkey"
  FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_items"
  ADD CONSTRAINT "purchase_items_purchaseId_fkey"
  FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
