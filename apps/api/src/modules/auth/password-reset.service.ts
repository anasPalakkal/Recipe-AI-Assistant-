import { randomBytes, createHash } from "node:crypto";
import { redis } from "../../lib/redis.js";
import { prisma } from "../../lib/prisma.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { normalizeEmail } from "../../lib/email.js";
import { emailProvider } from "../../lib/mail/index.js";
import { revokeAllSessions } from "../../plugins/session.plugin.js";
import { env } from "../../config/env.js";
import { GoneError, TooManyRequestsError,ConflictError } from "../../lib/errors.js";

const RESET_TOKEN_TTL_SECONDS = 60 * 60;
const COOLDOWN_TTL_SECONDS = 60;
const HOURLY_LIMIT = 5;
const HOURLY_TTL_SECONDS = 60 * 60;

function hashEmail(email: string): string {
  return createHash("sha256").update(email).digest("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const cooldownKey = (emailHash: string) => `password-reset-cooldown:${emailHash}`;
const hourlyKey = (emailHash: string) => `password-reset-hourly:${emailHash}`;
const tokenKey = (tokenHash: string) => `password-reset:${tokenHash}`;

async function retryAfter(key: string): Promise<number> {
  const ttl = await redis.ttl(key);
  return ttl > 0 ? ttl : 0;
}

export async function requestPasswordReset(rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail);
  const emailHash = hashEmail(email);

  // Throttle checked before any DB lookup, so behavior and timing are
  // identical whether or not the account exists — the rate limiter must
  // never become a side channel for confirming an email is registered.
  if (await redis.exists(cooldownKey(emailHash))) {
    throw new TooManyRequestsError(
      "Please wait before requesting another reset link",
      "RESET_COOLDOWN",
      await retryAfter(cooldownKey(emailHash)),
    );
  }

  const hourlyCount = Number((await redis.get(hourlyKey(emailHash))) ?? 0);
  if (hourlyCount >= HOURLY_LIMIT) {
    throw new TooManyRequestsError(
      "Too many reset requests for this email, try again later",
      "RESET_HOURLY_LIMIT",
      await retryAfter(hourlyKey(emailHash)),
    );
  }

  await redis.set(cooldownKey(emailHash), "1", "EX", COOLDOWN_TTL_SECONDS);
  const hourlyResult = await redis.incr(hourlyKey(emailHash));
  if (hourlyResult === 1) await redis.expire(hourlyKey(emailHash), HOURLY_TTL_SECONDS);

  const user = await prisma.user.findUnique({ where: { email } });

  // No account, and a Google-only account, both resolve silently past this
  // point — the caller sees identical behavior in every case.
  if (!user) return;

  if (!user.passwordHash) {
    await emailProvider.sendAccountUsesGoogleEmail(user.email);
    return;
  }

  const rawToken = randomBytes(32).toString("hex");
  await redis.set(tokenKey(hashToken(rawToken)), user.id, "EX", RESET_TOKEN_TTL_SECONDS);

  const resetLink = `${env.APP_BASE_URL}/reset-password?token=${rawToken}`;
  await emailProvider.sendPasswordResetEmail(user.email, resetLink);
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const userId = await redis.get(tokenKey(hashToken(rawToken)));
  if (!userId) {
    throw new GoneError("This reset link has expired or already been used", "PASSWORD_RESET_EXPIRED");
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true, email: true } });
  if (user?.passwordHash) {
    const isSameAsOld = await verifyPassword(user.passwordHash, newPassword);
    if (isSameAsOld) {
      throw new ConflictError(
        "New password must be different from your current password",
        "PASSWORD_SAME_AS_OLD",
      );
    }
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  await redis.del(tokenKey(hashToken(rawToken)));
  await revokeAllSessions(userId);

  if (user) {
    try {
      await emailProvider.sendPasswordChangedEmail(user.email);
    } catch (err) {
      console.error("Failed to send password-changed confirmation email:", err);
    }
  }
}