import { prisma } from "../../lib/prisma.js";
import { ConflictError, NotFoundError } from "../../lib/errors.js";
import {
  generateApiKey,
  toApiKeySummary,
  toCreatedApiKeyResponse,
  MAX_ACTIVE_API_KEYS,
} from "../../lib/api-key.js";
import type { CreateApiKeyInput } from "@recipeai/shared";

export async function createApiKey(userId: string, input: CreateApiKeyInput) {
  const activeCount = await prisma.apiKey.count({
    where: { userId, revokedAt: null },
  });

  if (activeCount >= MAX_ACTIVE_API_KEYS) {
    throw new ConflictError(
      `You can have at most ${MAX_ACTIVE_API_KEYS} active API keys. Revoke one before creating another.`,
      "API_KEY_LIMIT_REACHED",
    );
  }

  const { rawKey, keyPrefix, keyHash } = generateApiKey();

  const apiKey = await prisma.apiKey.create({
    data: { userId, name: input.name, keyPrefix, keyHash },
  });

  return toCreatedApiKeyResponse(apiKey, rawKey);
}

export async function listApiKeys(userId: string) {
  const apiKeys = await prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return apiKeys.map(toApiKeySummary);
}

export async function revokeApiKey(userId: string, id: string) {
  const existing = await prisma.apiKey.findFirst({ where: { id, userId } });
  if (!existing) throw new NotFoundError("API key not found");

  // Idempotent: revoking an already-revoked key is a no-op success rather
  // than overwriting the original revocation timestamp.
  if (existing.revokedAt) return;

  await prisma.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
}