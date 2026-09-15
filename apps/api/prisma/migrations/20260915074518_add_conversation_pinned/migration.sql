-- DropIndex
DROP INDEX "Conversation_userId_updatedAt_idx";

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Conversation_userId_pinned_updatedAt_idx" ON "Conversation"("userId", "pinned", "updatedAt");
