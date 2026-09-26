import type { FastifyBaseLogger } from "fastify";
import { redis } from "../redis.js";

export interface VisionQuotaCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  resetAt: number; // unix seconds, start of next UTC day
  redisUnavailable?: boolean;
}

function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function visionQuotaKey(userId: string): string {
  return `vision:quota:${userId}:${todayUtcDate()}`;
}

function nextUtcDayStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
}

function secondsUntilNextUtcDay(): number {
  return Math.ceil((nextUtcDayStart().getTime() - Date.now()) / 1000);
}

// Same atomic INCR-first, fail-closed pattern as lib/quota.ts. Not reusing
// that module directly - its key/period model is monthly, keyed by
// apiKeyId (public API billing); this is daily, keyed by userId (internal
// per-user cost control). Forcing both into one generic function would
// trade a small amount of duplication for a leakier abstraction.
export async function checkAndIncrementVisionQuota(
  userId: string,
  dailyLimit: number,
  logger: FastifyBaseLogger,
): Promise<VisionQuotaCheckResult> {
  const key = visionQuotaKey(userId);
  const resetAt = Math.floor(nextUtcDayStart().getTime() / 1000);

  try {
    const used = await redis.incr(key);
    if (used === 1) {
      await redis.expire(key, secondsUntilNextUtcDay());
    }
    return { allowed: used <= dailyLimit, used, limit: dailyLimit, resetAt };
  } catch (err) {
    logger.error({ err, userId }, "vision quota check failed, failing closed");
    return { allowed: false, used: 0, limit: dailyLimit, resetAt, redisUnavailable: true };
  }
}

// Compensating decrement for a failure that happens before the request
// ever reaches Gemini (e.g. the image storage upload). Mirrors this
// module's existing "a rejected upload shouldn't cost quota" principle.
// Best-effort: a failure here just leaves the counter one higher than
// ideal - not worth failing the request over.
export async function rollbackVisionQuota(userId: string, logger: FastifyBaseLogger): Promise<void> {
  const key = visionQuotaKey(userId);
  try {
    await redis.decr(key);
  } catch (err) {
    logger.warn({ err, userId }, "failed to roll back vision quota after a pre-Gemini failure");
  }
}