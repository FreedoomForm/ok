ALTER TABLE "purchases" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "purchases_ownerAdminId_deletedAt_createdAt_idx" ON "purchases"("ownerAdminId", "deletedAt", "createdAt");
