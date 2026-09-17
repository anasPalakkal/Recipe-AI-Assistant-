import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import { ZodError } from "zod";
import { loggerOptions } from "./lib/logger.js";
import { env } from "./config/env.js";
import { AppError, TooManyRequestsError, formatAppErrorBody } from "./lib/errors.js";
import { MAX_UPLOAD_BYTES } from "./lib/vision/validate-image.js";
import sessionPlugin from "./plugins/session.plugin.js";
import authRoutes from "./modules/auth/auth.routes.js";
import recipeRoutes from "./modules/recipes/recipe.routes.js";
import apiKeyRoutes from "./modules/api-keys/api-key.routes.js";
import publicRecipeRoutes from "./modules/public-api/recipe.routes.js";
import { redis } from "./lib/redis.js";
import chatRoutes from "./modules/chat/chat.routes.js";
import visionRoutes from "./modules/vision/vision.routes.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: loggerOptions,
    genReqId: () => crypto.randomUUID(),
  });

  app.register(cookie, { secret: env.SESSION_SECRET });
  app.register(rateLimit, { global: false, redis, skipOnError: true });
  app.register(multipart, { limits: { fileSize: MAX_UPLOAD_BYTES } });
  app.register(sessionPlugin);

  app.register(authRoutes, { prefix: "/internal/auth" });
  app.register(recipeRoutes, { prefix: "/internal/recipes" });
  app.register(apiKeyRoutes, { prefix: "/internal/api-keys" });
  app.register(chatRoutes, { prefix: "/internal/chat" });
  app.register(visionRoutes, { prefix: "/internal/vision" });
  app.register(publicRecipeRoutes, { prefix: "/v1/recipes" });

  app.get("/health", async () => ({ status: "ok" }));

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      if (error instanceof TooManyRequestsError && error.retryAfterSeconds !== undefined) {
        reply.header("Retry-After", String(error.retryAfterSeconds));
      }
      return reply.status(error.statusCode).send(formatAppErrorBody(error));
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: "Invalid request", details: error.flatten() },
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
    });
  });

  return app;
}