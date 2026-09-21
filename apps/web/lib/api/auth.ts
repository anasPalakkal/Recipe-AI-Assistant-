import type {
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
  SignupInput,
  VerifyEmailInput,
} from "@recipeai/shared";
import { apiPost } from "./request";

export interface PublicUser {
  id: string;
  email: string;
  emailVerified: boolean;
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

export function logout(): Promise<void> {
  return apiPost("/api/auth/logout", {});
}

export function verifyEmail(input: VerifyEmailInput): Promise<PublicUser> {
  return apiPost<PublicUser>("/api/auth/verify-email", input);
}

export function resendVerification(): Promise<void> {
  return apiPost("/api/auth/resend-verification", {});
}

export function forgotPassword(input: ForgotPasswordInput): Promise<{ message: string }> {
  return apiPost("/api/auth/forgot-password", input);
}

export function resetPassword(input: ResetPasswordInput): Promise<void> {
  return apiPost("/api/auth/reset-password", input);
}