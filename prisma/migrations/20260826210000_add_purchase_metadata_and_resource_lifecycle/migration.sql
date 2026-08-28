ALTER TABLE "purchase_items" ADD COLUMN "kcalPerGram" DOUBLE PRECISION;
ALTER TABLE "daily_cooking_plans" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "transactions" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX "daily_cooking_plans_isActive_deletedAt_date_idx" ON "daily_cooking_plans"("isActive", "deletedAt", "date");
CREATE INDEX "transactions_isActive_deletedAt_createdAt_idx" ON "transactions"("isActive", "deletedAt", "createdAt");
