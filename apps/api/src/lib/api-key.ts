import { randomBytes, createHash } from "node:crypto";
import type { ApiKey } from "@prisma/client";
import type { ApiKeySummary, CreatedApiKeyResponse } from "@recipeai/shared";

const KEY_PREFIX = "rk_live_";
// Prefix stored/shown for dashboard identification — long enough to
// distinguish keys at a glance, short enough to reveal nothing useful.
const DISPLAY_PREFIX_LENGTH = 12;

export const MAX_ACTIVE_API_KEYS = 5;

export function generateApiKey(): { rawKey: string; keyPrefix: string; keyHash: string } {
  const rawKey = `${KEY_PREFIX}${randomBytes(32).toString("hex")}`;
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, DISPLAY_PREFIX_LENGTH);
  return { rawKey, keyPrefix, keyHash };
}

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function toApiKeySummary(apiKey: ApiKey): ApiKeySummary {
  return {
    id: apiKey.id,
    name: apiKey.name,
    keyPrefix: apiKey.keyPrefix,
    rateLimitPerMinute: apiKey.rateLimitPerMinute,
    monthlyQuota: apiKey.monthlyQuota,
    lastUsedAt: apiKey.lastUsedAt?.toISOString() ?? null,
    revokedAt: apiKey.revokedAt?.toISOString() ?? null,
    createdAt: apiKey.createdAt.toISOString(),
  };
}

export function toCreatedApiKeyResponse(apiKey: ApiKey, rawKey: string): CreatedApiKeyResponse {
  return { ...toApiKeySummary(apiKey), rawKey };
}