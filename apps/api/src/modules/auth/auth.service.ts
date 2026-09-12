import { prisma } from "../../lib/prisma.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { verifyGoogleIdToken } from "./google.provider.js";
import { normalizeEmail } from "../../lib/email.js";
import * as otpService from "./otp.service.js";
import { ConflictError, UnauthorizedError, NotFoundError } from "../../lib/errors.js";
import type { SignupInput, LoginInput } from "@recipeai/shared";

export async function signup(input: SignupInput) {
  const email = normalizeEmail(input.email);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError("An account with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { email, passwordHash, provider: "credentials" },
  });

  try {
    await otpService.sendVerificationCode(user.id, user.email);
  } catch (err) {
    // Best-effort: the account already exists and the session will be
    // created regardless. Failing here would make a mostly-successful
    // signup look like a hard failure. The user can retry via
    // POST /resend-verification.
    console.error("Failed to send verification email during signup:", err);
  }

  return user;
}

export async function login(input: LoginInput) {
  const email = normalizeEmail(input.email);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  return user;
}

export async function loginWithGoogle(idToken: string) {
  const profile = await verifyGoogleIdToken(idToken);

  if (!profile.emailVerified) {
    throw new UnauthorizedError("Google account email is not verified");
  }

  const email = normalizeEmail(profile.email);

  const existingByGoogleId = await prisma.user.findUnique({
    where: {
      provider_providerAccountId: { provider: "google", providerAccountId: profile.googleId },
    },
  });
  if (existingByGoogleId) return existingByGoogleId;

  const existingByEmail = await prisma.user.findUnique({ where: { email } });
  if (existingByEmail) {
    throw new ConflictError(
      "An account with this email already exists. Log in with your password instead.",
    );
  }

  return prisma.user.create({
    data: {
      email,
      provider: "google",
      providerAccountId: profile.googleId,
      emailVerifiedAt: new Date(),
    },
  });
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, emailVerifiedAt: true },
  });
  if (!user) throw new NotFoundError("User not found");
  return user;
}

export async function verifyEmail(userId: string, code: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User not found");

  if (user.emailVerifiedAt) {
    return user;
  }

  await otpService.verifyCode(userId, code);

  await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  return prisma.user.findUniqueOrThrow({ where: { id: userId } });
}

export async function resendVerificationCode(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("User not found");

  if (user.emailVerifiedAt) {
    throw new ConflictError("Email is already verified");
  }

  await otpService.sendVerificationCode(userId, user.email);
}