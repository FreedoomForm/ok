-- Additive chat contacts migration. No existing rows are deleted or rewritten.
CREATE TYPE "MessageType" AS ENUM ('USER', 'SYSTEM');
CREATE TYPE "ChatContactType" AS ENUM ('ADMIN', 'SYSTEM');
CREATE TYPE "ChatContactState" AS ENUM ('ENABLED', 'DISABLED', 'DELETED');

ALTER TABLE "conversations"
  ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "messages"
  ADD COLUMN "messageType" "MessageType" NOT NULL DEFAULT 'USER',
  ADD COLUMN "systemCode" TEXT;

CREATE TABLE "chat_contacts" (
  "id" TEXT NOT NULL,
  "ownerAdminId" TEXT NOT NULL,
  "adminId" TEXT,
  "type" "ChatContactType" NOT NULL DEFAULT 'ADMIN',
  "state" "ChatContactState" NOT NULL DEFAULT 'ENABLED',
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "icon" TEXT NOT NULL,
  "systemKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "chat_contacts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chat_contacts_systemKey_key" ON "chat_contacts"("systemKey");
CREATE UNIQUE INDEX "chat_contacts_ownerAdminId_adminId_key" ON "chat_contacts"("ownerAdminId", "adminId");
CREATE INDEX "chat_contacts_ownerAdminId_state_updatedAt_idx" ON "chat_contacts"("ownerAdminId", "state", "updatedAt");

ALTER TABLE "chat_contacts"
  ADD CONSTRAINT "chat_contacts_ownerAdminId_fkey"
  FOREIGN KEY ("ownerAdminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "chat_contacts_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
