import type { LoginInput, SignupInput } from "@recipeai/shared";
import { apiPost } from "./request";

// Inferred from auth.service.ts (getUserById's select) and auth.routes.ts
// (toPublicUser) — not confirmed against apps/api/src/lib/user.ts directly.
// Verify this against that file before relying on other fields existing.
export interface PublicUser {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
}

export function login(input: LoginInput): Promise<PublicUser> {
  return apiPost<PublicUser>("/api/auth/login", input);
}

export function signup(input: SignupInput): Promise<PublicUser> {
  return apiPost<PublicUser>("/api/auth/signup", input);
}

export function signInWithGoogle(idToken: string): Promise<PublicUser> {
  return apiPost<PublicUser>("/api/auth/google", { idToken });
}