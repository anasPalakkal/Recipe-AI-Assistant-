import type { FastifyInstance } from "fastify";
import {
  createRecipeSchema,
  updateRecipeSchema,
  listRecipesQuerySchema,
  recipeIdParamSchema,
  generateRecipeSchema,
} from "@recipeai/shared";
import * as recipeService from "./recipe.service.js";
import { sessionRateLimitKey } from "../../lib/rate-limit.js";
import { requireVerifiedEmail } from "../auth/require-verified-email.js";

const CRUD_RATE_LIMIT = { max: 60, timeWindow: "1 minute", keyGenerator: sessionRateLimitKey };
const GENERATE_RATE_LIMIT = { max: 10, timeWindow: "1 hour", keyGenerator: sessionRateLimitKey };

export default async function recipeRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.post(
    "/",
    { preHandler: requireVerifiedEmail, config: { rateLimit: CRUD_RATE_LIMIT } },
    async (request, reply) => {
      const body = createRecipeSchema.parse(request.body);
      const recipe = await recipeService.createRecipe(request.userId!, body);
      return reply.status(201).send(recipe);
    },
  );

  app.post(
    "/generate",
    { preHandler: requireVerifiedEmail, config: { rateLimit: GENERATE_RATE_LIMIT } },
    async (request, reply) => {
      const { prompt } = generateRecipeSchema.parse(request.body);
      const draft = await recipeService.generateRecipeDraft(request.userId!, prompt, "internal");
      return reply.send(draft);
    },
  );

  app.post(
    "/generate/stream",
    { preHandler: requireVerifiedEmail, config: { rateLimit: GENERATE_RATE_LIMIT } },
    async (request, reply) => {
      const { prompt } = generateRecipeSchema.parse(request.body);
      const userId = request.userId!;

      const controller = new AbortController();
      request.raw.on("close", () => controller.abort());

      reply.hijack();
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      });

      const send = (event: string, data: unknown) => {
        reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      for await (const evt of recipeService.generateRecipeDraftStream(userId, prompt, "internal", controller.signal)) {
        if (evt.type === "chunk") {
          send("chunk", { text: evt.text });
        } else if (evt.type === "done") {
          send("done", evt.draft);
        } else if (evt.type === "refused") {
          send("refused", { message: evt.message, reasonCode: evt.reasonCode });
        } else {
          send("error", { message: evt.message });
        }
      }

      reply.raw.end();
    },
  );

  app.get(
    "/",
    { config: { rateLimit: CRUD_RATE_LIMIT } },
    async (request, reply) => {
      const query = listRecipesQuerySchema.parse(request.query);
      const result = await recipeService.listRecipes(request.userId!, query);
      return reply.send(result);
    },
  );

  app.get(
    "/:id",
    { config: { rateLimit: CRUD_RATE_LIMIT } },
    async (request, reply) => {
      const { id } = recipeIdParamSchema.parse(request.params);
      const recipe = await recipeService.getRecipeById(request.userId!, id);
      return reply.send(recipe);
    },
  );

  app.patch(
    "/:id",
    { preHandler: requireVerifiedEmail, config: { rateLimit: CRUD_RATE_LIMIT } },
    async (request, reply) => {
      const { id } = recipeIdParamSchema.parse(request.params);
      const body = updateRecipeSchema.parse(request.body);
      const recipe = await recipeService.updateRecipe(request.userId!, id, body);
      return reply.send(recipe);
    },
  );

  app.delete(
    "/:id",
    { preHandler: requireVerifiedEmail, config: { rateLimit: CRUD_RATE_LIMIT } },
    async (request, reply) => {
      const { id } = recipeIdParamSchema.parse(request.params);
      await recipeService.deleteRecipe(request.userId!, id);
      return reply.status(204).send();
    },
  );
}