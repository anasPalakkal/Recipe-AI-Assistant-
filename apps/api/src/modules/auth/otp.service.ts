import { randomInt, createHash, timingSafeEqual } from "node:crypto";
import { redis } from "../../lib/redis.js";
import { emailProvider } from "../../lib/mail/index.js";
import { BadRequestError, GoneError, TooManyRequestsError } from "../../lib/errors.js";

const CODE_TTL_SECONDS = 60 * 10;
const COOLDOWN_TTL_SECONDS = 60;
const HOURLY_LIMIT = 5;
const HOURLY_TTL_SECONDS = 60 * 60;
const DAILY_LIMIT = 10;
const DAILY_TTL_SECONDS = 60 * 60 * 24;
const MAX_ATTEMPTS = 5;
const LOCKOUT_CYCLE_LIMIT = 3;
const LOCKOUT_CYCLE_TTL_SECONDS = 60 * 60 * 24;
const BLOCKED_TTL_SECONDS = 60 * 30;

const codeKey = (userId: string) => `email-verify:${userId}`;
const cooldownKey = (userId: string) => `email-verify-cooldown:${userId}`;
const hourlyKey = (userId: string) => `email-verify-hourly:${userId}`;
const dailyKey = (userId: string) => `email-verify-daily:${userId}`;
const lockoutCyclesKey = (userId: string) => `email-verify-lockout-cycles:${userId}`;
const blockedKey = (userId: string) => `email-verify-blocked:${userId}`;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

async function retryAfter(key: string): Promise<number> {
  const ttl = await redis.ttl(key);
  return ttl > 0 ? ttl : 0;
}

export async function sendVerificationCode(userId: string, email: string): Promise<void> {
  if (await redis.exists(blockedKey(userId))) {
    throw new TooManyRequestsError(
      "Verification is temporarily locked due to repeated failed attempts",
      "VERIFICATION_TEMPORARILY_LOCKED",
      await retryAfter(blockedKey(userId)),
    );
  }

  if (await redis.exists(cooldownKey(userId))) {
    throw new TooManyRequestsError(
      "Please wait before requesting another code",
      "RESEND_COOLDOWN",
      await retryAfter(cooldownKey(userId)),
    );
  }

  const hourlyCount = Number((await redis.get(hourlyKey(userId))) ?? 0);
  if (hourlyCount >= HOURLY_LIMIT) {
    throw new TooManyRequestsError(
      "Too many verification codes requested this hour",
      "RESEND_HOURLY_LIMIT",
      await retryAfter(hourlyKey(userId)),
    );
  }

  const dailyCount = Number((await redis.get(dailyKey(userId))) ?? 0);
  if (dailyCount >= DAILY_LIMIT) {
    throw new TooManyRequestsError(
      "Too many verification codes requested today",
      "RESEND_DAILY_LIMIT",
      await retryAfter(dailyKey(userId)),
    );
  }

  const code = randomInt(100000, 999999).toString();

  await redis.hset(codeKey(userId), { codeHash: hashCode(code), attempts: 0 });
  await redis.expire(codeKey(userId), CODE_TTL_SECONDS);
  await redis.set(cooldownKey(userId), "1", "EX", COOLDOWN_TTL_SECONDS);

  const hourlyResult = await redis.incr(hourlyKey(userId));
  if (hourlyResult === 1) await redis.expire(hourlyKey(userId), HOURLY_TTL_SECONDS);

  const dailyResult = await redis.incr(dailyKey(userId));
  if (dailyResult === 1) await redis.expire(dailyKey(userId), DAILY_TTL_SECONDS);

  await emailProvider.sendVerificationEmail(email, code);
}

export async function verifyCode(userId: string, submittedCode: string): Promise<void> {
  if (await redis.exists(blockedKey(userId))) {
    throw new TooManyRequestsError(
      "Verification is temporarily locked due to repeated failed attempts",
      "VERIFICATION_TEMPORARILY_LOCKED",
      await retryAfter(blockedKey(userId)),
    );
  }

  const record = await redis.hgetall(codeKey(userId));
  if (!record.codeHash) {
    throw new GoneError("Verification code has expired, request a new one", "EMAIL_VERIFICATION_EXPIRED");
  }

  const storedHash = Buffer.from(record.codeHash, "hex");
  const submittedHash = Buffer.from(hashCode(submittedCode), "hex");
  const isMatch = storedHash.length === submittedHash.length && timingSafeEqual(storedHash, submittedHash);

  if (isMatch) {
    await redis.del(codeKey(userId));
    return;
  }

  const attempts = await redis.hincrby(codeKey(userId), "attempts", 1);
  // Safety net: if a concurrent request already deleted this key (e.g. a
  // race with a successful verify), HINCRBY silently recreates it with no
  // TTL. This EXPIRE is idempotent on the normal path and closes that leak.
  await redis.expire(codeKey(userId), CODE_TTL_SECONDS);

  if (attempts < MAX_ATTEMPTS) {
    throw new BadRequestError("Incorrect verification code", "EMAIL_VERIFICATION_INVALID_CODE", {
      remainingAttempts: MAX_ATTEMPTS - attempts,
    });
  }

  await redis.del(codeKey(userId));

  const cycles = await redis.incr(lockoutCyclesKey(userId));
  if (cycles === 1) await redis.expire(lockoutCyclesKey(userId), LOCKOUT_CYCLE_TTL_SECONDS);

  if (cycles >= LOCKOUT_CYCLE_LIMIT) {
    await redis.set(blockedKey(userId), "1", "EX", BLOCKED_TTL_SECONDS);
    throw new TooManyRequestsError(
      "Too many failed attempts, verification is temporarily locked",
      "VERIFICATION_TEMPORARILY_LOCKED",
      BLOCKED_TTL_SECONDS,
    );
  }

  throw new TooManyRequestsError("Too many failed attempts, request a new code", "EMAIL_VERIFICATION_LOCKED");
}