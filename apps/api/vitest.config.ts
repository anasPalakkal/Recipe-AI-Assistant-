import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      REDIS_URL: "redis://localhost:6379",
      SESSION_SECRET: "test-session-secret-at-least-32-characters-long",
      INTERNAL_PROXY_SECRET:"test-session-secret-at-least-32-characters-long",
      GOOGLE_CLIENT_ID: "test",
      AI_GATEWAY_BASE_URL: "http://localhost:9999",
      GEMINI_API_KEY: "test-internal-key",
      GEMINI_API_KEY_PUBLIC: "test-public-key",
      GEMINI_MODEL: "test-model",
      BREVO_API_KEY: "test",
      EMAIL_FROM: "test@example.com",
      PEXELS_API_KEY: "test",
      CLOUDINARY_CLOUD_NAME: "test",
      CLOUDINARY_API_KEY: "test",
      CLOUDINARY_API_SECRET: "test",
      APP_BASE_URL: "http://localhost:3000",
    },
  },
});