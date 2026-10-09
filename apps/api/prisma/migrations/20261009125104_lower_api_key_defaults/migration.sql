-- AlterTable
ALTER TABLE "ApiKey" ALTER COLUMN "rateLimitPerMinute" SET DEFAULT 5,
ALTER COLUMN "monthlyQuota" SET DEFAULT 30;
UPDATE "ApiKey" SET "rateLimitPerMinute" = 5, "monthlyQuota" = 30
WHERE "rateLimitPerMinute" = 20 AND "monthlyQuota" = 300;
