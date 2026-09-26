-- AlterEnum
ALTER TYPE "MessageResponseType" ADD VALUE 'IMAGE_ANALYSIS';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "imageAnalysis" JSONB,
ADD COLUMN     "userImageKey" TEXT;
