import type { FastifyBaseLogger } from "fastify";
import { redis } from "./redis.js";

const IDEMPOTENCY_TTL_SECONDS = 60 * 60 * 24; // 24 hours

export interface CachedResponse {
  statusCode: number;
  body: unknown;
}

function idempotencyKey(apiKeyId: string, key: string): string {
  return `idempotency:${apiKeyId}:${key}`;
}

// Fails open (treats as a cache miss) on Redis errors — a lookup failure
// should not block the request, it should just proceed as if this were
// the first attempt.
export async function getCachedResponse(
  apiKeyId: string,
  key: string,
  logger: FastifyBaseLogger,
): Promise<CachedResponse | null> {
  try {
    const raw = await redis.get(idempotencyKey(apiKeyId, key));
    return raw ? (JSON.parse(raw) as CachedResponse) : null;
  } catch (err) {
    logger.error({ err, apiKeyId }, "idempotency cache read failed, proceeding without cache");
    return null;
  }
}

export async function cacheResponse(
  apiKeyId: string,
  key: string,
  response: CachedResponse,
  logger: FastifyBaseLogger,
): Promise<void> {
  try {
    await redis.set(
      idempotencyKey(apiKeyId, key),
      JSON.stringify(response),
      "EX",
      IDEMPOTENCY_TTL_SECONDS,
    );
  } catch (err) {
    logger.error({ err, apiKeyId }, "failed to cache idempotent response");
  }
}