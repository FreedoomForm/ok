ALTER TABLE "transactions" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE INDEX "transactions_deletedAt_createdAt_idx" ON "transactions"("deletedAt", "createdAt");
