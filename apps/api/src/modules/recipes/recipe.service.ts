import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { NotFoundError } from "../../lib/errors.js";
import type { CreateRecipeInput, UpdateRecipeInput, ListRecipesQuery } from "@recipeai/shared";

const recipeInclude = {
  ingredients: { orderBy: { order: "asc" } },
  steps: { orderBy: { order: "asc" } },
} satisfies Prisma.RecipeInclude;

export async function createRecipe(userId: string, input: CreateRecipeInput) {
  return prisma.recipe.create({
    data: {
      userId,
      title: input.title,
      description: input.description ?? null,
      servings: input.servings ?? null,
      prepTimeMinutes: input.prepTimeMinutes ?? null,
      cookTimeMinutes: input.cookTimeMinutes ?? null,
      ingredients: {
        create: input.ingredients.map((ingredient, order) => ({ ...ingredient, order })),
      },
      steps: {
        create: input.steps.map((step, order) => ({ ...step, order })),
      },
    },
    include: recipeInclude,
  });
}

export async function listRecipes(userId: string, query: ListRecipesQuery) {
  const recipes = await prisma.recipe.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
    include: recipeInclude,
  });

  const hasMore = recipes.length > query.limit;
  const items = hasMore ? recipes.slice(0, query.limit) : recipes;
  const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

  return { items, nextCursor };
}

export async function getRecipeById(userId: string, id: string) {
  const recipe = await prisma.recipe.findFirst({
    where: { id, userId },
    include: recipeInclude,
  });
  if (!recipe) throw new NotFoundError("Recipe not found");
  return recipe;
}

export async function updateRecipe(userId: string, id: string, input: UpdateRecipeInput) {
  const existing = await prisma.recipe.findFirst({ where: { id, userId } });
  if (!existing) throw new NotFoundError("Recipe not found");

  return prisma.$transaction(async (tx) => {
    if (input.ingredients) {
      await tx.ingredient.deleteMany({ where: { recipeId: id } });
    }
    if (input.steps) {
      await tx.instructionStep.deleteMany({ where: { recipeId: id } });
    }

    return tx.recipe.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.servings !== undefined && { servings: input.servings }),
        ...(input.prepTimeMinutes !== undefined && { prepTimeMinutes: input.prepTimeMinutes }),
        ...(input.cookTimeMinutes !== undefined && { cookTimeMinutes: input.cookTimeMinutes }),
        ...(input.ingredients && {
          ingredients: {
            create: input.ingredients.map((ingredient, order) => ({ ...ingredient, order })),
          },
        }),
        ...(input.steps && {
          steps: { create: input.steps.map((step, order) => ({ ...step, order })) },
        }),
      },
      include: recipeInclude,
    });
  });
}

export async function deleteRecipe(userId: string, id: string) {
  const existing = await prisma.recipe.findFirst({ where: { id, userId } });
  if (!existing) throw new NotFoundError("Recipe not found");
  await prisma.recipe.delete({ where: { id } });
}