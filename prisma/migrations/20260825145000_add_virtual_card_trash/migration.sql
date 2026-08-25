ALTER TABLE "virtual_cards" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE INDEX "virtual_cards_ownerAdminId_deletedAt_idx" ON "virtual_cards"("ownerAdminId", "deletedAt");
