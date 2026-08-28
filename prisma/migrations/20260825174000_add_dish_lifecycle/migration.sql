ALTER TABLE "dishes" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "dishes" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE INDEX "dishes_isActive_deletedAt_name_idx" ON "dishes"("isActive", "deletedAt", "name");
