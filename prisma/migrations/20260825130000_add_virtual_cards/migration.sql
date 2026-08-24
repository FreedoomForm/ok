-- Additive virtual-card ledger support.
CREATE TABLE "virtual_cards" (
  "id" TEXT NOT NULL,
  "ownerAdminId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "virtual_cards_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "transactions" ADD COLUMN "virtualCardId" TEXT;

CREATE INDEX "virtual_cards_ownerAdminId_isActive_createdAt_idx"
  ON "virtual_cards"("ownerAdminId", "isActive", "createdAt");
CREATE INDEX "transactions_virtualCardId_idx" ON "transactions"("virtualCardId");

ALTER TABLE "virtual_cards"
  ADD CONSTRAINT "virtual_cards_ownerAdminId_fkey"
  FOREIGN KEY ("ownerAdminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_virtualCardId_fkey"
  FOREIGN KEY ("virtualCardId") REFERENCES "virtual_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
