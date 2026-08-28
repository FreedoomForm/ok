ALTER TABLE "admins" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE INDEX "admins_createdBy_role_isActive_deletedAt_idx" ON "admins"("createdBy", "role", "isActive", "deletedAt");
