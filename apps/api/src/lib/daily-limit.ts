import type { FastifyBaseLogger } from "fastify";
import { redis } from "./redis.js";

export interface DailyLimitResult {
  allowed: boolean;
  used: number;
  limit: number;
  // Unix seconds, start of the next UTC day.
  resetAt: number;
  redisUnavailable?: boolean;
}

function utcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function dailyKey(scope: string, id: string): string {
  return `daily:${scope}:${id}:${utcDate()}`;
}

function nextUtcDayStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

// Same INCR-first, fail-closed pattern as lib/quota.ts: each use spends a
// real call on a capped upstream, so an unreadable counter must not mean
// unlimited usage.
export async function checkAndIncrementDaily(
  scope: string,
  id: string,
  limit: number,
  logger: FastifyBaseLogger,
): Promise<DailyLimitResult> {
  const key = dailyKey(scope, id);
  const resetAt = Math.floor(nextUtcDayStart().getTime() / 1000);

  try {
    const used = await redis.incr(key);
    if (used === 1) {
      await redis.expire(key, Math.ceil((nextUtcDayStart().getTime() - Date.now()) / 1000));
    }
    return { allowed: used <= limit, used, limit, resetAt };
  } catch (err) {
    logger.error({ err, scope, id }, "daily limit check failed, failing closed");
    return { allowed: false, used: 0, limit, resetAt, redisUnavailable: true };
  }
}

// For failures that happen before the capped upstream is actually used.
// Best-effort: a failed rollback only leaves the counter one higher.
export async function rollbackDaily(scope: string, id: string, logger: FastifyBaseLogger): Promise<void> {
  try {
    await redis.decr(dailyKey(scope, id));
  } catch (err) {
    logger.warn({ err, scope, id }, "failed to roll back daily limit");
  }
}