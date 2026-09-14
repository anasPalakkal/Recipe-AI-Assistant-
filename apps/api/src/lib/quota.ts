import type { FastifyBaseLogger } from "fastify";
import { redis } from "./redis.js";

export interface QuotaCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
}

function currentUtcPeriod(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function quotaKey(apiKeyId: string): string {
  return `quota:${apiKeyId}:${currentUtcPeriod()}`;
}

function secondsUntilNextUtcMonth(): number {
  const now = new Date();
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
  return Math.ceil((nextMonth.getTime() - now.getTime()) / 1000);
}

// Atomic INCR-first quota check, same class as the OTP counters: the
// increment always happens (this call always counts as an attempt,
// including calls that later fail upstream — see quota policy notes in
// architecture.md §6), and the limit is only ever checked against the
// value INCR itself returned. There is no read-then-write window.
//
// Fails open on Redis errors: an unreachable Redis must not take down the
// entire public API. Logged at error level so a sustained outage is
// visible, not silent.
export async function checkAndIncrementQuota(
  apiKeyId: string,
  monthlyQuota: number,
  logger: FastifyBaseLogger,
): Promise<QuotaCheckResult> {
  const key = quotaKey(apiKeyId);

  try {
    const used = await redis.incr(key);
    if (used === 1) {
      await redis.expire(key, secondsUntilNextUtcMonth());
    }
    return { allowed: used <= monthlyQuota, used, limit: monthlyQuota };
  } catch (err) {
    logger.error({ err, apiKeyId }, "quota check failed, failing open");
    return { allowed: true, used: 0, limit: monthlyQuota };
  }
}