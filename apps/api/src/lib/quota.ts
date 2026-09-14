import type { FastifyBaseLogger } from "fastify";
import { redis } from "./redis.js";

export interface QuotaCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  // Unix seconds when the current billing period ends (start of next UTC month).
  resetAt: number;
  // True only when Redis itself was unreachable — distinct from a
  // legitimate over-quota rejection, so the caller can return a
  // different error (service unavailable, not "you're over your limit").
  redisUnavailable?: boolean;
}

function currentUtcPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function quotaKey(apiKeyId: string): string {
  return `quota:${apiKeyId}:${currentUtcPeriod()}`;
}

function nextUtcMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
}

function secondsUntilNextUtcMonth(): number {
  return Math.ceil((nextUtcMonthStart().getTime() - Date.now()) / 1000);
}

// Atomic INCR-first quota check: the increment always happens, and the
// limit is only ever checked against the value INCR itself returned —
// no read-then-write window.
//
// Deliberately fails CLOSED on Redis errors, unlike the throttle check.
// A quota bypass isn't just degraded availability — it's uncapped spend
// on a real, metered upstream (Gemini) for as long as the outage lasts.
// Rejecting is the safe default here; the caller is expected to surface
// this as a distinct "service temporarily unavailable" error, not a
// normal quota-exceeded rejection.
export async function checkAndIncrementQuota(
  apiKeyId: string,
  monthlyQuota: number,
  logger: FastifyBaseLogger,
): Promise<QuotaCheckResult> {
  const key = quotaKey(apiKeyId);
  const resetAt = Math.floor(nextUtcMonthStart().getTime() / 1000);

  try {
    const used = await redis.incr(key);
    if (used === 1) {
      await redis.expire(key, secondsUntilNextUtcMonth());
    }
    return { allowed: used <= monthlyQuota, used, limit: monthlyQuota, resetAt };
  } catch (err) {
    logger.error({ err, apiKeyId }, "quota check failed, failing closed (cost exposure risk)");
    return { allowed: false, used: 0, limit: monthlyQuota, resetAt, redisUnavailable: true };
  }
}