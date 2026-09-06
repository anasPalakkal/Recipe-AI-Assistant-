import type { FastifyInstance } from "fastify";
import {
  createRecipeSchema,
  updateRecipeSchema,
  listRecipesQuerySchema,
  recipeIdParamSchema,
} from "@recipeai/shared";
import * as recipeService from "./recipe.service.js";
import { sessionRateLimitKey } from "../../lib/rate-limit.js";

const CRUD_RATE_LIMIT = { max: 60, timeWindow: "1 minute", keyGenerator: sessionRateLimitKey };

export default async function recipeRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.post(
    "/",
    { config: { rateLimit: CRUD_RATE_LIMIT } },
    async (request, reply) => {
      const body = createRecipeSchema.parse(request.body);
      const recipe = await recipeService.createRecipe(request.userId!, body);
      return reply.status(201).send(recipe);
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
    { config: { rateLimit: CRUD_RATE_LIMIT } },
    async (request, reply) => {
      const { id } = recipeIdParamSchema.parse(request.params);
      const body = updateRecipeSchema.parse(request.body);
      const recipe = await recipeService.updateRecipe(request.userId!, id, body);
      return reply.send(recipe);
    },
  );

  app.delete(
    "/:id",
    { config: { rateLimit: CRUD_RATE_LIMIT } },
    async (request, reply) => {
      const { id } = recipeIdParamSchema.parse(request.params);
      await recipeService.deleteRecipe(request.userId!, id);
      return reply.status(204).send();
    },
  );
}