import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "./prisma.js";
import { hashApiKey } from "./api-key.js";
import { UnauthorizedError } from "./errors.js";

declare module "fastify" {
  interface FastifyRequest {
    apiKeyId?: string;
  }
}

const BEARER_PREFIX = "Bearer ";

// Same contract as `authenticate`: sets request.userId, so any service
// function written against session auth works unchanged under API-key
// auth. Also sets request.apiKeyId, needed downstream for rate limiting,
// quota checks, and usage logging keyed by key rather than by user.
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

  // Fire-and-forget: last-used tracking must never block or fail the
  // request it's recording.
  prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch((err) => request.log.error({ err }, "failed to update apiKey.lastUsedAt"));
}