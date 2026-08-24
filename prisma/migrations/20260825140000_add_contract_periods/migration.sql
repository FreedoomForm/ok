-- Additive contract and period scheduling model.
CREATE TYPE "ContractStatus" AS ENUM ('ENABLED', 'DISABLED', 'DELETED');
CREATE TYPE "ContractPeriodStatus" AS ENUM ('ENABLED', 'DISABLED', 'DELETED');

CREATE TABLE "contracts" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "ownerAdminId" TEXT NOT NULL,
  "courierId" TEXT,
  "status" "ContractStatus" NOT NULL DEFAULT 'ENABLED',
  "paid" BOOLEAN NOT NULL DEFAULT false,
  "autoRenew" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contract_periods" (
  "id" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "courierId" TEXT,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "status" "ContractPeriodStatus" NOT NULL DEFAULT 'ENABLED',
  "paid" BOOLEAN NOT NULL DEFAULT false,
  "autoRenew" BOOLEAN NOT NULL DEFAULT false,
  "enabledWeekdays" JSONB NOT NULL,
  "disabledDates" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "contract_periods_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "contracts_ownerAdminId_status_updatedAt_idx" ON "contracts"("ownerAdminId", "status", "updatedAt");
CREATE INDEX "contracts_customerId_status_idx" ON "contracts"("customerId", "status");
CREATE INDEX "contracts_courierId_status_idx" ON "contracts"("courierId", "status");
CREATE INDEX "contract_periods_contractId_startDate_endDate_status_idx" ON "contract_periods"("contractId", "startDate", "endDate", "status");
CREATE INDEX "contract_periods_courierId_startDate_endDate_status_idx" ON "contract_periods"("courierId", "startDate", "endDate", "status");

ALTER TABLE "contracts"
  ADD CONSTRAINT "contracts_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "contracts_ownerAdminId_fkey"
  FOREIGN KEY ("ownerAdminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "contracts_courierId_fkey"
  FOREIGN KEY ("courierId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contract_periods"
  ADD CONSTRAINT "contract_periods_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "contract_periods_courierId_fkey"
  FOREIGN KEY ("courierId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
