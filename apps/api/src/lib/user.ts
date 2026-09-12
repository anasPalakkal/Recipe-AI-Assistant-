import type { User } from "@prisma/client";

export interface PublicUser {
  id: string;
  email: string;
  emailVerified: boolean;
}

export function toPublicUser(user: Pick<User, "id" | "email" | "emailVerifiedAt">): PublicUser {
  return { id: user.id, email: user.email, emailVerified: user.emailVerifiedAt !== null };
}