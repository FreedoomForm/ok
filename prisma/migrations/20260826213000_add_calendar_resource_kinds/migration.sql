ALTER TYPE "ResourceKind" ADD VALUE IF NOT EXISTS 'CHAT_MESSAGE';
ALTER TYPE "ResourceKind" ADD VALUE IF NOT EXISTS 'CONTRACT_PERIOD';
ALTER TYPE "ResourceKind" ADD VALUE IF NOT EXISTS 'COOKING_RECORD';
ALTER TYPE "ResourceKind" ADD VALUE IF NOT EXISTS 'ROUTE_STOP';

CREATE INDEX IF NOT EXISTS "resource_availability_resourceType_resourceId_date_idx"
  ON "resource_availability"("resourceType", "resourceId", "date");

