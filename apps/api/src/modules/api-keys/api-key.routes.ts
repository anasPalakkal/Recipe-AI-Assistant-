import { createApiKeySchema, apiKeyIdParamSchema, apiKeyUsageQuerySchema } from "@recipeai/shared";
import * as apiKeyService from "./api-key.service.js";
import * as usageService from "./usage.service.js";
import { sessionRateLimitKey } from "../../lib/rate-limit.js";

const CRUD_RATE_LIMIT = { max: 30, timeWindow: "1 minute", keyGenerator: sessionRateLimitKey };

export default async function apiKeyRoutes(app: FastifyInstance) {
  app.post(
    "/",
    { config: { rateLimit: CRUD_RATE_LIMIT } },
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
    { config: { rateLimit: CRUD_RATE_LIMIT } },
    async (request, reply) => {
      const { id } = apiKeyIdParamSchema.parse(request.params);
      await apiKeyService.revokeApiKey(request.userId!, id);
      return reply.status(204).send();
    },
  );

    app.get(
    "/dashboard",
    { config: { rateLimit: CRUD_RATE_LIMIT } },
    async (request, reply) => {
      const dashboard = await usageService.getDashboard(request.userId!);
      return reply.send(dashboard);
    },
  );

  app.get(
    "/usage",
    { config: { rateLimit: CRUD_RATE_LIMIT } },
    async (request, reply) => {
      const query = apiKeyUsageQuerySchema.parse(request.query);
      const usage = await usageService.getUsage(request.userId!, query);
      return reply.send(usage);
    },
  );
}