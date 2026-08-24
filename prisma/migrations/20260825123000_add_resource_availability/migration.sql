-- Additive day-level availability overlay for all managed resource kinds.
CREATE TYPE "ResourceKind" AS ENUM (
  'INGREDIENT', 'SET', 'GROUP', 'CLIENT', 'COURIER', 'ADMIN',
  'CONTRACT', 'TRANSACTION', 'VIRTUAL_CARD', 'DISH', 'ORDER',
  'PURCHASE', 'CHAT_CONTACT'
);

CREATE TYPE "ResourceDayState" AS ENUM ('ENABLED', 'DISABLED');

CREATE TABLE "resource_availability" (
  "id" TEXT NOT NULL,
  "resourceType" "ResourceKind" NOT NULL,
  "resourceId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "state" "ResourceDayState" NOT NULL DEFAULT 'ENABLED',
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "resource_availability_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "resource_availability_resourceType_resourceId_date_key"
  ON "resource_availability"("resourceType", "resourceId", "date");
CREATE INDEX "resource_availability_resourceType_resourceId_date_state_idx"
  ON "resource_availability"("resourceType", "resourceId", "date", "state");
