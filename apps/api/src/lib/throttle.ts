import type { FastifyBaseLogger } from "fastify";
import { redis } from "./redis.js";

export interface ThrottleCheckResult {
  allowed: boolean;
  count: number;
  limit: number;
}

const WINDOW_SECONDS = 60;

// Fixed window bucketed by the current minute, not a sliding window — a
// caller could in principle burst near the limit at the tail of one
// bucket and again at the head of the next. Acceptable for an abuse
// throttle at this scale; a sliding window would need a sorted-set
// implementation for a marginal accuracy gain.
function throttleKey(apiKeyId: string): string {
  const bucket = Math.floor(Date.now() / 1000 / WINDOW_SECONDS);
  return `throttle:${apiKeyId}:${bucket}`;
}

export async function checkAndIncrementThrottle(
  apiKeyId: string,
  limit: number,
  logger: FastifyBaseLogger,
): Promise<ThrottleCheckResult> {
  const key = throttleKey(apiKeyId);

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, WINDOW_SECONDS);
    }
    return { allowed: count <= limit, count, limit };
  } catch (err) {
    logger.error({ err, apiKeyId }, "throttle check failed, failing open");
    return { allowed: true, count: 0, limit };
  }
}