import type { FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { ForbiddenError, NotFoundError } from "../../lib/errors.js";

export async function requireVerifiedEmail(request: FastifyRequest): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: request.userId! },
    select: { emailVerifiedAt: true },
  });

  if (!user) throw new NotFoundError("User not found");

  if (!user.emailVerifiedAt) {
    throw new ForbiddenError("Email verification required", "EMAIL_NOT_VERIFIED");
  }
}