-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "imageAttributionName" TEXT,
ADD COLUMN     "imageAttributionUrl" TEXT,
ADD COLUMN     "imageSource" "ImageSource" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "imageThumbnailUrl" TEXT,
ADD COLUMN     "imageUrl" TEXT;
