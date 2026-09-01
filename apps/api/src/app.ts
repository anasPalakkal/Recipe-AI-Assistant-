import Fastify, { type FastifyInstance } from "fastify";
import { logger } from "./lib/logger.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger,
    genReqId: () => crypto.randomUUID(),
  });

  app.get("/health", async () => ({ status: "ok" }));

  // Module routes (auth, chat, recipes, nutrition, api-keys, usage) register
  // here in later phases, each behind its own auth plugin (session or
  // API-key). Centralized error handling also lands here once the custom
  // error classes exist (see architecture §15) - not needed for a health
  // check.

  return app;
}
