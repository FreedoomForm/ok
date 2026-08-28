ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "replyToMessageId" TEXT;

CREATE INDEX IF NOT EXISTS "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "messages_replyToMessageId_idx" ON "messages"("replyToMessageId");
