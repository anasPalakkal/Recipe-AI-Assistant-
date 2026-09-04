import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

export const googleSignInSchema = z.object({
  idToken: z.string().min(1),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleSignInInput = z.infer<typeof googleSignInSchema>;