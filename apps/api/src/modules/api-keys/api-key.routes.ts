import type { FastifyInstance } from "fastify";
import { createApiKeySchema, apiKeyIdParamSchema } from "@recipeai/shared";
import * as apiKeyService from "./api-key.service.js";
import { sessionRateLimitKey } from "../../lib/rate-limit.js";
import { requireVerifiedEmail } from "../auth/require-verified-email.js";

const CRUD_RATE_LIMIT = { max: 30, timeWindow: "1 minute", keyGenerator: sessionRateLimitKey };

export default async function apiKeyRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.post(
    "/",
    { preHandler: requireVerifiedEmail, config: { rateLimit: CRUD_RATE_LIMIT } },
    async (request, reply) => {
      const body = createApiKeySchema.parse(request.body);
      const apiKey = await apiKeyService.createApiKey(request.userId!, body);
      return reply.status(201).send(apiKey);
    },
  );

  app.get(
    "/",
    { config: { rateLimit: CRUD_RATE_LIMIT } },
    async (request, reply) => {
      const apiKeys = await apiKeyService.listApiKeys(request.userId!);
      return reply.send(apiKeys);
    },
  );

  app.delete(
    "/:id",
    { preHandler: requireVerifiedEmail, config: { rateLimit: CRUD_RATE_LIMIT } },
    async (request, reply) => {
      const { id } = apiKeyIdParamSchema.parse(request.params);
      await apiKeyService.revokeApiKey(request.userId!, id);
      return reply.status(204).send();
    },
  );
}