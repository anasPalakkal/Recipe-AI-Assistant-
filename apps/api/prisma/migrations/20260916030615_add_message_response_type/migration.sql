-- CreateEnum
CREATE TYPE "MessageResponseType" AS ENUM ('RECIPE', 'FOOD_INFO', 'REFUSED');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "responseType" "MessageResponseType";
