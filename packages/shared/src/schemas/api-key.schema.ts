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