-- Additive retry-safety for completed purchase workflows.
ALTER TABLE "purchases" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "purchases_ownerAdminId_idempotencyKey_key"
  ON "purchases"("ownerAdminId", "idempotencyKey");
