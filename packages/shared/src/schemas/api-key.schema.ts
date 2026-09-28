import { z } from "zod";

export const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const apiKeyIdParamSchema = z.object({
  id: z.string().cuid(),
});

export interface ApiKeySummary {
  id: string;
  name: string;
  keyPrefix: string;
  rateLimitPerMinute: number;
  monthlyQuota: number;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

// Returned only from the create endpoint. rawKey is shown exactly once —
// it is never retrievable again after this response.
export interface CreatedApiKeyResponse extends ApiKeySummary {
  rawKey: string;
}

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type ApiKeyIdParam = z.infer<typeof apiKeyIdParamSchema>;

export const usageRangeSchema = z.enum(["7d", "30d", "90d"]);

export const apiKeyUsageQuerySchema = z.object({
  range: usageRangeSchema.default("7d"),
  keyId: z.string().cuid().optional(),
});

export type UsageRange = z.infer<typeof usageRangeSchema>;
export type ApiKeyUsageQuery = z.infer<typeof apiKeyUsageQuerySchema>;

export interface UsageSeriesPoint {
  date: string; // "YYYY-MM-DD", UTC
  requests: number;
}

export interface UsageRow {
  date: string;
  apiKeyId: string;
  keyName: string;
  requests: number;
  rateLimited: number;
  quotaExceeded: number;
}

export interface UsageResponse {
  series: UsageSeriesPoint[];
  rows: UsageRow[];
}

export interface DashboardResponse {
  requestsThisMonth: number;
  monthlyQuotaTotal: number;
  activeKeyCount: number;
  maxActiveKeys: number;
  rateLimitedLast30Days: number;
  last7DaysSeries: UsageSeriesPoint[];
}