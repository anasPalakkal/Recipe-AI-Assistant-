-- CreateEnum
CREATE TYPE "ImageSource" AS ENUM ('PEXELS', 'AI_GENERATED', 'NONE');

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "imageAttributionName" TEXT,
ADD COLUMN     "imageAttributionUrl" TEXT,
ADD COLUMN     "imageSource" "ImageSource" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "imageThumbnailUrl" TEXT,
ADD COLUMN     "imageUrl" TEXT;
