import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { ApiError, serverFetch } from "@/lib/api-client";
import type { PublicUser } from "@/lib/api/auth";

// cache() dedupes the /me call when a layout and its page both ask
export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  try {
    return await serverFetch<PublicUser>("/internal/auth/me");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
});

export async function requireUser(): Promise<PublicUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireVerifiedUser(): Promise<PublicUser> {
  const user = await requireUser();
  if (!user.emailVerified) redirect("/verify-email");
  return user;
}

export async function getOptionalUser(): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  if (!cookieStore.has("sid")) return null;

  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

export async function redirectIfVerified(): Promise<void> {
  const user = await getOptionalUser();
  if (user?.emailVerified) redirect("/chat");
}