import { Prisma } from "@prisma/client";
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
  const { rawKey, keyPrefix, keyHash } = generateApiKey();

  // Count-then-insert is a TOCTOU race under concurrency: two simultaneous
  // requests could both pass the count check before either commits. A
  // Serializable transaction makes Postgres detect that conflict and
  // abort one of the two automatically, rather than silently allowing
  // 6+ active keys.
  try {
    const apiKey = await prisma.$transaction(
      async (tx) => {
        const activeCount = await tx.apiKey.count({ where: { userId, revokedAt: null } });

        if (activeCount >= MAX_ACTIVE_API_KEYS) {
          throw new ConflictError(
            `You can have at most ${MAX_ACTIVE_API_KEYS} active API keys. Revoke one before creating another.`,
            "API_KEY_LIMIT_REACHED",
          );
        }

        return tx.apiKey.create({ data: { userId, name: input.name, keyPrefix, keyHash } });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return toCreatedApiKeyResponse(apiKey, rawKey);
  } catch (err) {
    // A Serializable transaction conflict (two concurrent creates racing
    // the same count check) surfaces as a Prisma P2034 error — treat it
    // the same as hitting the limit, since the safe response is "try
    // again," not a generic 500.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
      throw new ConflictError(
        "Could not create key due to a concurrent request. Please try again.",
        "API_KEY_CREATE_CONFLICT",
      );
    }
    throw err;
  }
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