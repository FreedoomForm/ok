ALTER TABLE "warehouse_items" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "warehouse_items" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE INDEX "warehouse_items_isActive_deletedAt_name_idx" ON "warehouse_items"("isActive", "deletedAt", "name");
