import { z } from "zod";

const emailSchema = z.string().email("Enter a valid email address").max(255);

const newPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters");

export const signupSchema = z.object({
  email: emailSchema,
  password: newPasswordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(128),
});

export const googleSignInSchema = z.object({
  idToken: z.string().min(1),
});

export const verifyEmailSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: newPasswordSchema,
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleSignInInput = z.infer<typeof googleSignInSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;