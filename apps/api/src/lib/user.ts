import type { User } from "@prisma/client";

export interface PublicUser {
  id: string;
  email: string;
}

export function toPublicUser(user: Pick<User, "id" | "email">): PublicUser {
  return { id: user.id, email: user.email };
}