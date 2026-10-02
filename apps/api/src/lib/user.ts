import type { User } from "@prisma/client";

export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
}

export function toPublicUser(
  user: Pick<User, "id" | "email" | "name" | "emailVerifiedAt">,
): PublicUser {
  return { id: user.id, email: user.email, name: user.name, emailVerified: user.emailVerifiedAt !== null };
}