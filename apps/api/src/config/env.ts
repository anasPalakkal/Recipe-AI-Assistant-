import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  INTERNAL_PROXY_SECRET: z.string().min(32),

  GOOGLE_CLIENT_ID: z.string().min(1),

  AI_GATEWAY_BASE_URL: z.string().url(),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_API_KEY_PUBLIC: z.string().min(1),
  GEMINI_MODEL: z.string().min(1).default("gemini-3.6-flash"),

  CHAT_DAILY_LIMIT: z.coerce.number().int().positive().default(5),
  PUBLIC_API_DAILY_LIMIT: z.coerce.number().int().positive().default(3),

  BREVO_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().email(),

  PEXELS_API_KEY: z.string().min(1),

  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),

  APP_BASE_URL: z.string().url(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("Invalid environment configuration:");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();