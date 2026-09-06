import type { FastifyInstance } from "fastify";
import {
  createRecipeSchema,
  updateRecipeSchema,
  listRecipesQuerySchema,
  recipeIdParamSchema,
} from "@recipeai/shared";
import * as recipeService from "./recipe.service.js";

export default async function recipeRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.post("/", async (request, reply) => {
    const body = createRecipeSchema.parse(request.body);
    const recipe = await recipeService.createRecipe(request.userId!, body);
    return reply.status(201).send(recipe);
  });

  app.get("/", async (request, reply) => {
    const query = listRecipesQuerySchema.parse(request.query);
    const result = await recipeService.listRecipes(request.userId!, query);
    return reply.send(result);
  });

  app.get("/:id", async (request, reply) => {
    const { id } = recipeIdParamSchema.parse(request.params);
    const recipe = await recipeService.getRecipeById(request.userId!, id);
    return reply.send(recipe);
  });

  app.patch("/:id", async (request, reply) => {
    const { id } = recipeIdParamSchema.parse(request.params);
    const body = updateRecipeSchema.parse(request.body);
    const recipe = await recipeService.updateRecipe(request.userId!, id, body);
    return reply.send(recipe);
  });

  app.delete("/:id", async (request, reply) => {
    const { id } = recipeIdParamSchema.parse(request.params);
    await recipeService.deleteRecipe(request.userId!, id);
    return reply.status(204).send();
  });
}