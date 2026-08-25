ALTER TABLE "daily_cooking_plans" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "daily_cooking_plans_deletedAt_date_idx" ON "daily_cooking_plans"("deletedAt", "date");
