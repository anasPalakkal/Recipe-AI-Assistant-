import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "./prisma.js";
import { hashApiKey } from "./api-key.js";
import { UnauthorizedError } from "./errors.js";

declare module "fastify" {
  interface FastifyRequest {
    apiKeyId?: string;
    apiKeyRateLimitPerMinute?: number;
    apiKeyMonthlyQuota?: number;
  }
}

const BEARER_PREFIX = "Bearer ";

// Same contract as `authenticate`: sets request.userId, so any service
// function written against session auth works unchanged under API-key
// auth. Also exposes apiKeyId, and each key's own configured limits, so
// downstream rate limiting and quota checks can be per-key rather than
// global constants.
export async function apiKeyAuth(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith(BEARER_PREFIX)) {
    throw new UnauthorizedError("Missing or malformed Authorization header");
  }

  const rawKey = header.slice(BEARER_PREFIX.length).trim();
  if (!rawKey) {
    throw new UnauthorizedError("Missing or malformed Authorization header");
  }

  const keyHash = hashApiKey(rawKey);
  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } });

  // Deliberately identical error for "no such key" and "revoked key" —
  // distinguishing them would let a caller probe whether a specific key
  // string was ever valid.
  if (!apiKey || apiKey.revokedAt) {
    throw new UnauthorizedError("Invalid API key");
  }

  request.userId = apiKey.userId;
  request.apiKeyId = apiKey.id;
  request.apiKeyRateLimitPerMinute = apiKey.rateLimitPerMinute;
  request.apiKeyMonthlyQuota = apiKey.monthlyQuota;

  // Fire-and-forget: last-used tracking must never block or fail the
  // request it's recording.
  prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch((err) => request.log.error({ err }, "failed to update apiKey.lastUsedAt"));
}