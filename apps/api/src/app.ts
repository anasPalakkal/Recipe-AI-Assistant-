import Fastify, { type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { ZodError } from "zod";
import { loggerOptions } from "./lib/logger.js";
import { env } from "./config/env.js";
import { AppError, TooManyRequestsError } from "./lib/errors.js";
import sessionPlugin from "./plugins/session.plugin.js";
import authRoutes from "./modules/auth/auth.routes.js";
import recipeRoutes from "./modules/recipes/recipe.routes.js";
import apiKeyRoutes from "./modules/api-keys/api-key.routes.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: loggerOptions,
    genReqId: () => crypto.randomUUID(),
  });

  app.register(cookie, { secret: env.SESSION_SECRET });
  app.register(rateLimit, { global: false });
  app.register(sessionPlugin);

  app.register(authRoutes, { prefix: "/internal/auth" });
  app.register(recipeRoutes, { prefix: "/internal/recipes" });
  app.register(apiKeyRoutes, { prefix: "/internal/api-keys" });

  app.get("/health", async () => ({ status: "ok" }));

  // Other module routes (chat, nutrition, api-keys, usage) register
  // here in later phases, behind session or API-key auth as appropriate.

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      if (error instanceof TooManyRequestsError && error.retryAfterSeconds !== undefined) {
        reply.header("Retry-After", String(error.retryAfterSeconds));
      }

      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details !== undefined ? { details: error.details } : {}),
        },
      });
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